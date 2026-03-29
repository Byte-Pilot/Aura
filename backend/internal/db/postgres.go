package db

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
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
