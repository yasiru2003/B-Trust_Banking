## Environment Variables and API Credentials

This document consolidates all environment variables, API tokens, and relevant URLs used across the repository.

### Backend (`backend/`)

#### Server and Environment
- **PORT**: HTTP port for the Node server (default: `5001` in code; example env uses `5000`).
- **NODE_ENV**: `development` | `production`.
- **FRONTEND_URL**: Allowed CORS origin (default: `http://localhost:3000`).

#### Database
- **DATABASE_URL**: Full Postgres connection URL (alternative to discrete fields).
- **DB_HOST**: Database host.
- **DB_PORT**: Database port (default: `5432`).
- **DB_NAME**: Database name.
- **DB_USER**: Database user.
- **DB_PASSWORD**: Database password.
- **DB_SSL**: `true` to enable SSL (uses `require` mode) or `false`.

#### Security
- **JWT_SECRET**: Secret for signing JWTs.
- **JWT_EXPIRES_IN**: Token lifetime (default: `24h`).
- **BCRYPT_ROUNDS**: Cost factor for password hashing (default: `12`).
- **RATE_LIMIT_WINDOW_MS**: Rate limit window in ms (default: `900000`).
- **RATE_LIMIT_MAX_REQUESTS**: Max requests per window (default: `100`).

#### Email (OTP via email, if used)

- **EMAIL_HOST**: SMTP host (example: `smtp.gmail.com`).
- **EMAIL_PORT**: SMTP port (example: `587`).
- **EMAIL_USER**: SMTP username/email.
- **EMAIL_PASS**: SMTP app password.

#### SMS Providers
- **Text.lk**
  - **TEXT_LK_API_TOKEN**: Text.lk API token (required to send real SMS).
  - **TEXT_LK_API_URL**: Optional base URL (examples: `https://app.text.lk/api/http` or provider endpoints used directly by services).

- **Twilio**
  - **TWILIO_ACCOUNT_SID**: Your account SID (starts with `AC...`).
  - **TWILIO_AUTH_TOKEN**: Auth token.
  - **TWILIO_VERIFY_SERVICE_SID**: Verify service SID (starts with `VA...`).
  - **TWILIO_PHONE_NUMBER**: (If direct SMS sending is used).

#### File/Object Storage
- **FILEBASE_ACCESS_KEY**: Access key for Filebase/S3-compatible storage.
- **FILEBASE_SECRET_KEY**: Secret key for Filebase.
- **FILEBASE_BUCKET**: Bucket name (default: `b-trust-customer-photos`).

#### Feature Flags
- **BYPASS_PHONE_VERIFICATION**: `true` to skip phone verification in flows where allowed (for development/testing only).

#### Face Auth Service Integration
- **FACE_AUTH_URL**: Base URL for the Python Face Auth service (default: `http://localhost:8002`).

### Frontend (`frontend/`)
- **REACT_APP_API_URL**: Base URL for backend API (default: `http://localhost:5001/api`).

### Face Auth Service (`face-auth/` Python)
- **NEON_DATABASE_URL**: Postgres connection URL (if set, preferred by the service).
- Or discrete DB vars (used to build DSN when `NEON_DATABASE_URL` is not set):
  - **DB_HOST**, **DB_PORT** (default `5432`), **DB_NAME**, **DB_USER**, **DB_PASSWORD**.

### Example `backend/config.env`
```env
# Server
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database (choose either DATABASE_URL or discrete variables)
# DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require
DB_HOST=your-neon-host
DB_PORT=5432
DB_NAME=neondb
DB_USER=your-username
DB_PASSWORD=your-password
DB_SSL=true

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS - Text.lk
TEXT_LK_API_TOKEN=your-textlk-token
TEXT_LK_API_URL=https://app.text.lk/api/http

# SMS - Twilio (optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_VERIFY_SERVICE_SID=your-verify-service-sid
TWILIO_PHONE_NUMBER=your-twilio-number

# File storage (optional)
FILEBASE_ACCESS_KEY=your-filebase-access-key
FILEBASE_SECRET_KEY=your-filebase-secret-key
FILEBASE_BUCKET=b-trust-customer-photos

# Feature flags (dev only)
BYPASS_PHONE_VERIFICATION=false

# External services
FACE_AUTH_URL=http://localhost:8002
```

### Example `frontend/.env`
```env
REACT_APP_API_URL=http://localhost:5001/api
```

### Example `face-auth/.env`
```env
# Prefer a single URL
NEON_DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require

# Or discrete values
DB_HOST=your-neon-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-username
DB_PASSWORD=your-password
```

Notes:
- After editing `backend/config.env`, restart the backend.
- Keep secrets out of version control; use local `.env` files or a secret manager.



















