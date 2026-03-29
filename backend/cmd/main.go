package main

import (
	"backend/internal/admin"
	"backend/internal/auth"
	"backend/internal/bookings"
	"backend/internal/config"
	"backend/internal/db"
	"backend/internal/server"
	"context"
	"errors"
	"github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found")
	}

	conf := config.Load()

	conn, err := db.ConnectPostgres(conf.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to cnnect to DB: %v\n", err)
	}
	defer conn.Close()

	if err := conn.Ping(context.Background()); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}
	log.Println("OK Connected to DB")

	bookingsRepo := bookings.NewRepository(conn)
	bookingsService := bookings.NewService(bookingsRepo)
	bookingsHandler := bookings.NewHandler(bookingsService)

	adminRepo := admin.NewRepository(conn)
	adminService := admin.NewService(adminRepo)
	adminHandler := admin.NewHandler(adminService)

	authService := auth.NewService(adminRepo, conf.JWTSecret, conf.JWTRefreshSecret)
	authHandler := auth.NewHandler(authService)

	srvHandler := server.NewServer(conf, authHandler, bookingsHandler, adminHandler)

	srv := &http.Server{
		Addr:    ":" + conf.Port,
		Handler: srvHandler,
	}

	go func() {
		log.Printf("Starting server on port %s...", conf.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Listen and serve error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Successful server stop")
}

/*func main() {
	hash, _ := bcrypt.GenerateFromPassword([]byte("DctPf,hjybhjdfyj$"), 12)
	fmt.Println(string(hash))
}
*/
