package analytics

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ordani/tinyme-backend/internal/models"
)

type AnalyticsService struct {
	db *pgxpool.Pool
}

func NewAnalyticsService(db *pgxpool.Pool) *AnalyticsService {
	return &AnalyticsService{db: db}
}

// RecordEvent inserts a click event. Called asynchronously after redirect.
func (s *AnalyticsService) RecordEvent(ctx context.Context, linkID, destinationID, ip, userAgent, referrer, country, deviceType string, latencyMs int) {
	isBot := detectBot(userAgent)
	ipHash := hashIP(ip)

	_, err := s.db.Exec(ctx,
		`INSERT INTO events (link_id, destination_id, ip_hash, user_agent, referrer, country, device_type, is_bot, latency_ms)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		linkID, destinationID, ipHash, userAgent, referrer, country, deviceType, isBot, latencyMs,
	)
	if err != nil {
		// Log but don't fail the redirect
		fmt.Printf("analytics: failed to record event: %v\n", err)
	}
}

// Summary returns analytics for a link within an optional time range.
func (s *AnalyticsService) Summary(ctx context.Context, linkID string, days int) (*models.AnalyticsSummary, error) {
	summary := &models.AnalyticsSummary{}

	// Total clicks
	s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM events WHERE link_id = $1`, linkID,
	).Scan(&summary.TotalClicks)

	// Human vs bot
	s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM events WHERE link_id = $1 AND is_bot = false`, linkID,
	).Scan(&summary.HumanClicks)
	summary.BotClicks = summary.TotalClicks - summary.HumanClicks

	// Top countries
	rows, err := s.db.Query(ctx,
		`SELECT country, COUNT(*) as cnt FROM events
		 WHERE link_id = $1 AND country != ''
		 GROUP BY country ORDER BY cnt DESC LIMIT 10`, linkID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c models.CountryStat
			if rows.Scan(&c.Country, &c.Count) == nil {
				summary.TopCountries = append(summary.TopCountries, c)
			}
		}
	}

	// Top devices
	rows2, err := s.db.Query(ctx,
		`SELECT device_type, COUNT(*) as cnt FROM events
		 WHERE link_id = $1
		 GROUP BY device_type ORDER BY cnt DESC LIMIT 10`, linkID,
	)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var d models.DeviceStat
			if rows2.Scan(&d.Device, &d.Count) == nil {
				summary.TopDevices = append(summary.TopDevices, d)
			}
		}
	}

	// Top referrers
	rows3, err := s.db.Query(ctx,
		`SELECT referrer, COUNT(*) as cnt FROM events
		 WHERE link_id = $1 AND referrer != '' AND is_bot = false
		 GROUP BY referrer ORDER BY cnt DESC LIMIT 10`, linkID,
	)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var r models.ReferrerStat
			if rows3.Scan(&r.Referrer, &r.Count) == nil {
				summary.TopReferrers = append(summary.TopReferrers, r)
			}
		}
	}

	// Clicks by day (last N days)
	if days <= 0 {
		days = 30
	}
	rows4, err := s.db.Query(ctx,
		`SELECT date_trunc('day', timestamp)::date as day, COUNT(*) as cnt
		 FROM events WHERE link_id = $1 AND timestamp > now() - interval '1 day' * $2
		 GROUP BY day ORDER BY day ASC`, linkID, days,
	)
	if err == nil {
		defer rows4.Close()
		for rows4.Next() {
			var d models.DayStat
			if rows4.Scan(&d.Date, &d.Count) == nil {
				summary.ClicksByDay = append(summary.ClicksByDay, d)
			}
		}
	}

	return summary, nil
}

// Events returns raw events for a link with pagination.
func (s *AnalyticsService) Events(ctx context.Context, linkID string, offset, limit int) ([]*models.Event, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, link_id, destination_id, timestamp, ip_hash, user_agent, referrer, country, device_type, is_bot, latency_ms
		 FROM events WHERE link_id = $1
		 ORDER BY timestamp DESC LIMIT $2 OFFSET $3`, linkID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*models.Event
	for rows.Next() {
		e := &models.Event{}
		if err := rows.Scan(&e.ID, &e.LinkID, &e.DestinationID, &e.Timestamp, &e.IPHash, &e.UserAgent, &e.Referrer, &e.Country, &e.DeviceType, &e.IsBot, &e.LatencyMs); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

func hashIP(ip string) string {
	h := sha256.Sum256([]byte("tinyme-salt:" + ip))
	return hex.EncodeToString(h[:])
}

func detectBot(ua string) bool {
	ua = strings.ToLower(ua)
	bots := []string{
		"googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider",
		"yandexbot", "sogou", "exabot", "facebot", "facebookexternalhit",
		"ia_archiver", "linkedinbot", "embedly", "quora link preview",
		"showyoubot", "outbrain", "pinterest", "slackbot", "vkShare",
		"W3C_Validator", "whatsapp", "flipboard", "tumblr", "bitlybot",
		"skypeuripreview", "nuzzel", "discordbot", "qwantify", "pinterestbot",
		"bitrix link preview", "xing-contenttabreceiver", "chrome-lighthouse",
		"telegrambot", "seznambot", "crawler", "spider", "scraper",
	}
	for _, bot := range bots {
		if strings.Contains(ua, bot) {
			return true
		}
	}
	return false
}
