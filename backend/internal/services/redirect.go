package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RedirectService resolves a short link to the correct destination URL
// by applying routing rules in priority order.
type RedirectService struct {
	db *pgxpool.Pool
}

// routingRule is an internal type for rule evaluation.
type routingRule struct {
	ID            string
	Type          string
	Condition     string
	DestinationID string
	Priority      int
}

func NewRedirectService(db *pgxpool.Pool) *RedirectService {
	return &RedirectService{db: db}
}

// ResolveContext holds the request context needed for rule evaluation.
type ResolveContext struct {
	Country  string // ISO 3166-1 alpha-2
	Device   string // mobile, desktop, tablet
	Referrer string // HTTP referrer
	Hour     int    // 0-23 UTC for schedule rules
}

// Resolve finds the destination URL for a given slug+domain.
// Returns the destination URL and ID, or an error.
func (s *RedirectService) Resolve(ctx context.Context, slug, domain string, rctx ResolveContext) (destURL, destID string, err error) {
	// Fetch link
	var linkID, passwordHash string
	var expiresAt *time.Time
	var clickLimit *int
	var clickCount int

	err = s.db.QueryRow(ctx,
		`SELECT id, password_hash, expires_at, click_limit, click_count
		 FROM links WHERE slug = $1 AND domain = $2 AND is_active = true`, slug, domain,
	).Scan(&linkID, &passwordHash, &expiresAt, &clickLimit, &clickCount)
	if err != nil {
		return "", "", fmt.Errorf("link not found")
	}

	// Check expiry
	if expiresAt != nil && expiresAt.Before(time.Now()) {
		return "", "", fmt.Errorf("link expired")
	}

	// Check click limit
	if clickLimit != nil && clickCount >= *clickLimit {
		return "", "", fmt.Errorf("click limit reached")
	}

	// Fetch active routing rules (ordered by priority)
	ruleRows, err := s.db.Query(ctx,
		`SELECT id, type, condition, destination_id, priority
		 FROM routing_rules WHERE link_id = $1 AND is_active = true
		 ORDER BY priority ASC`, linkID,
	)
	if err != nil {
		return "", "", fmt.Errorf("fetch rules: %w", err)
	}
	defer ruleRows.Close()

	var rules []routingRule
	for ruleRows.Next() {
		r := routingRule{}
		if err := ruleRows.Scan(&r.ID, &r.Type, &r.Condition, &r.DestinationID, &r.Priority); err != nil {
			return "", "", err
		}
		rules = append(rules, r)
	}

	// Evaluate rules in priority order
	var fallbackDestID string
	destMap := make(map[string]string) // destination_id -> URL (lazy-loaded)

	for _, r := range rules {
		if s.matchRule(r, rctx) {
			destID = r.DestinationID
			break
		}
		// Track the lowest-priority (fallback) destination
		if fallbackDestID == "" {
			fallbackDestID = r.DestinationID
		}
	}

	// If no rule matched, use the primary destination
	if destID == "" {
		err = s.db.QueryRow(ctx,
			`SELECT id, url FROM destinations
			 WHERE link_id = $1 AND is_active = true AND is_primary = true
			 LIMIT 1`, linkID,
		).Scan(&destID, &destURL)
		if err != nil {
			// Fallback: use first active destination
			err = s.db.QueryRow(ctx,
				`SELECT id, url FROM destinations
				 WHERE link_id = $1 AND is_active = true
				 ORDER BY created_at ASC LIMIT 1`, linkID,
			).Scan(&destID, &destURL)
			if err != nil {
				return "", "", fmt.Errorf("no active destinations")
			}
		}
		return destURL, destID, nil
	}

	// Resolve the rule's destination URL
	if url, ok := destMap[destID]; ok {
		return url, destID, nil
	}

	err = s.db.QueryRow(ctx,
		"SELECT url FROM destinations WHERE id = $1 AND is_active = true", destID,
	).Scan(&destURL)
	if err != nil {
		return "", "", fmt.Errorf("destination not found")
	}

	return destURL, destID, nil
}

// matchRule checks if a routing rule matches the current request context.
func (s *RedirectService) matchRule(r routingRule, rctx ResolveContext) bool {
	var cond map[string]interface{}
	if err := json.Unmarshal([]byte(r.Condition), &cond); err != nil {
		return false
	}

	switch r.Type {
	case "country":
		countries, ok := cond["countries"].([]interface{})
		if !ok {
			return false
		}
		for _, c := range countries {
			if strings.EqualFold(c.(string), rctx.Country) {
				return true
			}
		}
		return false

	case "device":
		devices, ok := cond["devices"].([]interface{})
		if !ok {
			return false
		}
		for _, d := range devices {
			if strings.EqualFold(d.(string), rctx.Device) {
				return true
			}
		}
		return false

	case "referrer":
		referrers, ok := cond["referrers"].([]interface{})
		if !ok {
			return false
		}
		refLower := strings.ToLower(rctx.Referrer)
		for _, ref := range referrers {
			if strings.Contains(refLower, strings.ToLower(ref.(string))) {
				return true
			}
		}
		return false

	case "schedule":
		hours, ok := cond["hours"].([]interface{})
		if !ok {
			return false
		}
		for _, h := range hours {
			if int(h.(float64)) == rctx.Hour {
				return true
			}
		}
		return false

	default:
		return false
	}
}
