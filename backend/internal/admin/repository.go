package admin

import (
	"backend/internal/model"
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	GetUserByUsername(ctx context.Context, username string) (model.AdminUser, error)
	GetAllBookings(ctx context.Context) ([]model.Booking, error)
	UpdateBookingStatus(ctx context.Context, id int, status model.BookingStatus) error
	CreateBlock(ctx context.Context, b model.Booking) error
	UnblockDates(ctx context.Context, req model.AdminUnblockRequest) error
}

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &repository{db: db}
}

func (r *repository) GetUserByUsername(ctx context.Context, username string) (model.AdminUser, error) {
	query := `SELECT id, username, password_hash FROM admin_users WHERE username = $1`
	var user model.AdminUser
	err := r.db.QueryRow(ctx, query, username).Scan(&user.ID, &user.Username, &user.PasswordHash)
	return user, err
}

func (r *repository) GetAllBookings(ctx context.Context) ([]model.Booking, error) {
	query := `
		SELECT id, name, phone, COALESCE(email, ''), COALESCE(telegram, ''), apartment_number, check_in, check_out, status, created_at, updated_at 
		FROM bookings 
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Booking
	for rows.Next() {
		var b model.Booking
		err := rows.Scan(
			&b.ID, &b.Name, &b.Phone, &b.Email, &b.Telegram, &b.ApartmentNumber,
			&b.CheckIn, &b.CheckOut, &b.Status, &b.CreatedAt, &b.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, b)
	}
	return result, rows.Err()
}

func (r *repository) UpdateBookingStatus(ctx context.Context, id int, status model.BookingStatus) error {
	if status == model.StatusConfirmed {
		queryCheck := `
			SELECT EXISTS (
				SELECT 1 FROM bookings b1
				JOIN bookings b2 ON b1.apartment_number = b2.apartment_number
				WHERE b1.id = $1
				  AND b2.status IN ('confirmed', 'blocked')
				  AND b2.id != b1.id
				  AND b2.check_in < b1.check_out
				  AND b2.check_out > b1.check_in
			)
		`
		var overlap bool
		err := r.db.QueryRow(ctx, queryCheck, id).Scan(&overlap)
		if err != nil {
			return err
		}
		if overlap {
			return errors.New("невозможно подтвердить: даты уже заняты или заблокированы")
		}
	}

	query := `UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2`
	tag, err := r.db.Exec(ctx, query, status, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("booking not found")
	}
	return nil
}

func (r *repository) CreateBlock(ctx context.Context, b model.Booking) error {
	queryCheck := `
		SELECT EXISTS (
			SELECT 1 FROM bookings
			WHERE apartment_number = $1
			  AND status = 'confirmed'
			  AND check_in < $3
			  AND check_out > $2
		)
	`
	var exists bool
	err := r.db.QueryRow(ctx, queryCheck, b.ApartmentNumber, b.CheckIn, b.CheckOut).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("cannot block dates, there is already a confirmed booking in this period")
	}

	queryInsert := `
		INSERT INTO bookings (name, phone, email, apartment_number, check_in, check_out, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	
	_, err = r.db.Exec(ctx, queryInsert, "Admin", "N/A", "Admin", b.ApartmentNumber, b.CheckIn, b.CheckOut, model.StatusBlocked)
	return err
}

func (r *repository) UnblockDates(ctx context.Context, req model.AdminUnblockRequest) error {
	query := `
		UPDATE bookings
		SET status = 'cancelled', updated_at = now()
		WHERE apartment_number = $1
		  AND status = 'blocked'
		  AND check_in = $2
		  AND check_out = $3
	`
	tag, err := r.db.Exec(ctx, query, req.ApartmentNumber, req.CheckIn, req.CheckOut)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("no matching blocked dates found")
	}
	return nil
}
