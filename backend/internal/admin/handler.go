package admin

import (
	"backend/internal/middleware"
	"backend/internal/model"
	"encoding/json"
	"net/http"
	"strconv"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetAllBookings(w http.ResponseWriter, r *http.Request) {
	bookings, err := h.service.GetAllBookings(r.Context())
	if err != nil {
		middleware.ErrorResponse(w, http.StatusInternalServerError, "failed to fetch bookings")
		return
	}
	middleware.SuccessResponse(w, http.StatusOK, bookings)
}

func (h *Handler) UpdateBookingStatus(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid booking ID")
		return
	}

	var req model.AdminUpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid request format")
		return
	}

	if err := h.service.UpdateBookingStatus(r.Context(), id, req); err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	middleware.SuccessResponse(w, http.StatusOK, map[string]string{"message": "status updated"})
}

func (h *Handler) BlockDates(w http.ResponseWriter, r *http.Request) {
	var req model.AdminBlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid request format")
		return
	}

	if err := h.service.BlockDates(r.Context(), req); err != nil {
		middleware.ErrorResponse(w, http.StatusConflict, err.Error())
		return
	}

	middleware.SuccessResponse(w, http.StatusCreated, map[string]string{"message": "dates blocked successfully"})
}

func (h *Handler) UnblockDates(w http.ResponseWriter, r *http.Request) {
	var req model.AdminUnblockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid request format")
		return
	}

	if err := h.service.UnblockDates(r.Context(), req); err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	middleware.SuccessResponse(w, http.StatusOK, map[string]string{"message": "dates unblocked successfully"})
}
