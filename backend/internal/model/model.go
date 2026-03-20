package model

import "time"

type BookingStatus string

const (
	StatusPending   BookingStatus = "pending"
	StatusConfirmed BookingStatus = "confirmed"
	StatusCancelled BookingStatus = "cancelled"
	StatusBlocked   BookingStatus = "blocked"
)

type Booking struct {
	ID              int           `json:"id"`
	Name            string        `json:"name,omitempty"`
	Phone           string        `json:"phone,omitempty"`
	Email           string        `json:"email,omitempty"`
	Telegram        string        `json:"telegram,omitempty"`
	ApartmentNumber int           `json:"apartment_number"`
	CheckIn         time.Time     `json:"check_in"`
	CheckOut        time.Time     `json:"check_out"`
	Status          BookingStatus `json:"status"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}

type AdminUser struct {
	ID           int       `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AvailabilityRequest struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type AvailabilityResponse struct {
	Available bool `json:"available"`
}

type BookingRequest struct {
	Name            string `json:"name"`
	Phone           string `json:"phone"`
	Email           string `json:"email"`
	Telegram        string `json:"telegram"`
	ApartmentNumber int    `json:"apartment_number"`
	CheckIn         string `json:"check_in"`
	CheckOut        string `json:"check_out"`
}

type CalendarResponse struct {
	CheckIn  string `json:"check_in"`
	CheckOut string `json:"check_out"`
}

type AdminLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AdminUpdateStatusRequest struct {
	Status BookingStatus `json:"status"`
}

type AdminBlockRequest struct {
	ApartmentNumber int    `json:"apartment_number"`
	CheckIn         string `json:"check_in"`
	CheckOut        string `json:"check_out"`
}

type AdminUnblockRequest struct {
	ApartmentNumber int    `json:"apartment_number"`
	CheckIn         string `json:"check_in"`
	CheckOut        string `json:"check_out"`
}
