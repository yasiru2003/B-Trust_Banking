const NodeCache = require('node-cache');

// Create cache instance with 5-minute default TTL
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Don't clone objects for better performance
});

// Cache middleware
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query params
    const cacheKey = `${req.originalUrl}:${JSON.stringify(req.query)}`;
    
    // Check if data exists in cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for: ${cacheKey}`);
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data) {
      // Cache the response data
      cache.set(cacheKey, data, ttl);
      console.log(`Cache set for: ${cacheKey} (TTL: ${ttl}s)`);
      
      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Clear cache for specific patterns
const clearCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  
  if (matchingKeys.length > 0) {
    cache.del(matchingKeys);
    console.log(`Cleared ${matchingKeys.length} cache entries matching: ${pattern}`);
  }
};

// Clear all cache
const clearAllCache = () => {
  cache.flushAll();
  console.log('All cache cleared');
};

module.exports = {
  cacheMiddleware,
  clearCache,
  clearAllCache,
  cache
};

