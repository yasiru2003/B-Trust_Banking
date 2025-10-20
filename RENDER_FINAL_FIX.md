# 🚨 CRITICAL: Render Start Command Fix

## ❌ **Current Problem:**
Render is running `npm run dev` instead of `npm start`, causing:
- React development server running in production (memory issues)
- nodemon not found error
- JavaScript heap out of memory
- Wrong behavior for production deployment

## ✅ **URGENT FIX NEEDED:**

### **Step 1: Update Render Service Settings**

1. **Go to [render.com](https://render.com)**
2. **Click on your `b-trust` service**
3. **Go to "Settings" tab**
4. **Scroll to "Build & Deploy" section**
5. **CRITICAL: Update these settings:**

```
Build Command: npm run build
Start Command: npm start
```

**NOT:**
```
Build Command: npm run build
Start Command: npm run dev  ← THIS IS WRONG!
```

### **Step 2: Add Environment Variables**

In the "Environment" tab, add:

```
NODE_ENV=production
PORT=10000
REACT_APP_API_URL=https://b-trust.onrender.com
GENERATE_SOURCEMAP=false
DB_HOST=ep-dawn-frost-adjj0va4-pooler.c-2.us-east-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=npg_VgG1XjmFtI5D
DB_SSL=true
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=24h
```

### **Step 3: Save and Redeploy**

1. **Click "Save Changes"**
2. **Go to "Deploys" tab**
3. **Click "Manual Deploy" → "Deploy latest commit"**

## 🎯 **Expected Result:**

```
==> Build successful 🎉
==> Deploying...
==> Running 'npm start'  ← CORRECT!
> b-trust-banking@1.0.0 start
> cd backend && npm start
> b-trust-backend@1.0.0 start
> node server.js
Server running on port 10000
```

## 🚨 **Why This Fixes Everything:**

- ✅ **No more development server** - Uses built static files
- ✅ **No more nodemon** - Uses production Node.js
- ✅ **No more memory issues** - Serves static files efficiently
- ✅ **Correct production behavior** - Backend serves frontend

**This is the critical fix that will make your app work properly!** 🚀
