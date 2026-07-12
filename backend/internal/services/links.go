package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ordani/tinyme-backend/internal/models"
)

type LinkService struct {
	db *pgxpool.Pool
}

func NewLinkService(db *pgxpool.Pool) *LinkService {
	return &LinkService{db: db}
}

// Create creates a new link with a primary destination.
func (s *LinkService) Create(ctx context.Context, req models.CreateLinkRequest) (*models.LinkResponse, error) {
	slug := sanitizeSlug(req.Slug)
	if slug == "" {
		slug = generateSlug()
	}
	domain := req.Domain
	if domain == "" {
		domain = "tinyme.cc"
	}

	// Check slug uniqueness
	var exists bool
	err := s.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM links WHERE slug = $1 AND domain = $2)",
		slug, domain,
	).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("check slug uniqueness: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("slug already taken: %s", slug)
	}

	// Create link
	link := &models.Link{}
	err = s.db.QueryRow(ctx,
		`INSERT INTO links (slug, domain, expires_at, click_limit)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, slug, domain, click_count, is_active, created_at, updated_at`,
		slug, domain, parseOptionalTime(req.ExpiresAt), req.ClickLimit,
	).Scan(&link.ID, &link.Slug, &link.Domain, &link.ClickCount, &link.IsActive, &link.CreatedAt, &link.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert link: %w", err)
	}

	// Create primary destination
	dest := &models.Destination{}
	err = s.db.QueryRow(ctx,
		`INSERT INTO destinations (link_id, url, is_primary)
		 VALUES ($1, $2, true)
		 RETURNING id, link_id, url, is_primary, weight, is_active, created_at`,
		link.ID, req.Destination,
	).Scan(&dest.ID, &dest.LinkID, &dest.URL, &dest.IsPrimary, &dest.Weight, &dest.IsActive, &dest.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert destination: %w", err)
	}

	return &models.LinkResponse{
		Link:         link,
		Destinations: []*models.Destination{dest},
		Rules:        []*models.RoutingRule{},
	}, nil
}

// Get retrieves a link with its destinations and rules.
func (s *LinkService) Get(ctx context.Context, id string) (*models.LinkResponse, error) {
	link := &models.Link{}
	err := s.db.QueryRow(ctx,
		`SELECT id, slug, domain, expires_at, click_limit, click_count, is_active, created_at, updated_at
		 FROM links WHERE id = $1`, id,
	).Scan(&link.ID, &link.Slug, &link.Domain, &link.ExpiresAt, &link.ClickLimit, &link.ClickCount, &link.IsActive, &link.CreatedAt, &link.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get link: %w", err)
	}

	dests, err := s.listDestinations(ctx, link.ID)
	if err != nil {
		return nil, err
	}

	rules, err := s.listRules(ctx, link.ID)
	if err != nil {
		return nil, err
	}

	return &models.LinkResponse{Link: link, Destinations: dests, Rules: rules}, nil
}

// GetBySlug retrieves a link by slug and domain (for redirect resolution).
func (s *LinkService) GetBySlug(ctx context.Context, slug, domain string) (*models.LinkResponse, error) {
	link := &models.Link{}
	err := s.db.QueryRow(ctx,
		`SELECT id, slug, domain, password_hash, expires_at, click_limit, click_count, is_active, created_at, updated_at
		 FROM links WHERE slug = $1 AND domain = $2 AND is_active = true`, slug, domain,
	).Scan(&link.ID, &link.Slug, &link.Domain, &link.PasswordHash, &link.ExpiresAt, &link.ClickLimit, &link.ClickCount, &link.IsActive, &link.CreatedAt, &link.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get link by slug: %w", err)
	}

	// Check expiry
	if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("link expired")
	}

	// Check click limit
	if link.ClickLimit != nil && link.ClickCount >= *link.ClickLimit {
		return nil, fmt.Errorf("click limit reached")
	}

	dests, err := s.listActiveDestinations(ctx, link.ID)
	if err != nil {
		return nil, err
	}

	rules, err := s.listActiveRules(ctx, link.ID)
	if err != nil {
		return nil, err
	}

	return &models.LinkResponse{Link: link, Destinations: dests, Rules: rules}, nil
}

