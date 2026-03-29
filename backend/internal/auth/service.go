package auth

import (
	"backend/internal/admin"
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Login(ctx context.Context, username, password string) (accessToken, refreshToken string, err error)
	RefreshTokens(ctx context.Context, refreshToken string) (newAccess, newRefresh string, err error)
}

type service struct {
	adminRepo     admin.Repository
	accessSecret  string
	refreshSecret string
}

func NewService(adminRepo admin.Repository, accessSecret, refreshSecret string) Service {
	return &service{
		adminRepo:     adminRepo,
		accessSecret:  accessSecret,
		refreshSecret: refreshSecret,
	}
}

func (s *service) Login(ctx context.Context, username, password string) (string, string, error) {
	user, err := s.adminRepo.GetUserByUsername(ctx, username)
	if err != nil {
		return "", "", errors.New("invalid credentials")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return "", "", errors.New("invalid credentials")
	}

	return s.generateTokens(user.ID)
}

func (s *service) RefreshTokens(ctx context.Context, refreshToken string) (string, string, error) {
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.refreshSecret), nil
	})

	if err != nil || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		return "", "", errors.New("invalid user_id in token")
	}

	return s.generateTokens(int(userIDFloat))
}

func (s *service) generateTokens(userID int) (string, string, error) {

	accessClaims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(15 * time.Minute).Unix(),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessString, err := accessToken.SignedString([]byte(s.accessSecret))
	if err != nil {
		return "", "", err
	}

	refreshClaims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshString, err := refreshToken.SignedString([]byte(s.refreshSecret))
	if err != nil {
		return "", "", err
	}

	return accessString, refreshString, nil
}
