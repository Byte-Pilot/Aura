package config

import (
	"log"
	"os"
)

type Config struct {
	Port             string
	DatabaseURL      string
	JWTSecret        string
	JWTRefreshSecret string
}

func Load() *Config {
	port := os.Getenv("PORT")

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		log.Fatal("DATABASE_URL is required")
	}

	jwtAccessSecret := os.Getenv("JWT_ACCESS_SECRET")
	if jwtAccessSecret == "" {
		jwtAccessSecret = "aura_super_secret_jwt_key_99123"
	}

	jwtRefreshSecret := os.Getenv("JWT_REFRESH_SECRET")
	if jwtRefreshSecret == "" {
		jwtRefreshSecret = "aura_super_secret_refresh_key_99123"
	}

	return &Config{
		Port:             port,
		DatabaseURL:      dbUrl,
		JWTSecret:        jwtAccessSecret,
		JWTRefreshSecret: jwtRefreshSecret,
	}
}