// List returns all links with pagination.
func (s *LinkService) List(ctx context.Context, offset, limit int) ([]*models.Link, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, slug, domain, expires_at, click_limit, click_count, is_active, created_at, updated_at
		 FROM links ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list links: %w", err)
	}
	defer rows.Close()

	var links []*models.Link
	for rows.Next() {
		l := &models.Link{}
		if err := rows.Scan(&l.ID, &l.Slug, &l.Domain, &l.ExpiresAt, &l.ClickLimit, &l.ClickCount, &l.IsActive, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan link: %w", err)
		}
		links = append(links, l)
	}
	return links, nil
}

// Update modifies link settings.
func (s *LinkService) Update(ctx context.Context, id string, req models.UpdateLinkRequest) (*models.Link, error) {
	link := &models.Link{}
	err := s.db.QueryRow(ctx,
		`UPDATE links SET
			is_active = COALESCE($2, is_active),
			expires_at = COALESCE($3, expires_at),
			click_limit = COALESCE($4, click_limit),
			updated_at = now()
		 WHERE id = $1
		 RETURNING id, slug, domain, expires_at, click_limit, click_count, is_active, created_at, updated_at`,
		id, req.IsActive, parseOptionalTime(req.ExpiresAt), req.ClickLimit,
	).Scan(&link.ID, &link.Slug, &link.Domain, &link.ExpiresAt, &link.ClickLimit, &link.ClickCount, &link.IsActive, &link.CreatedAt, &link.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update link: %w", err)
	}
	return link, nil
}

// Delete soft-deletes a link.
func (s *LinkService) Delete(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, "UPDATE links SET is_active = false, updated_at = now() WHERE id = $1", id)
	return err
}

// --- Destination management ---

func (s *LinkService) AddDestination(ctx context.Context, linkID, url string) (*models.Destination, error) {
	// If this is the first destination, mark as primary
	var count int
	s.db.QueryRow(ctx, "SELECT COUNT(*) FROM destinations WHERE link_id = $1", linkID).Scan(&count)

	dest := &models.Destination{}
	err := s.db.QueryRow(ctx,
		`INSERT INTO destinations (link_id, url, is_primary)
		 VALUES ($1, $2, $3)
		 RETURNING id, link_id, url, is_primary, weight, is_active, created_at`,
		linkID, url, count == 0,
	).Scan(&dest.ID, &dest.LinkID, &dest.URL, &dest.IsPrimary, &dest.Weight, &dest.IsActive, &dest.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert destination: %w", err)
	}
	return dest, nil
}

func (s *LinkService) UpdateDestination(ctx context.Context, destID, newURL string, isPrimary *bool, weight *int) (*models.Destination, error) {
	// Record history
	var oldURL string
	s.db.QueryRow(ctx, "SELECT url FROM destinations WHERE id = $1", destID).Scan(&oldURL)
	if oldURL != "" && oldURL != newURL {
		s.db.Exec(ctx,
			"INSERT INTO destination_history (destination_id, old_url, new_url) VALUES ($1, $2, $3)",
			destID, oldURL, newURL,
		)
	}

	dest := &models.Destination{}
	err := s.db.QueryRow(ctx,
		`UPDATE destinations SET
			url = COALESCE(NULLIF($2, ''), url),
			is_primary = COALESCE($3, is_primary),
			weight = COALESCE($4, weight)
		 WHERE id = $1
		 RETURNING id, link_id, url, is_primary, weight, is_active, created_at`,
		destID, newURL, isPrimary, weight,
	).Scan(&dest.ID, &dest.LinkID, &dest.URL, &dest.IsPrimary, &dest.Weight, &dest.IsActive, &dest.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("update destination: %w", err)
	}
	return dest, nil
}

func (s *LinkService) RollbackDestination(ctx context.Context, destID string) (*models.Destination, error) {
	var historyID, oldURL string
	err := s.db.QueryRow(ctx,
		`SELECT id, old_url FROM destination_history
		 WHERE destination_id = $1 ORDER BY changed_at DESC LIMIT 1`, destID,
	).Scan(&historyID, &oldURL)
	if err != nil {
		return nil, fmt.Errorf("no history to rollback: %w", err)
	}

	return s.UpdateDestination(ctx, destID, oldURL, nil, nil)
}

