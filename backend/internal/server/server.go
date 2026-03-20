package server

import (
	"backend/internal/admin"
	"backend/internal/auth"
	"backend/internal/bookings"
	"backend/internal/config"
	"backend/internal/middleware"
	"log"
	"net/http"
)

func NewServer(
	cfg *config.Config,
	authHandler *auth.Handler,
	bookingsHandler *bookings.Handler,
	adminHandler *admin.Handler,
) http.Handler {
	mux := http.NewServeMux()

	front := http.FileServer(http.Dir("./public"))
	mux.Handle("/", front)

	apiMux := http.NewServeMux()

	apiMux.HandleFunc("GET /availability", bookingsHandler.GetAvailability)
	apiMux.HandleFunc("POST /bookings", bookingsHandler.CreateBooking)
	apiMux.HandleFunc("GET /calendar", bookingsHandler.GetCalendar)

	apiMux.HandleFunc("POST /admin/login", authHandler.Login)
	apiMux.HandleFunc("POST /admin/refresh", authHandler.Refresh)

	adminMux := http.NewServeMux()
	adminMux.HandleFunc("POST /admin/logout", authHandler.Logout)
	adminMux.HandleFunc("GET /admin/bookings", adminHandler.GetAllBookings)
	adminMux.HandleFunc("PATCH /admin/bookings/{id}", adminHandler.UpdateBookingStatus)
	adminMux.HandleFunc("POST /admin/block", adminHandler.BlockDates)
	adminMux.HandleFunc("PATCH /admin/blocked-dates", adminHandler.UnblockDates)

	protectedHandler := middleware.RequireAuth(cfg.JWTSecret)(adminMux)

	apiMux.Handle("/admin/", protectedHandler)

	jsonApiHandler := middleware.JSONContentType()(apiMux)
	mux.Handle("/api/", http.StripPrefix("/api", jsonApiHandler))

	return logMiddleware(mux)
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s - %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
