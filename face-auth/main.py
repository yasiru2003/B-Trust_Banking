import os, base64, numpy as np, json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import cv2, mediapipe as mp
from sklearn.metrics.pairwise import cosine_similarity
import psycopg

DB_DSN = os.getenv("NEON_DATABASE_URL") or \
         f"host={os.getenv('DB_HOST')} port={os.getenv('DB_PORT','5432')} dbname={os.getenv('DB_NAME')} user={os.getenv('DB_USER')} password={os.getenv('DB_PASSWORD')} sslmode=require"

app = FastAPI(title="B-Trust Face Auth", version="1.0")
mp_face_mesh = mp.solutions.face_mesh

class EnrollPayload(BaseModel):
    employee_id: str
    image1_b64: str
    image2_b64: str

class VerifyPayload(BaseModel):
    employee_id: str
    image1_b64: str
    image2_b64: str

def decode_img(b64: str):
    try:
        arr = np.frombuffer(base64.b64decode(b64), np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None: raise ValueError
        return img
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

def embedding(img):
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5) as mesh:
        res = mesh.process(img_rgb)
        if not res.multi_face_landmarks:
            return None
        lm = res.multi_face_landmarks[0].landmark
        pts = np.array([[p.x, p.y, p.z] for p in lm], dtype=np.float32)
        mean = pts.mean(0, keepdims=True); std = pts.std(0, keepdims=True) + 1e-6
        return ((pts - mean) / std).flatten()

def movement(a, b): return float(np.linalg.norm(a - b))

def upsert_embedding(employee_id: str, emb: np.ndarray):
    with psycopg.connect(DB_DSN) as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO face_embeddings (employee_id, embedding)
            VALUES (%s, %s)
            ON CONFLICT (employee_id) DO UPDATE
            SET embedding = EXCLUDED.embedding, updated_at = NOW()
            """,
            (employee_id, json.dumps(emb.tolist()))
        )

def fetch_embedding(employee_id: str):
    with psycopg.connect(DB_DSN) as conn, conn.cursor() as cur:
        cur.execute("SELECT embedding FROM face_embeddings WHERE employee_id = %s", (employee_id,))
        row = cur.fetchone()
        if not row: return None
        return np.array(row[0], dtype=np.float32)

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/enroll")
def enroll(p: EnrollPayload):
    e1, e2 = embedding(decode_img(p.image1_b64)), embedding(decode_img(p.image2_b64))
    if e1 is None or e2 is None: raise HTTPException(400, "Face not detected")
    delta = movement(e1, e2)
    if delta < 0.02: raise HTTPException(400, "Insufficient movement")
    avg = (e1 + e2) / 2.0
    upsert_embedding(p.employee_id, avg.astype(np.float32))
    return {"success": True, "delta": delta}

@app.post("/verify")
def verify(p: VerifyPayload):
    stored = fetch_embedding(p.employee_id)
    if stored is None: raise HTTPException(404, "Employee not enrolled")
    e1, e2 = embedding(decode_img(p.image1_b64)), embedding(decode_img(p.image2_b64))
    if e1 is None or e2 is None: raise HTTPException(400, "Face not detected")
    delta = movement(e1, e2)
    if delta < 0.01: raise HTTPException(400, "Insufficient movement")
    if delta > 0.35: raise HTTPException(400, "Too much movement; retry")
    avg = (e1 + e2) / 2.0
    sim = float(cosine_similarity([stored], [avg])[0][0])
    return {"success": sim >= 0.80, "similarity": sim, "delta": delta}





















