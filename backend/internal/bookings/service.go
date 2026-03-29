package bookings

import (
	"backend/internal/model"
	"context"
	"errors"
	"time"
)

type Service interface {
	CheckAvailability(ctx context.Context, from, to string, apartmentNumber int) (bool, error)
	CreateBooking(ctx context.Context, req model.BookingRequest) (int, error)
	GetCalendar(ctx context.Context, apartmentNumber int) ([]model.CalendarResponse, error)
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

func (s *service) CheckAvailability(ctx context.Context, from, to string, apartmentNumber int) (bool, error) {
	checkIn, err := parseDate(from)
	if err != nil {
		return false, errors.New("invalid from date format, expected YYYY-MM-DD")
	}
	checkOut, err := parseDate(to)
	if err != nil {
		return false, errors.New("invalid to date format, expected YYYY-MM-DD")
	}

	if checkIn.After(checkOut) || checkIn.Equal(checkOut) {
		return false, errors.New("'from' date must be before 'to' date")
	}

	today := time.Now().Truncate(24 * time.Hour)
	if checkIn.Before(today) {
		return false, errors.New("cannot check dates in the past")
	}
	maxDate := today.AddDate(1, 0, 0)
	if checkIn.After(maxDate) {
		return false, errors.New("бронирование доступно максимум на год вперед")
	}

	return s.repo.CheckAvailability(ctx, checkIn, checkOut, apartmentNumber)
}

func (s *service) CreateBooking(ctx context.Context, req model.BookingRequest) (int, error) {
	if req.Name == "" || req.Phone == "" {
		return 0, errors.New("name and phone are required")
	}

	checkIn, err := parseDate(req.CheckIn)
	if err != nil {
		return 0, errors.New("invalid check_in date format, expected YYYY-MM-DD")
	}
	checkOut, err := parseDate(req.CheckOut)
	if err != nil {
		return 0, errors.New("invalid check_out date format, expected YYYY-MM-DD")
	}

	if checkIn.After(checkOut) || checkIn.Equal(checkOut) {
		return 0, errors.New("дата заезда должна быть раньше даты выезда")
	}

	today := time.Now().Truncate(24 * time.Hour)
	if checkIn.Before(today) {
		return 0, errors.New("cannot book dates in the past")
	}
	maxDate := today.AddDate(1, 0, 0)
	if checkIn.After(maxDate) {
		return 0, errors.New("бронирование доступно максимум на год вперед")
	}

	booking := model.Booking{
		Name:            req.Name,
		Phone:           req.Phone,
		Email:           req.Email,
		Telegram:        req.Telegram,
		ApartmentNumber: req.ApartmentNumber,
		CheckIn:         checkIn,
		CheckOut:        checkOut,
		Status:          model.StatusPending,
	}

	return s.repo.CreateBooking(ctx, booking)
}

func (s *service) GetCalendar(ctx context.Context, apartmentNumber int) ([]model.CalendarResponse, error) {
	bookings, err := s.repo.GetCalendar(ctx, apartmentNumber)
	if err != nil {
		return nil, err
	}

	var res []model.CalendarResponse
	for _, b := range bookings {
		res = append(res, model.CalendarResponse{
			CheckIn:  b.CheckIn.Format("2006-01-02"),
			CheckOut: b.CheckOut.Format("2006-01-02"),
		})
	}

	if res == nil {
		res = []model.CalendarResponse{}
	}
	return res, nil
}
