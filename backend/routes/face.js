const express = require('express');
const router = express.Router();

const FACE_AUTH_URL = process.env.FACE_AUTH_URL || 'http://localhost:8002';

router.post('/enroll', async (req, res) => {
  try {
    const r = await fetch(`${FACE_AUTH_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Face enroll failed' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const r = await fetch(`${FACE_AUTH_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Face verify failed' });
  }
});

module.exports = router;


