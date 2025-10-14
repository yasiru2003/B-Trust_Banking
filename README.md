# 🏦 B-Trust Banking System

A comprehensive banking management system built with modern technologies, featuring secure authentication, real-time fraud detection, and a beautiful user interface.

## ✨ Features

### 🔐 Security & Authentication
- JWT-based authentication
- Role-based access control (Employee, Customer, User)
- Password hashing with bcrypt
- OTP verification system
- Session management

### 👥 Customer Management
- Customer registration and profiles
- KYC verification system
- Contact information management
- Customer search and filtering

### 💳 Account Management
- Multiple account types
- Balance tracking
- Account status management
- Account ownership tracking

### 💰 Transaction Processing
- Deposit and withdrawal processing
- Transaction history
- Real-time balance updates
- Transaction validation

### 🛡️ Fraud Detection
- Real-time fraud monitoring
- Severity level classification
- Fraud alert management
- Transaction pattern analysis

### 📊 Analytics & Reporting
- Dashboard with key metrics
- Transaction statistics
- Customer analytics
- Branch performance reports

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (Neon hosting)
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Joi** - Input validation

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **React Query** - Data fetching
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hook Form** - Form handling

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd b-trust-banking
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your database credentials
   npm run dev
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## 📱 Demo Credentials

| User Type | Email | Password |
|-----------|-------|----------|
| Employee | employee@bt.com | password123 |
| Customer | customer@bt.com | password123 |
| User | user@bt.com | password123 |

## 🏗️ Project Structure

```
b-trust-banking/
├── backend/                 # Node.js API server
│   ├── config/             # Database configuration
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   └── utils/              # Utility functions
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   └── services/       # API services
│   └── public/             # Static files
└── docs/                   # Documentation
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
PORT=5000
```

### Database Schema

The system includes 23 tables covering:
- Customer management
- Account operations
- Transaction processing
- Employee management
- Fraud detection
- Audit logging

## 📊 Key Features

### Dashboard
- Real-time statistics
- Recent activity feed
- Quick action buttons
- Role-based content

### Customer Management
- Customer profiles
- KYC status tracking
- Search and filtering
- Bulk operations

### Transaction Processing
- Secure transaction handling
- Balance validation
- Transaction history
- Receipt generation

### Fraud Detection
- Real-time monitoring
- Alert management
- Severity classification
- Investigation workflow

## 🔒 Security

- **Authentication**: JWT tokens with expiration
- **Authorization**: Role-based access control
- **Data Protection**: Password hashing, input validation
- **Rate Limiting**: API request throttling
- **CORS**: Cross-origin resource sharing protection

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Backend
1. Set production environment variables
2. Build and deploy to your hosting service
3. Configure database connection

### Frontend
1. Build the React app: `npm run build`
2. Deploy to Vercel, Netlify, or similar
3. Configure API endpoints

## 📈 Performance

- Database connection pooling
- Query optimization
- Frontend code splitting
- Image optimization
- Caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the setup guide
- Check database connectivity
- Verify environment variables

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics
- [ ] API documentation
- [ ] Automated testing
- [ ] Performance monitoring
- [ ] Multi-language support

---

**Built with ❤️ for secure and reliable banking solutions**
