package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/ordani/tinyme-backend/internal/models"
	"github.com/ordani/tinyme-backend/internal/services"
)

type LinkHandler struct {
	links *services.LinkService
}

func NewLinkHandler(links *services.LinkService) *LinkHandler {
	return &LinkHandler{links: links}
}

// POST /api/links
func (h *LinkHandler) Create(c *fiber.Ctx) error {
	var req models.CreateLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Destination == "" {
		return c.Status(400).JSON(fiber.Map{"error": "destination is required"})
	}

	resp, err := h.links.Create(c.Context(), req)
	if err != nil {
		return c.Status(409).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(resp)
}

// GET /api/links
func (h *LinkHandler) List(c *fiber.Ctx) error {
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit > 200 {
		limit = 200
	}

	links, err := h.links.List(c.Context(), offset, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to list links"})
	}

	return c.JSON(fiber.Map{"links": links, "offset": offset, "limit": limit})
}

// GET /api/links/:id
func (h *LinkHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")
	resp, err := h.links.Get(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "link not found"})
	}
	return c.JSON(resp)
}

// PATCH /api/links/:id
func (h *LinkHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.UpdateLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	link, err := h.links.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(link)
}

// DELETE /api/links/:id
func (h *LinkHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.links.Delete(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}

// POST /api/links/:id/destinations
func (h *LinkHandler) AddDestination(c *fiber.Ctx) error {
	linkID := c.Params("id")
	var req models.CreateDestinationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.URL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "url is required"})
	}

	dest, err := h.links.AddDestination(c.Context(), linkID, req.URL)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(dest)
}

// PATCH /api/links/:id/destinations/:destId
func (h *LinkHandler) UpdateDestination(c *fiber.Ctx) error {
	destID := c.Params("destId")
	var req models.UpdateDestinationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	dest, err := h.links.UpdateDestination(c.Context(), destID, req.URL, req.IsPrimary, req.Weight)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(dest)
}

// POST /api/links/:id/destinations/:destId/rollback
func (h *LinkHandler) RollbackDestination(c *fiber.Ctx) error {
	destID := c.Params("destId")
	dest, err := h.links.RollbackDestination(c.Context(), destID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(dest)
}

// GET /api/links/:id/destinations/:destId/history
func (h *LinkHandler) DestinationHistory(c *fiber.Ctx) error {
	destID := c.Params("destId")
	history, err := h.links.DestinationHistory(c.Context(), destID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"history": history})
}

// POST /api/links/:id/rules
func (h *LinkHandler) AddRule(c *fiber.Ctx) error {
	linkID := c.Params("id")
	var req models.CreateRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Type == "" || req.Condition == "" || req.DestinationID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "type, condition, and destination_id are required"})
	}

	rule, err := h.links.AddRule(c.Context(), req, linkID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(rule)
}

// DELETE /api/links/:id/rules/:ruleId
func (h *LinkHandler) DeleteRule(c *fiber.Ctx) error {
	ruleID := c.Params("ruleId")
	if err := h.links.DeleteRule(c.Context(), ruleID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}
