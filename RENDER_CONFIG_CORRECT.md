# 🎯 Correct Render Configuration

## ✅ **Correct Settings:**

### **Build & Deploy:**
```
Build Command: npm run build
Start Command: npm start
```

### **Environment Variables:**
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

## ❌ **Wrong Settings (Current):**
```
Build Command: npm run build
Start Command: npm run dev  ← WRONG!
```

## 🔧 **Fix Steps:**
1. Go to Render service settings
2. Change Start Command from `npm run dev` to `npm start`
3. Add environment variables above
4. Save and redeploy

**This will fix all the memory and deployment issues!** 🚀
