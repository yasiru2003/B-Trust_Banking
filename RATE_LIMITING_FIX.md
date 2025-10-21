# Rate Limiting Fix Documentation

## Problem Overview

The application was experiencing HTTP 429 "Too Many Requests" errors when users tried to authenticate. This was caused by aggressive rate limiting on the backend that was blocking legitimate user requests.

### Symptoms
- Error message: "Too many requests from this IP, please try again later."
- HTTP Status Code: 429
- Occurs during login attempts and auth verification
- Users unable to access the application

## Root Cause

The backend server had rate limiting configured to allow only **100 requests per 15 minutes** per IP address for ALL API endpoints. This was too restrictive because:

1. **Frontend auth checks**: On page load, the frontend automatically checks authentication status by calling `/api/auth/verify-token` and potentially `/api/auth/refresh-token`
2. **Multiple tabs/refreshes**: Users with multiple tabs or frequent page refreshes quickly hit the limit
3. **Shared IPs**: Users behind NAT or proxy servers share the same IP address
4. **Normal app usage**: A typical dashboard session can make 50-100+ API calls easily

## Solution Implemented

### 1. Backend Rate Limiting Improvements

**File: `backend/server.js`**

We implemented a two-tier rate limiting strategy:

#### General API Rate Limiter (Lenient)
- **Limit**: 500 requests per 15 minutes (increased from 100)
- **Applies to**: All `/api/*` endpoints except login/register
- **Purpose**: Allow normal application usage without blocking legitimate requests

```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Authentication Rate Limiter (Strict)
- **Limit**: 50 login attempts per 15 minutes
- **Applies to**: `/api/auth/login` and `/api/auth/register` only
- **Special feature**: `skipSuccessfulRequests: true` - only failed login attempts count
- **Purpose**: Prevent brute force attacks while allowing normal auth operations

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per window
  message: 'Too many authentication attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});
```

### 2. Frontend Error Handling

**Files Modified:**
- `frontend/src/context/AuthContext.js`
- `frontend/src/services/authService.js`

#### AuthContext Improvements

**Rate Limit Handling in Auth Check:**
```javascript
// Handle rate limiting - keep token and try again later
if (error.response?.status === 429) {
  console.warn('Rate limit hit during auth check. Keeping token for later verification.');
  // Don't remove token, just set loading to false
  dispatch({ type: 'LOGIN_FAILURE' });
  toast.error('Too many requests. Please wait a moment before trying again.');
  return;
}
```

**Rate Limit Handling in Login:**
```javascript
// Handle rate limiting specifically
if (error.response?.status === 429) {
  const message = 'Too many login attempts. Please wait 15 minutes before trying again.';
  toast.error(message);
  return { success: false, message, rateLimited: true };
}
```

#### authService Improvements

**Prevent redirects on rate limiting:**
```javascript
// Handle rate limiting - don't try to refresh or redirect
if (error.response?.status === 429) {
  console.warn('Rate limit exceeded. Please wait before making more requests.');
  return Promise.reject(error);
}
```

**Prevent redirect during refresh errors:**
```javascript
// Don't redirect on rate limit errors during refresh
if (refreshError.response?.status !== 429) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

### 3. Environment Configuration

Updated rate limiting configuration in all environment files:

**Files Modified:**
- `backend/config.env`
- `backend/env.example`
- `production.env`
- `env.production.example`

**New Configuration:**
```bash
# Rate limiting: 15 minutes window (900000ms), 500 general requests max
# Auth endpoints (login/register) have separate limit of 50 attempts per window
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
```

## Configuration Options

You can adjust rate limiting via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 900000 (15 min) | Time window for rate limiting |
| `RATE_LIMIT_MAX_REQUESTS` | 500 | Max general API requests per window |
| `NODE_ENV` | development | Set to production to enable rate limiting |

**Note**: Authentication endpoints have a hardcoded limit of 50 attempts per window.

## Testing the Fix

### 1. Local Testing (Development Mode)

Rate limiting is **disabled** in development mode. To test locally with rate limiting enabled:

```bash
# In backend/config.env
NODE_ENV=production

# Or set via command line
NODE_ENV=production npm start
```

### 2. Production Testing

After deploying to production:

1. **Test Normal Usage**: 
   - Log in successfully
   - Navigate through different pages
   - Verify no rate limit errors appear

2. **Test Rate Limiting (Auth)**:
   - Attempt to login with wrong credentials 50+ times
   - Should see rate limit error after 50 failed attempts
   - Successful logins should NOT count toward limit

3. **Test Rate Limiting (General)**:
   - Make 500+ API calls within 15 minutes
   - Should see rate limit error after 500 requests

## Deployment Instructions

### Option 1: Update Environment Variables on Render

1. Log into Render dashboard
2. Navigate to your service
3. Go to **Environment** tab
4. Update/Add these variables:
   ```
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=500
   ```
5. Save and redeploy

### Option 2: Redeploy with Updated Code

```bash
# Commit the changes
git add .
git commit -m "Fix: Improved rate limiting configuration"
git push origin main

