# 🚀 Render.com Deployment Guide

## Quick Fix for Your Current Issue

The error `==> Publish directory npm start does not exist!` means Render is not configured correctly for your frontend deployment.

## Option 1: Manual Deployment (Recommended)

### Step 1: Deploy Backend
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `b-trust-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

### Step 2: Deploy Frontend
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `b-trust-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/build`
   - **Plan**: Free

## Option 2: Using render.yaml (Advanced)

1. Push the updated `render.yaml` to your repository
2. Go to Render Dashboard
3. Click "New +" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect and use the `render.yaml` file

## Environment Variables Setup

### Backend Environment Variables:
```
NODE_ENV=production
PORT=5001
DB_HOST=ep-dawn-frost-adjj0va4-pooler.c-2.us-east-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=npg_VgG1XjmFtI5D
DB_SSL=true
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://b-trust-frontend.onrender.com
```

### Frontend Environment Variables:
```
REACT_APP_API_URL=https://b-trust-backend.onrender.com
```

## Troubleshooting

### If Frontend Build Fails:
1. Check that `staticPublishPath` is set to `frontend/build`
2. Verify build command is `cd frontend && npm install && npm run build`
3. Make sure `frontend/build` directory exists after build

### If Backend Fails to Start:
1. Check that `startCommand` is `cd backend && npm start`
2. Verify all environment variables are set
3. Check the logs for specific errors

## URLs After Deployment

- **Backend**: `https://b-trust-backend.onrender.com`
- **Frontend**: `https://b-trust-frontend.onrender.com`

## Important Notes

1. **Free Tier Limitations**: 750 hours/month, services sleep after 15 minutes of inactivity
2. **Cold Start**: First request after sleep may take 30+ seconds
3. **Environment Variables**: Update `REACT_APP_API_URL` with your actual backend URL
4. **Database**: Your Neon DB credentials are already configured

## Success Indicators

✅ Backend deploys without errors
✅ Frontend builds successfully (warnings are OK)
✅ Both services show "Live" status
✅ Frontend can communicate with backend

## Next Steps

1. Deploy backend first and get its URL
2. Update frontend environment variables with backend URL
3. Deploy frontend
4. Test the complete application
