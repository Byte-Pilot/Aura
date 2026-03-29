FROM golang:1.25.0-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o main ./cmd/main.go


FROM alpine:3.19
WORKDIR /app

RUN apk add --no-cache tzdata ca-certificates

RUN adduser -D appuser

COPY --from=builder /app/main .
COPY --from=builder /app/public ./public
COPY --from=builder /app/internal/db/init_db.sql ./internal/db/init_db.sql

USER appuser

EXPOSE 8000
CMD ["./main"]
