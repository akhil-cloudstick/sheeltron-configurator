# --- build stage ---
FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o configurator .

# --- run stage ---
FROM alpine:3.20
WORKDIR /app
# Binary + the SQL migrations it runs on boot (sql-migrate reads ./migrations)
COPY --from=build /app/configurator .
COPY --from=build /app/migrations ./migrations
# APP_PORT is read by main.go; set it to match the host's assigned port
# (on Render, set env APP_PORT=10000 — its default $PORT).
EXPOSE 8080
CMD ["./configurator"]