# Render will automatically deploy the changes
```

## Monitoring Rate Limits

### Check Rate Limit Headers

When rate limiting is active, responses include these headers:

```
RateLimit-Limit: 500          # Max requests allowed
RateLimit-Remaining: 495      # Requests remaining
RateLimit-Reset: 1640000000   # Timestamp when limit resets
```

### Browser Console Monitoring

The frontend logs rate limit warnings:
```javascript
console.warn('Rate limit exceeded. Please wait before making more requests.');
```

### Backend Logs

In production, you won't see rate limit logs by default. To enable:

```javascript
// In server.js, add to rate limiter config:
skip: (req) => {
  console.log(`Rate limit check: ${req.ip} - ${req.path}`);
  return false;
}
```

## Best Practices

### For Users

1. **Avoid Excessive Refreshing**: Don't spam the refresh button
2. **Close Unused Tabs**: Multiple tabs of the same app count against the limit
3. **Wait After Errors**: If you see a rate limit error, wait 15 minutes

### For Developers

1. **Implement Request Debouncing**: Use debounce for search/filter operations
2. **Cache API Responses**: Don't make redundant API calls
3. **Implement Retry Logic**: With exponential backoff for failed requests
4. **Monitor Rate Limits**: Track rate limit headers in responses
5. **Adjust Limits**: Increase limits if legitimate traffic is blocked

### Recommended: Request Caching

Consider implementing request caching to reduce API calls:

```javascript
// Example: Cache dashboard data for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map();

const fetchWithCache = async (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};
```

## Troubleshooting

### Issue: Still Getting 429 Errors

**Possible Causes:**
1. Using an old cached version of the backend
2. Environment variables not updated on production
3. Multiple users sharing the same IP (VPN/proxy)

**Solutions:**
1. Clear browser cache and hard refresh
2. Verify environment variables on Render
3. Increase `RATE_LIMIT_MAX_REQUESTS` further (e.g., to 1000)
4. Consider per-user rate limiting instead of per-IP

### Issue: Too Many Failed Login Attempts

**Solution:**
The auth rate limiter only counts failed attempts. If you're getting blocked:
1. Wait 15 minutes
2. Use the correct credentials
3. Check if CAPS LOCK is on

### Issue: Rate Limiting Not Working (Security Risk)

**Check:**
1. Verify `NODE_ENV=production` is set
2. Check that rate limiting middleware is loaded before routes
3. Verify `express-rate-limit` package is installed

## Security Considerations

### Current Protection

- ✅ **Brute Force Protection**: 50 failed login attempts per 15 minutes
- ✅ **DDoS Mitigation**: 500 general requests per 15 minutes
- ✅ **Successful Logins Excluded**: Only failed attempts count toward auth limit
- ✅ **IP-based Limiting**: Prevents single attacker from overloading

### Limitations

- ⚠️ **Shared IPs**: Users behind NAT/proxy share rate limits
- ⚠️ **Distributed Attacks**: Attacker using many IPs can bypass limits
- ⚠️ **No Account Lockout**: No permanent account locking mechanism

### Future Improvements

Consider implementing:

1. **Per-User Rate Limiting**: Track by user ID in addition to IP
2. **Progressive Delays**: Increase delay after each failed attempt
3. **Account Lockout**: Temporary lock after X failed attempts
4. **CAPTCHA**: Add CAPTCHA after several failed attempts
5. **Distributed Rate Limiting**: Use Redis for multi-instance deployments

## Related Files

### Backend
- `backend/server.js` - Rate limiting configuration
- `backend/routes/auth.js` - Authentication endpoints
- `backend/config.env` - Development configuration
- `production.env` - Production configuration

### Frontend
- `frontend/src/context/AuthContext.js` - Auth state management
- `frontend/src/services/authService.js` - API client with interceptors

## Additional Resources

- [express-rate-limit Documentation](https://github.com/nfriedly/express-rate-limit)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [Render Environment Variables](https://render.com/docs/environment-variables)

## Support

If you continue experiencing rate limiting issues after applying this fix:

1. Check the browser console for detailed error messages
2. Verify environment variables are correctly set
3. Review server logs for rate limiting patterns
4. Consider increasing limits or implementing per-user limiting
5. Contact support with rate limit headers from failed requests

