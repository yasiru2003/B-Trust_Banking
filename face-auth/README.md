# B-Trust Face Authentication Service

A Python FastAPI microservice for two-step face recognition using MediaPipe FaceMesh.

## Features

- **Two-step enrollment**: Capture two images with movement detection for liveness
- **Two-step verification**: Verify identity with movement-based liveness check
- **MediaPipe FaceMesh**: Uses Google's MediaPipe for face landmark detection
- **Cosine similarity**: Compares face embeddings using scikit-learn
- **PostgreSQL storage**: Stores face embeddings in Neon database
- **Liveness detection**: Basic movement delta to prevent photo spoofing

## Setup

### 1. Install Python Dependencies

```bash
cd face-auth
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 2. Environment Variables

Set your Neon database connection:

```bash
# Option 1: Full connection string
set NEON_DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require

# Option 2: Individual components
set DB_HOST=your-neon-host
set DB_PORT=5432
set DB_NAME=your-db-name
set DB_USER=your-username
set DB_PASSWORD=your-password
```

### 3. Run the Service

```bash
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

Service will be available at: `http://localhost:8002`

## API Endpoints

### Health Check
```
GET /health
```

### Enroll Face
```
POST /enroll
{
  "employee_id": "AGENT001",
  "image1_b64": "base64_encoded_image_1",
  "image2_b64": "base64_encoded_image_2"
}
```

### Verify Face
```
POST /verify
{
  "employee_id": "AGENT001", 
  "image1_b64": "base64_encoded_image_1",
  "image2_b64": "base64_encoded_image_2"
}
```

## Integration with Backend

The Node.js backend proxies requests to this service via `/api/face/*` endpoints:

- `POST /api/face/enroll` → `POST http://localhost:8002/enroll`
- `POST /api/face/verify` → `POST http://localhost:8002/verify`

## Database Schema

The service uses the `face_embeddings` table:

```sql
CREATE TABLE face_embeddings (
  employee_id VARCHAR(32) PRIMARY KEY,
  embedding JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Liveness Detection

- **Enrollment**: Requires movement delta > 0.02 between two captures
- **Verification**: Requires movement delta between 0.01 and 0.35
- **Similarity threshold**: 0.80 cosine similarity for verification

## Testing

Test the service directly:

```bash
# Health check
curl http://localhost:8002/health

# Enroll (replace with actual base64 images)
curl -X POST http://localhost:8002/enroll \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"AGENT001","image1_b64":"...","image2_b64":"..."}'

# Verify
curl -X POST http://localhost:8002/verify \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"AGENT001","image1_b64":"...","image2_b64":"..."}'
```

Or test via backend proxy:

```bash
# Via backend (requires authentication)
curl -X POST http://localhost:5001/api/face/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"employee_id":"AGENT001","image1_b64":"...","image2_b64":"..."}'
```




























