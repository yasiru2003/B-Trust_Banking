// Simple test to check if routes are working
const express = require('express');
const app = express();

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Auth test route
app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Auth login route working', body: req.body });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
