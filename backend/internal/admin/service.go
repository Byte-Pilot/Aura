package admin

import (
	"backend/internal/model"
	"context"
	"errors"
	"time"
)

type Service interface {
	GetAllBookings(ctx context.Context) ([]model.Booking, error)
	UpdateBookingStatus(ctx context.Context, id int, req model.AdminUpdateStatusRequest) error
	BlockDates(ctx context.Context, req model.AdminBlockRequest) error
	UnblockDates(ctx context.Context, req model.AdminUnblockRequest) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func parseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

func (s *service) GetAllBookings(ctx context.Context) ([]model.Booking, error) {
	return s.repo.GetAllBookings(ctx)
}

func (s *service) UpdateBookingStatus(ctx context.Context, id int, req model.AdminUpdateStatusRequest) error {
	if req.Status != model.StatusPending && req.Status != model.StatusConfirmed &&
		req.Status != model.StatusCancelled && req.Status != model.StatusBlocked {
		return errors.New("invalid status")
	}
	return s.repo.UpdateBookingStatus(ctx, id, req.Status)
}

func (s *service) BlockDates(ctx context.Context, req model.AdminBlockRequest) error {
	checkIn, err := parseDate(req.CheckIn)
	if err != nil {
		return errors.New("invalid check_in date format, expected YYYY-MM-DD")
	}
	checkOut, err := parseDate(req.CheckOut)
	if err != nil {
		return errors.New("invalid check_out date format, expected YYYY-MM-DD")
	}

	if checkIn.After(checkOut) || checkIn.Equal(checkOut) {
		return errors.New("дата заезда должна быть раньше даты выезда")
	}

	booking := model.Booking{
		ApartmentNumber: req.ApartmentNumber,
		CheckIn:         checkIn,
		CheckOut:        checkOut,
	}

	return s.repo.CreateBlock(ctx, booking)
}

func (s *service) UnblockDates(ctx context.Context, req model.AdminUnblockRequest) error {
	if req.CheckIn == "" || req.CheckOut == "" {
		return errors.New("check_in and check_out are required")
	}
	return s.repo.UnblockDates(ctx, req)
}
