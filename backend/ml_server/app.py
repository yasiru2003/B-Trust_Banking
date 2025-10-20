from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import joblib
import requests
from sklearn.ensemble import IsolationForest
from datetime import datetime

MODEL_PATH = "model_iforest.pkl"

app = FastAPI(title="Fraud ML Server", version="0.1.0")


class TrainRequest(BaseModel):
    export_url: str = "http://localhost:5001/api/fraud/export?days=180"
    contamination: float = 0.02
    random_state: int = 42


class ScoreRequest(BaseModel):
    # features should match training feature columns order
    records: List[dict]


def _feature_engineer(df: pd.DataFrame) -> pd.DataFrame:
    # Basic type conversions
    for col in ["amount", "current_balance", "branch_id"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Timestamps
    for col in ["date", "opening_date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # Time features
    if "date" in df.columns:
        df["tx_hour"] = df["date"].dt.hour.fillna(0)
        df["tx_dow"] = df["date"].dt.weekday.fillna(0)
        df["tx_month"] = df["date"].dt.month.fillna(0)
    else:
        df["tx_hour"] = 0
        df["tx_dow"] = 0
        df["tx_month"] = 0

    # Account age in days
    if "opening_date" in df.columns and "date" in df.columns:
        df["acct_age_days"] = (df["date"] - df["opening_date"]).dt.days.fillna(0)
    else:
        df["acct_age_days"] = 0

    # Categorical encodings (simple)
    df["type_dep"] = (df.get("transaction_type_id", "") == "DEP001").astype(int)
    df["type_wit"] = (df.get("transaction_type_id", "") == "WIT001").astype(int)

    # Selected numeric features
    features = [
        "amount",
        "current_balance",
        "branch_id",
        "tx_hour",
        "tx_dow",
        "tx_month",
        "acct_age_days",
        "type_dep",
        "type_wit",
    ]

    # Ensure all present
    for f in features:
        if f not in df.columns:
            df[f] = 0

    return df[features].replace([np.inf, -np.inf], 0).fillna(0)


@app.post("/train")
def train(req: TrainRequest):
    try:
        # Load CSV from export endpoint
        r = requests.get(req.export_url, timeout=60)
        if r.status_code != 200 or not r.text:
            raise HTTPException(status_code=400, detail="Failed to fetch export CSV")

        df = pd.read_csv(pd.compat.StringIO(r.text)) if hasattr(pd.compat, "StringIO") else pd.read_csv(pd.io.common.StringIO(r.text))
        if df.empty:
            raise HTTPException(status_code=400, detail="No data to train")

        X = _feature_engineer(df)
        model = IsolationForest(contamination=req.contamination, random_state=req.random_state)
        model.fit(X)
        joblib.dump({"model": model, "features": list(X.columns)}, MODEL_PATH)
        return {"success": True, "message": "Model trained", "num_rows": int(len(X)), "features": list(X.columns)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/score")
def score(req: ScoreRequest):
    try:
        bundle = joblib.load(MODEL_PATH)
        model: IsolationForest = bundle["model"]
        feat_names: List[str] = bundle["features"]

        df = pd.DataFrame(req.records)
        X = _feature_engineer(df)
        # Align columns
        for f in feat_names:
            if f not in X.columns:
                X[f] = 0
        X = X[feat_names]

        scores = model.score_samples(X)  # higher is less anomalous
        preds = model.predict(X)  # -1 anomalous, 1 normal
        # Convert to anomaly probabilities (simple transform)
        probs = (-scores - min(0, scores.min()))
        if probs.max() > 0:
            probs = probs / probs.max()
        else:
            probs = np.zeros_like(probs)

        results = []
        for i in range(len(df)):
            results.append({
                "anomaly": int(preds[i] == -1),
                "score": float(scores[i]),
                "prob": float(probs[i])
            })
        return {"success": True, "count": len(results), "results": results}
    except FileNotFoundError:
        raise HTTPException(status_code=400, detail="Model not trained. Call /train first.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}















