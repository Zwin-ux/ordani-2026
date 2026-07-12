package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/ordani/tinyme-backend/internal/analytics"
	"github.com/ordani/tinyme-backend/internal/services"
)

type RedirectHandler struct {
	redirect  *services.RedirectService
	analytics *analytics.AnalyticsService
}

func NewRedirectHandler(r *services.RedirectService, a *analytics.AnalyticsService) *RedirectHandler {
	return &RedirectHandler{redirect: r, analytics: a}
}

// GET /:slug — the fast redirect path
func (h *RedirectHandler) Resolve(c *fiber.Ctx) error {
	slug := c.Params("slug")
	domain := c.Hostname()

	// Extract device type from user agent
	ua := c.Get("User-Agent")
	deviceType := classifyDevice(ua)

	// Extract country from headers (set by Cloudflare/Fly.io proxy)
	country := c.Get("CF-IPCountry")
	if country == "" {
		country = c.Get("X-Country-Code")
	}

	// Build resolve context
	rctx := services.ResolveContext{
		Country:  strings.ToUpper(country),
		Device:   deviceType,
		Referrer: c.Get("Referer"),
		Hour:     time.Now().UTC().Hour(),
	}

	start := time.Now()
	destURL, destID, err := h.redirect.Resolve(c.Context(), slug, domain, rctx)
	latencyMs := int(time.Since(start).Milliseconds())

	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(404).SendFile("./public/404.html")
		}
		if strings.Contains(err.Error(), "expired") {
			return c.Status(410).JSON(fiber.Map{"error": "link expired"})
		}
		if strings.Contains(err.Error(), "click limit") {
			return c.Status(410).JSON(fiber.Map{"error": "click limit reached"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "internal error"})
	}

	// Record analytics asynchronously
	go h.analytics.RecordEvent(
		c.Context(),
		"", // linkID — we'd need to return this from Resolve, or do a second lookup
		destID,
		c.IP(),
		ua,
		c.Get("Referer"),
		country,
		deviceType,
		latencyMs,
	)

	return c.Redirect(destURL, fiber.StatusMovedPermanently)
}

func classifyDevice(ua string) string {
	ua = strings.ToLower(ua)
	mobile := []string{"mobile", "android", "iphone", "ipad", "windows phone", "blackberry", "opera mini", "opera mobi"}
	for _, m := range mobile {
		if strings.Contains(ua, m) {
			if strings.Contains(ua, "ipad") || strings.Contains(ua, "tablet") {
				return "tablet"
			}
			return "mobile"
		}
	}
	return "desktop"
}
