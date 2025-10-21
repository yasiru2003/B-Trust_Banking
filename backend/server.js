const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
require('dotenv').config({ path: './config.env' });

const db = require('./config/database');
const FDMaturityScheduler = require('./services/fdMaturityScheduler');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const employeeRoutes = require('./routes/employees');
const branchRoutes = require('./routes/branches');
const otpRoutes = require('./routes/otp');
const faceRoutes = require('./routes/face');
const sessionRoutes = require('./routes/sessions');
const dashboardRoutes = require('./routes/dashboard');
const activityAuditRoutes = require('./routes/activityAudit');
const { sessionMiddleware } = require('./middleware/sessionManager');
const notificationRoutes = require('./routes/notifications');
const FraudWebSocketServer = require('./services/fraudWebSocket');

const app = express();
const PORT = process.env.PORT || 5001;

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Static file serving will be added after API routes

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting (TEMPORARILY DISABLED FOR TESTING)
// TODO: Re-enable in production for security
/*
if (process.env.NODE_ENV !== 'development') {
  // General API rate limiter - more lenient
  const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased from 100 to 500
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiter for auth endpoints to prevent brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 login attempts per 15 minutes
    message: 'Too many authentication attempts from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  });

  // Apply auth limiter only to login/register endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  
  // Apply general limiter to all other API routes
  app.use('/api/', generalLimiter);
} else {
  console.log('⚠️  Rate limiting disabled in development mode');
}
*/
console.log('⚠️  Rate limiting DISABLED for testing - Remember to re-enable for production!');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management middleware
app.use(sessionMiddleware);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Test Filebase connection endpoint
app.get('/test-filebase', async (req, res) => {
  try {
    const filebaseService = require('./services/filebaseService');
    const result = await filebaseService.testConnection();
    res.json({
      success: result.success,
      message: result.message || result.error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Filebase connection test failed',
      error: error.message
    });
  }
});

// API Routes
console.log('🔗 Registering API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/manager', require('./routes/manager'));
app.use('/api/fixed-deposits', require('./routes/fixed-deposits-simple'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/transaction-otp', require('./routes/transaction-otp'));
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/fraud', require('./routes/fraud'));
app.use('/api/fraud-detection', require('./routes/fraudDetection'));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/activity-audit', activityAuditRoutes);
console.log('✅ API routes registered successfully');

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Serve static files from the React app build directory (AFTER API routes)
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await db.testConnection();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('⚠️  Database connection failed:', error.message);
    console.log('⚠️  Starting server anyway - database operations may fail');
  }

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server for fraud monitoring
  const fraudWS = new FraudWebSocketServer(server);
  console.log('🔍 Fraud monitoring WebSocket server initialized');

  // Initialize FD Maturity Scheduler
  const fdScheduler = new FDMaturityScheduler();
  fdScheduler.start();
  console.log('📅 FD Maturity Scheduler initialized');

  // Start server regardless of database status
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws/fraud`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

startServer();
