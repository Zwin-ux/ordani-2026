package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// APIKeyAuth validates the API key from the Authorization header.
// Format: "Bearer <api-key>"
func APIKeyAuth(apiKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if apiKey == "" {
			// No API key configured — skip auth (dev mode)
			return c.Next()
		}

		auth := c.Get("Authorization")
		if auth == "" {
			return c.Status(401).JSON(fiber.Map{"error": "missing authorization header"})
		}

		parts := strings.SplitN(auth, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(401).JSON(fiber.Map{"error": "invalid authorization format, expected: Bearer <key>"})
		}

		if parts[1] != apiKey {
			return c.Status(403).JSON(fiber.Map{"error": "invalid api key"})
		}

		return c.Next()
	}
}

// CORS adds permissive CORS headers for the API.
func CORS() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Set("Access-Control-Max-Age", "86400")

		if c.Method() == "OPTIONS" {
			return c.SendStatus(204)
		}

		return c.Next()
	}
}

// RequestID adds a unique request ID header.
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Get("X-Request-ID")
		if id == "" {
			id = generateID()
		}
		c.Set("X-Request-ID", id)
		return c.Next()
	}
}

func generateID() string {
	b := make([]byte, 16)
	for i := range b {
		b[i] = "0123456789abcdef"[time.Now().UnixNano()%16]
	}
	return string(b)
}
