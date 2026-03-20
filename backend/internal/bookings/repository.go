package bookings

import (
	"backend/internal/model"
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CheckAvailability(ctx context.Context, checkIn, checkOut time.Time, apartmentNumber int) (bool, error)
	CreateBooking(ctx context.Context, b model.Booking) (int, error)
	GetCalendar(ctx context.Context, apartmentNumber int) ([]model.Booking, error)
}

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &repository{db: db}
}

func (r *repository) CheckAvailability(ctx context.Context, checkIn, checkOut time.Time, apartmentNumber int) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1 FROM bookings
			WHERE apartment_number = $1
			  AND status IN ('confirmed', 'blocked')
			  AND check_in < $3
			  AND check_out > $2
		)
	`
	var exists bool
	err := r.db.QueryRow(ctx, query, apartmentNumber, checkIn, checkOut).Scan(&exists)
	if err != nil {
		return false, err
	}
	
	return !exists, nil
}

func (r *repository) CreateBooking(ctx context.Context, b model.Booking) (int, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	queryCheck := `
		SELECT EXISTS (
			SELECT 1 FROM bookings
			WHERE apartment_number = $1
			  AND status IN ('confirmed', 'blocked')
			  AND check_in < $3
			  AND check_out > $2
		)
	`
	var exists bool
	err = tx.QueryRow(ctx, queryCheck, b.ApartmentNumber, b.CheckIn, b.CheckOut).Scan(&exists)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, errors.New("dates are already booked or blocked")
	}

	queryInsert := `
		INSERT INTO bookings (name, phone, email, telegram, apartment_number, check_in, check_out, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`
	var newID int
	err = tx.QueryRow(ctx, queryInsert, b.Name, b.Phone, b.Email, b.Telegram, b.ApartmentNumber, b.CheckIn, b.CheckOut, b.Status).Scan(&newID)
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return newID, nil
}

func (r *repository) GetCalendar(ctx context.Context, apartmentNumber int) ([]model.Booking, error) {
	query := `
		SELECT check_in, check_out FROM bookings
		WHERE apartment_number = $1
		  AND status IN ('confirmed', 'blocked')
		  AND check_out >= CURRENT_DATE
	`
	rows, err := r.db.Query(ctx, query, apartmentNumber)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Booking
	for rows.Next() {
		var b model.Booking
		if err := rows.Scan(&b.CheckIn, &b.CheckOut); err != nil {
			return nil, err
		}
		result = append(result, b)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
