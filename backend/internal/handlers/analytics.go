package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/ordani/tinyme-backend/internal/analytics"
)

type AnalyticsHandler struct {
	analytics *analytics.AnalyticsService
}

func NewAnalyticsHandler(a *analytics.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analytics: a}
}

// GET /api/links/:id/analytics
func (h *AnalyticsHandler) Summary(c *fiber.Ctx) error {
	linkID := c.Params("id")
	days, _ := strconv.Atoi(c.Query("days", "30"))

	summary, err := h.analytics.Summary(c.Context(), linkID, days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to get analytics"})
	}
	return c.JSON(summary)
}

// GET /api/links/:id/events
func (h *AnalyticsHandler) Events(c *fiber.Ctx) error {
	linkID := c.Params("id")
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	if limit > 500 {
		limit = 500
	}

	events, err := h.analytics.Events(c.Context(), linkID, offset, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to get events"})
	}
	return c.JSON(fiber.Map{"events": events, "offset": offset, "limit": limit})
}
