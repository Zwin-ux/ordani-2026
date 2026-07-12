package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port         string
	DatabaseURL  string
	APIKey       string
	BaseURL      string
	RedirectBase string
}

func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8080"),
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://localhost:5432/tinyme?sslmode=disable"),
		APIKey:       getEnv("API_KEY", ""),
		BaseURL:      getEnv("BASE_URL", "http://localhost:8080"),
		RedirectBase: getEnv("REDIRECT_BASE", "tinyme.cc"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
