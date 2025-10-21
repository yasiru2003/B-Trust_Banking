# B-Trust Banking System - Complete Setup Guide

## 🏦 Project Overview

B-Trust is a comprehensive banking system with both frontend and backend components, designed to manage customers, accounts, transactions, and fraud detection. The system uses PostgreSQL database with Neon hosting and includes role-based authentication.

## 📁 Project Structure

```
B-Trust-Banking/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database configuration
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   ├── utils/              # Utility functions
│   └── scripts/            # Database scripts
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static files
└── .cursor/                # Cursor IDE configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database (Neon recommended)
- Git

### 1. Database Setup

The system is already connected to your Neon database with the following tables:
- `customer` - Customer information
- `savings_account` - Bank accounts
- `transaction` - Financial transactions
- `employee_auth` - Bank employees
- `fraud_detection` - Fraud monitoring
- `branch` - Bank branches
- And more...

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env file with your database credentials
# Get connection details from your Neon dashboard
```

**Environment Variables (.env):**
```env
# Database Configuration
DB_HOST=your-neon-host
DB_PORT=5432
DB_NAME=neondb
DB_USER=your-username
DB_PASSWORD=your-password
DB_SSL=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
```

**Start Backend:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## 🔧 Configuration

### Database Connection

The backend is configured to connect to your Neon PostgreSQL database. Update the `.env` file with your actual database credentials from the Neon dashboard.

### API Endpoints

The backend provides the following main API endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/customers` - Get customers
- `POST /api/customers` - Create customer
- `GET /api/accounts` - Get accounts
- `GET /api/transactions` - Get transactions
- `POST /api/transactions` - Create transaction
- `GET /api/fraud` - Get fraud alerts
- And more...

### Authentication

The system supports three user types:
- **Employee** (Agent/Manager) - Bank staff
- **Customer** - Banking clients
- **User** - General users

## 🎨 Frontend Features

### Modern UI Components
- Responsive design with Tailwind CSS
- Dark/Light theme support
- Role-based navigation
- Real-time notifications
- Interactive dashboards

### Key Pages
- **Dashboard** - Overview and statistics
- **Customers** - Customer management
- **Accounts** - Account management
- **Transactions** - Transaction processing
- **Fraud Detection** - Security monitoring
- **Reports** - Analytics and reporting

## 🔐 Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- SQL injection protection

## 📊 Database Schema

The system includes 23 tables covering:
- Customer management
- Account operations
- Transaction processing
- Employee management
- Fraud detection
- Audit logging
- OTP verification

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Backend Deployment
1. Set up production environment variables
2. Build the application
3. Deploy to your preferred hosting service (Heroku, Railway, etc.)

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred hosting service

## 🔍 Development

### Adding New Features

1. **Backend**: Add new routes in `backend/routes/`
2. **Frontend**: Add new pages in `frontend/src/pages/`
3. **Database**: Create migrations for schema changes

### Code Structure

- **Models**: Database interaction layer
- **Routes**: API endpoint definitions
- **Middleware**: Authentication and validation
- **Components**: Reusable UI components
- **Context**: State management
- **Services**: API communication

## 📱 Demo Credentials

For testing purposes, you can use these demo credentials:

- **Employee**: employee@bt.com / password123
- **Customer**: customer@bt.com / password123
- **User**: user@bt.com / password123

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection**: Verify your Neon credentials
2. **CORS Errors**: Check frontend URL in backend .env
3. **Authentication**: Ensure JWT secret is set
4. **Port Conflicts**: Change ports if 3000/5000 are in use

### Logs

- Backend logs: Check console output
- Frontend logs: Check browser developer tools
- Database logs: Check Neon dashboard

## 📈 Performance

- Database connection pooling
- Query optimization
- Frontend code splitting
- Image optimization
- Caching strategies

## 🔄 Updates

To update the system:

1. Pull latest changes: `git pull`
2. Update dependencies: `npm update`
3. Run migrations if needed
4. Restart services

## 📞 Support

For issues or questions:
1. Check the logs
2. Review the documentation
3. Check database connectivity
4. Verify environment variables

## 🎯 Next Steps

1. **Complete Implementation**: Finish remaining features
2. **Testing**: Add comprehensive tests
3. **Security**: Implement additional security measures
4. **Performance**: Optimize database queries
5. **Monitoring**: Add logging and monitoring
6. **Documentation**: Complete API documentation

---

## 🏁 Getting Started Checklist

- [ ] Clone the repository
- [ ] Set up Neon database
- [ ] Configure backend environment
- [ ] Install backend dependencies
- [ ] Start backend server
- [ ] Install frontend dependencies
- [ ] Start frontend development server
- [ ] Test authentication
- [ ] Explore the dashboard
- [ ] Create test data

**Happy Banking! 🏦✨**






























