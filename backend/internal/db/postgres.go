package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ConnectPostgres(url string) (*pgxpool.Pool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	return conn, nil
}

func InitDB(ctx context.Context, pool *pgxpool.Pool, scriptPath string) error {
	log.Printf("Initializing database from script: %s\n", scriptPath)
	script, err := os.ReadFile(scriptPath)
	if err != nil {
		return fmt.Errorf("failed to read init script: %v", err)
	}

	_, err = pool.Exec(ctx, string(script))
	if err != nil {
		return fmt.Errorf("failed to execute init script: %v", err)
	}

	log.Println("Database initialization completed successfully")
	return nil
}
