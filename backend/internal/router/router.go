package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/ordani/tinyme-backend/internal/analytics"
	"github.com/ordani/tinyme-backend/internal/handlers"
	"github.com/ordani/tinyme-backend/internal/middleware"
	"github.com/ordani/tinyme-backend/internal/services"
)

func Setup(
	app *fiber.App,
	linkSvc *services.LinkService,
	redirectSvc *services.RedirectService,
	analyticsSvc *analytics.AnalyticsService,
	apiKey string,
) {
	linkHandler := handlers.NewLinkHandler(linkSvc)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsSvc)
	redirectHandler := handlers.NewRedirectHandler(redirectSvc, analyticsSvc)

	// Global middleware
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(middleware.CORS())
	app.Use(middleware.RequestID())

	// API routes (protected)
	api := app.Group("/api")
	api.Use(middleware.APIKeyAuth(apiKey))

	// Links CRUD
	api.Post("/links", linkHandler.Create)
	api.Get("/links", linkHandler.List)
	api.Get("/links/:id", linkHandler.Get)
	api.Patch("/links/:id", linkHandler.Update)
	api.Delete("/links/:id", linkHandler.Delete)

	// Destinations
	api.Post("/links/:id/destinations", linkHandler.AddDestination)
	api.Patch("/links/:id/destinations/:destId", linkHandler.UpdateDestination)
	api.Post("/links/:id/destinations/:destId/rollback", linkHandler.RollbackDestination)
	api.Get("/links/:id/destinations/:destId/history", linkHandler.DestinationHistory)

	// Routing rules
	api.Post("/links/:id/rules", linkHandler.AddRule)
	api.Delete("/links/:id/rules/:ruleId", linkHandler.DeleteRule)

	// Analytics
	api.Get("/links/:id/analytics", analyticsHandler.Summary)
	api.Get("/links/:id/events", analyticsHandler.Events)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "tinyme-backend"})
	})

	// Redirect catch-all — must be last
	// This handles GET /:slug for all short links
	app.Get("/:slug", redirectHandler.Resolve)

	// Serve static frontend
	app.Static("/", "./public")
}
