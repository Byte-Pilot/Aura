package bookings

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

func (h *Handler) GetAvailability(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	aptStr := r.URL.Query().Get("apartment_number")

	if from == "" || to == "" || aptStr == "" {
		middleware.ErrorResponse(w, http.StatusBadRequest, "from, to, and apartment_number are required")
		return
	}

	apt, err := strconv.Atoi(aptStr)
	if err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid apartment_number")
		return
	}

	available, err := h.service.CheckAvailability(r.Context(), from, to, apt)
	if err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	middleware.SuccessResponse(w, http.StatusOK, model.AvailabilityResponse{Available: available})
}

func (h *Handler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	var req model.BookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid request format")
		return
	}

	// Honeypot check: if filled, it's a bot. Silently drop.
	if req.Website != "" {
		middleware.SuccessResponse(w, http.StatusCreated, map[string]interface{}{
			"message": "booking created successfully",
			"id":      "dummy",
		})
		return
	}

	id, err := h.service.CreateBooking(r.Context(), req)
	if err != nil {
		if err.Error() == "dates are already booked or blocked" {
			middleware.ErrorResponse(w, http.StatusConflict, err.Error())
		} else {
			middleware.ErrorResponse(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	middleware.SuccessResponse(w, http.StatusCreated, map[string]interface{}{
		"message": "booking created successfully",
		"id":      id,
	})
}

func (h *Handler) GetCalendar(w http.ResponseWriter, r *http.Request) {
	aptStr := r.URL.Query().Get("apartment_number")
	if aptStr == "" {
		middleware.ErrorResponse(w, http.StatusBadRequest, "apartment_number is required")
		return
	}

	apt, err := strconv.Atoi(aptStr)
	if err != nil {
		middleware.ErrorResponse(w, http.StatusBadRequest, "invalid apartment_number")
		return
	}

	res, err := h.service.GetCalendar(r.Context(), apt)
	if err != nil {
		middleware.ErrorResponse(w, http.StatusInternalServerError, "failed to get calendar")
		return
	}

	middleware.SuccessResponse(w, http.StatusOK, res)
}