func (s *LinkService) DestinationHistory(ctx context.Context, destID string) ([]*models.DestinationHistory, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, destination_id, old_url, new_url, changed_at
		 FROM destination_history WHERE destination_id = $1 ORDER BY changed_at DESC`, destID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []*models.DestinationHistory
	for rows.Next() {
		h := &models.DestinationHistory{}
		if err := rows.Scan(&h.ID, &h.DestinationID, &h.OldURL, &h.NewURL, &h.ChangedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, nil
}

// --- Routing rules ---

func (s *LinkService) AddRule(ctx context.Context, req models.CreateRuleRequest, linkID string) (*models.RoutingRule, error) {
	rule := &models.RoutingRule{}
	err := s.db.QueryRow(ctx,
		`INSERT INTO routing_rules (link_id, type, condition, destination_id, priority)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, link_id, type, condition, destination_id, priority, is_active, created_at`,
		linkID, req.Type, req.Condition, req.DestinationID, req.Priority,
	).Scan(&rule.ID, &rule.LinkID, &rule.Type, &rule.Condition, &rule.DestinationID, &rule.Priority, &rule.IsActive, &rule.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert rule: %w", err)
	}
	return rule, nil
}

func (s *LinkService) DeleteRule(ctx context.Context, ruleID string) error {
	_, err := s.db.Exec(ctx, "DELETE FROM routing_rules WHERE id = $1", ruleID)
	return err
}

func (s *LinkService) listDestinations(ctx context.Context, linkID string) ([]*models.Destination, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, link_id, url, is_primary, weight, is_active, created_at
		 FROM destinations WHERE link_id = $1 ORDER BY is_primary DESC, created_at ASC`, linkID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dests []*models.Destination
	for rows.Next() {
		d := &models.Destination{}
		if err := rows.Scan(&d.ID, &d.LinkID, &d.URL, &d.IsPrimary, &d.Weight, &d.IsActive, &d.CreatedAt); err != nil {
			return nil, err
		}
		dests = append(dests, d)
	}
	return dests, nil
}

func (s *LinkService) listActiveDestinations(ctx context.Context, linkID string) ([]*models.Destination, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, link_id, url, is_primary, weight, is_active, created_at
		 FROM destinations WHERE link_id = $1 AND is_active = true ORDER BY is_primary DESC, created_at ASC`, linkID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dests []*models.Destination
	for rows.Next() {
		d := &models.Destination{}
		if err := rows.Scan(&d.ID, &d.LinkID, &d.URL, &d.IsPrimary, &d.Weight, &d.IsActive, &d.CreatedAt); err != nil {
			return nil, err
		}
		dests = append(dests, d)
	}
	return dests, nil
}

func (s *LinkService) listRules(ctx context.Context, linkID string) ([]*models.RoutingRule, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, link_id, type, condition, destination_id, priority, is_active, created_at
		 FROM routing_rules WHERE link_id = $1 ORDER BY priority ASC`, linkID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*models.RoutingRule
	for rows.Next() {
		r := &models.RoutingRule{}
		if err := rows.Scan(&r.ID, &r.LinkID, &r.Type, &r.Condition, &r.DestinationID, &r.Priority, &r.IsActive, &r.CreatedAt); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	return rules, nil
}

func (s *LinkService) listActiveRules(ctx context.Context, linkID string) ([]*models.RoutingRule, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, link_id, type, condition, destination_id, priority, is_active, created_at
		 FROM routing_rules WHERE link_id = $1 AND is_active = true ORDER BY priority ASC`, linkID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*models.RoutingRule
	for rows.Next() {
		r := &models.RoutingRule{}
		if err := rows.Scan(&r.ID, &r.LinkID, &r.Type, &r.Condition, &r.DestinationID, &r.Priority, &r.IsActive, &r.CreatedAt); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	return rules, nil
}

// --- Helpers ---

func sanitizeSlug(s string) string {
	s = strings.ToLower(s)
	s = strings.TrimSpace(s)
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, s)
	// Collapse multiple dashes
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	s = strings.Trim(s, "-")
	if len(s) > 64 {
		s = s[:64]
	}
	return s
}

func generateSlug() string {
	b := make([]byte, 6)
	for i := range b {
		b[i] = "abcdefghijklmnopqrstuvwxyz0123456789"[time.Now().UnixNano()%36]
		time.Sleep(1 * time.Nanosecond)
	}
	h := sha256.Sum256(append(b, []byte(fmt.Sprintf("%d", time.Now().UnixNano()))...))
	return hex.EncodeToString(h[:])[:8]
}

func parseOptionalTime(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return nil
	}
	return &t
}
