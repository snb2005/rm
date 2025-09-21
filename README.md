# Tracking Server

A Node.js Express server for controlled lab experiments with consenting participants.

## Features

- Serves a 1x1 transparent PNG tracking pixel at `/track/:id.png`
- Logs detailed request information to CSV file
- Handles IP extraction with x-forwarded-for support
- Disables caching for accurate tracking
- Production-ready for deployment on Render

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

## API Endpoints

### GET /
Returns plain text "Tracking server running."

### GET /track/:id.png
- `:id` - Participant identifier
- Returns 1x1 transparent PNG
- Logs request details to `requests.csv`

## CSV Log Format

The server logs the following fields for each tracking request:
- `timestamp` - ISO 8601 timestamp
- `participant_id` - ID from URL parameter
- `remote_addr` - Direct connection IP
- `x_forwarded_for` - Forwarded IP header (if present)
- `ip_used` - Selected IP (x-forwarded-for first, then remote_addr)
- `user_agent` - Browser user agent
- `accept_language` - Browser language preferences
- `referer` - Referring page URL

## Deployment

This server is configured for deployment on Render:
- Uses `process.env.PORT` for port configuration
- Includes proper error handling and graceful shutdown
- Minimal dependencies for reliability

## Environment Variables

- `PORT` - Server port (defaults to 3000)
- `NODE_ENV` - Environment setting

## Privacy & Ethics

This server is designed for controlled lab experiments with:
- Consenting participants
- Transparent data collection
- Clear purpose and scope
