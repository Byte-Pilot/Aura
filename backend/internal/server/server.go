package server

import (
	"backend/internal/admin"
	"backend/internal/auth"
	"backend/internal/bookings"
	"backend/internal/config"
	"backend/internal/middleware"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func NewServer(
	cfg *config.Config,
	authHandler *auth.Handler,
	bookingsHandler *bookings.Handler,
	adminHandler *admin.Handler,
) http.Handler {
	mux := http.NewServeMux()

	front := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" || strings.Contains(filepath.Base(path), ".") {
			http.FileServer(http.Dir("./public")).ServeHTTP(w, r)
			return
		}
		htmlPath := path + ".html"
		if _, err := os.Stat(filepath.Join("./public", htmlPath)); err == nil {
			r.URL.Path = htmlPath
		}
		http.FileServer(http.Dir("./public")).ServeHTTP(w, r)
	})
	mux.Handle("/", front)

	apiMux := http.NewServeMux()

	apiMux.HandleFunc("GET /availability", bookingsHandler.GetAvailability)
	apiMux.Handle("POST /bookings", middleware.Limiter.LimitBookings(http.HandlerFunc(bookingsHandler.CreateBooking)))
	apiMux.HandleFunc("GET /calendar", bookingsHandler.GetCalendar)

	apiMux.Handle("POST /admin/login", middleware.Limiter.BlockBannedIPs(http.HandlerFunc(authHandler.Login)))
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
	rateLimitedApiHandler := middleware.Limiter.LimitAll(jsonApiHandler)
	mux.Handle("/api/", http.StripPrefix("/api", rateLimitedApiHandler))

	return logMiddleware(mux)
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s - %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
