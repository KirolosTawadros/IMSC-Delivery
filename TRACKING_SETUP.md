# External Tracking Setup

This project now supports an external tracking layer that does not alter the ERP flow.

## 1) Configure PostgreSQL connection

Set this environment variable before starting the Node server:

`TRACKING_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/imsc_tracking`

If this variable is missing, tracking APIs stay disabled and ERP APIs still work as usual.

## 2) Create schema in pgAdmin (recommended)

Run the SQL in:

`db/tracking_schema.sql`

The Node server also auto-creates the same schema on startup when DB access exists.

## 3) Start app

- Frontend/dev: `npm run dev`
- Production server: `npm run start`

## 4) Tracking API endpoints

- `POST /tracking/session/start`
- `POST /tracking/location`
- `POST /tracking/session/end`
- `GET /tracking/dashboard/live`
- `GET /tracking/dashboard/kpis`

## 5) Current app behavior

- Tracking starts when driver taps **Start Stop**.
- Session is stored in localStorage as `imsc_active_tracking_session`.
- Live GPS pings are sent every ~15 seconds while the app is open.
- Tracking ends after successful final ERP submission in completion screen.
