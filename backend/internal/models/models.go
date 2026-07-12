package models

import (
	"time"
)

// Link is the core entity — a short URL pointing to one or more destinations.
type Link struct {
	ID          string     `json:"id" db:"id"`
	Slug        string     `json:"slug" db:"slug"`
	Domain      string     `json:"domain" db:"domain"`
	PasswordHash *string   `json:"-" db:"password_hash"`
	ExpiresAt   *time.Time `json:"expires_at" db:"expires_at"`
	ClickLimit  *int       `json:"click_limit" db:"click_limit"`
	ClickCount  int        `json:"click_count" db:"click_count"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// Destination is where a link points to. A link has one or more destinations.
type Destination struct {
	ID        string    `json:"id" db:"id"`
	LinkID    string    `json:"link_id" db:"link_id"`
	URL       string    `json:"url" db:"url"`
	IsPrimary bool      `json:"is_primary" db:"is_primary"`
	Weight    int       `json:"weight" db:"weight"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// DestinationHistory tracks every change to a destination URL.
type DestinationHistory struct {
	ID            string    `json:"id" db:"id"`
	DestinationID string    `json:"destination_id" db:"destination_id"`
	OldURL        string    `json:"old_url" db:"old_url"`
	NewURL        string    `json:"new_url" db:"new_url"`
	ChangedAt     time.Time `json:"changed_at" db:"changed_at"`
}

// RoutingRule determines which destination gets the click.
type RoutingRule struct {
	ID            string    `json:"id" db:"id"`
	LinkID        string    `json:"link_id" db:"link_id"`
	Type          string    `json:"type" db:"type"` // country, device, schedule, referrer
	Condition     string    `json:"condition" db:"condition"` // JSON: {"countries":["US","CA"]} or {"devices":["mobile"]}
	DestinationID string    `json:"destination_id" db:"destination_id"`
	Priority      int       `json:"priority" db:"priority"` // lower = higher priority
	IsActive      bool      `json:"is_active" db:"is_active"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// Event records every redirect click.
type Event struct {
	ID            string    `json:"id" db:"id"`
	LinkID        string    `json:"link_id" db:"link_id"`
	DestinationID string    `json:"destination_id" db:"destination_id"`
	Timestamp     time.Time `json:"timestamp" db:"timestamp"`
	IPHash        string    `json:"ip_hash" db:"ip_hash"`
	UserAgent     string    `json:"user_agent" db:"user_agent"`
	Referrer      string    `json:"referrer" db:"referrer"`
	Country       string    `json:"country" db:"country"`
	DeviceType    string    `json:"device_type" db:"device_type"` // mobile, desktop, tablet, bot
	IsBot         bool      `json:"is_bot" db:"is_bot"`
	LatencyMs     int       `json:"latency_ms" db:"latency_ms"`
}

// --- API Request/Response types ---

type CreateLinkRequest struct {
	Slug        string `json:"slug"`
	Domain      string `json:"domain"`
	Destination string `json:"destination"`
	Password    string `json:"password"`
	ExpiresAt   string `json:"expires_at"`
	ClickLimit  *int   `json:"click_limit"`
}

type UpdateLinkRequest struct {
	IsActive    *bool  `json:"is_active"`
	Password    string `json:"password"`
	ExpiresAt   string `json:"expires_at"`
	ClickLimit  *int   `json:"click_limit"`
}

type CreateDestinationRequest struct {
	URL string `json:"url"`
}

type UpdateDestinationRequest struct {
	URL       string `json:"url"`
	IsPrimary *bool  `json:"is_primary"`
	Weight    *int   `json:"weight"`
}

type CreateRuleRequest struct {
	Type          string `json:"type"`
	Condition     string `json:"condition"`
	DestinationID string `json:"destination_id"`
	Priority      int    `json:"priority"`
}

type LinkResponse struct {
	Link         *Link         `json:"link"`
	Destinations []*Destination `json:"destinations"`
	Rules        []*RoutingRule `json:"rules"`
}

type AnalyticsSummary struct {
	TotalClicks   int              `json:"total_clicks"`
	HumanClicks   int              `json:"human_clicks"`
	BotClicks     int              `json:"bot_clicks"`
	TopCountries  []CountryStat    `json:"top_countries"`
	TopDevices    []DeviceStat     `json:"top_devices"`
	TopReferrers  []ReferrerStat   `json:"top_referrers"`
	ClicksByDay   []DayStat        `json:"clicks_by_day"`
}

type CountryStat struct {
	Country string `json:"country"`
	Count   int    `json:"count"`
}

type DeviceStat struct {
	Device string `json:"device"`
	Count  int    `json:"count"`
}

type ReferrerStat struct {
	Referrer string `json:"referrer"`
	Count    int    `json:"count"`
}

type DayStat struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}
