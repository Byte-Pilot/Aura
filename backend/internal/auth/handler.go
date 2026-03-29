package auth

import (
	"backend/internal/middleware"
	"backend/internal/model"
	"encoding/json"
	"net/http"
	"time"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.AdminLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid request format")
		return
	}

	ip := middleware.GetClientIP(r)

	accessToken, refreshToken, err := h.service.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		middleware.Limiter.RecordFailedLogin(ip)
		middleware.ErrorResponse(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	middleware.Limiter.ClearFailedLogin(ip)
	setCookies(w, accessToken, refreshToken)
	middleware.SuccessResponse(w, http.StatusOK, map[string]string{"message": "login successful"})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		middleware.ErrorResponse(w, http.StatusUnauthorized, "refresh token not found")
		return
	}

	newAccess, newRefresh, err := h.service.RefreshTokens(r.Context(), cookie.Value)
	if err != nil {
		middleware.ErrorResponse(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	setCookies(w, newAccess, newRefresh)
	middleware.SuccessResponse(w, http.StatusOK, map[string]string{"message": "tokens refreshed"})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
	})
	middleware.SuccessResponse(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func setCookies(w http.ResponseWriter, access, refresh string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    access,
		Expires:  time.Now().Add(15 * time.Minute),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode, // Adjust if using cross-origin
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refresh,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
}
