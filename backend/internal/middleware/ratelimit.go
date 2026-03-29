package middleware

import (
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type ipTracker struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type dailyBookings struct {
	count    int
	dateMSK  string
	lastSeen time.Time
}

type loginAttempt struct {
	failures    int
	bannedUntil time.Time
	lastSeen    time.Time
}

type RateLimiter struct {
	generalMu sync.RWMutex
	general   map[string]*ipTracker

	bookingMu sync.RWMutex
	bookings  map[string]*dailyBookings

	loginMu sync.RWMutex
	logins  map[string]*loginAttempt
}

var Limiter = NewRateLimiter()

func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		general:  make(map[string]*ipTracker),
		bookings: make(map[string]*dailyBookings),
		logins:   make(map[string]*loginAttempt),
	}
	go rl.cleanupLoop()
	return rl
}

func GetClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}

	if strings.Contains(ip, ",") {
		ip = strings.Split(ip, ",")[0]
	}

	if strings.Contains(ip, ":") && !strings.Contains(ip, "]") {
		ip = strings.Split(ip, ":")[0]
	} else if strings.Contains(ip, "]:") {
		ip = strings.Split(strings.TrimPrefix(ip, "["), "]:")[0]
	}

	return strings.TrimSpace(ip)
}

func (rl *RateLimiter) LimitAll(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := GetClientIP(r)

		rl.generalMu.Lock()
		tracker, exists := rl.general[ip]
		if !exists {
			tracker = &ipTracker{
				limiter: rate.NewLimiter(rate.Every(time.Minute/100), 100),
			}
			rl.general[ip] = tracker
		}
		tracker.lastSeen = time.Now()
		limiter := tracker.limiter
		rl.generalMu.Unlock()

		if !limiter.Allow() {
			ErrorResponse(w, http.StatusTooManyRequests, "Слишком много запросов. Пожалуйста, подождите.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getCurrentDateMSK() string {
	loc, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		loc = time.FixedZone("MSK", 3*60*60)
	}
	return time.Now().In(loc).Format("2006-01-02")
}

func (rl *RateLimiter) LimitBookings(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := GetClientIP(r)
		currentDate := getCurrentDateMSK()
		now := time.Now()

		rl.bookingMu.Lock()
		tracker, exists := rl.bookings[ip]
		if !exists {
			tracker = &dailyBookings{count: 0, dateMSK: currentDate}
			rl.bookings[ip] = tracker
		}

		if tracker.dateMSK != currentDate {
			tracker.count = 0
			tracker.dateMSK = currentDate
		}

		tracker.lastSeen = now

		if tracker.count >= 5 {
			rl.bookingMu.Unlock()
			ErrorResponse(w, http.StatusTooManyRequests, "Превышен лимит заявок (5 в день). Попробуйте завтра.")
			return
		}

		tracker.count++
		rl.bookingMu.Unlock()

		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) BlockBannedIPs(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := GetClientIP(r)
		now := time.Now()

		rl.loginMu.RLock()
		tracker, exists := rl.logins[ip]
		rl.loginMu.RUnlock()

		if exists && now.Before(tracker.bannedUntil) {
			ErrorResponse(w, http.StatusTooManyRequests, "Слишком много неудачных попыток входа. IP заблокирован на 10 минут.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) RecordFailedLogin(ip string) {
	rl.loginMu.Lock()
	defer rl.loginMu.Unlock()

	tracker, exists := rl.logins[ip]
	now := time.Now()

	if !exists {
		tracker = &loginAttempt{failures: 0}
		rl.logins[ip] = tracker
	}

	if now.After(tracker.bannedUntil) && tracker.failures >= 5 {
		tracker.failures = 0
	}

	tracker.failures++
	tracker.lastSeen = now

	if tracker.failures >= 5 {
		tracker.bannedUntil = now.Add(10 * time.Minute)
		log.Printf("IP %s banned for 10 minutes due to multiple failed login attempts", ip)
	}
}

func (rl *RateLimiter) ClearFailedLogin(ip string) {
	rl.loginMu.Lock()
	defer rl.loginMu.Unlock()

	if tracker, exists := rl.logins[ip]; exists {
		tracker.failures = 0
		tracker.bannedUntil = time.Time{}
		tracker.lastSeen = time.Now()
	}
}

func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()

		rl.generalMu.Lock()
		for ip, tracker := range rl.general {
			if now.Sub(tracker.lastSeen) > 1*time.Hour {
				delete(rl.general, ip)
			}
		}
		rl.generalMu.Unlock()

		rl.bookingMu.Lock()
		for ip, tracker := range rl.bookings {
			if now.Sub(tracker.lastSeen) > 24*time.Hour {
				delete(rl.bookings, ip)
			}
		}
		rl.bookingMu.Unlock()

		rl.loginMu.Lock()
		for ip, tracker := range rl.logins {
			if now.Sub(tracker.lastSeen) > 1*time.Hour && now.After(tracker.bannedUntil) {
				delete(rl.logins, ip)
			}
		}
		rl.loginMu.Unlock()
	}
}
