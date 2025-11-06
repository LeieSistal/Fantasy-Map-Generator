"use strict";

/**
 * Path Caching System
 * Caches computed SVG path strings to avoid expensive recalculation
 * Version: 1.0.0
 */

window.PathCache = (function() {

  // Cache storage
  const cache = {
    features: new Map(),      // feature.i -> path string
    borders: new Map(),       // border key -> path string
    rivers: new Map(),        // river.i -> path string
    routes: new Map(),        // route key -> path string
    metadata: {
      hits: 0,
      misses: 0,
      size: 0,
      created: Date.now(),
      lastCleared: Date.now()
    }
  };

  // Cache configuration
  const config = {
    enabled: true,
    maxSize: 50 * 1024 * 1024,  // 50 MB max cache size
    ttl: 30 * 60 * 1000,         // 30 minutes TTL
    autoClean: true
  };

  // Versioning to track map changes
  let cacheVersion = 0;

  /**
   * Generate cache key for borders
   */
  function getBorderKey(type, fromCell, toCell) {
    return `${type}-${fromCell}-${toCell}`;
  }

  /**
   * Get cached feature path
   */
  function getFeaturePath(featureId) {
    if (!config.enabled) return null;

    const cached = cache.features.get(featureId);
    if (cached && cached.version === cacheVersion) {
      cache.metadata.hits++;
      return cached.path;
    }

    cache.metadata.misses++;
    return null;
  }

  /**
   * Set feature path in cache
   */
  function setFeaturePath(featureId, path) {
    if (!config.enabled) return;

    cache.features.set(featureId, {
      path,
      version: cacheVersion,
      size: path.length * 2, // Approximate bytes
      timestamp: Date.now()
    });

    updateCacheSize();
  }

  /**
   * Get cached border path
   */
  function getBorderPath(type, fromCell, toCell) {
    if (!config.enabled) return null;

    const key = getBorderKey(type, fromCell, toCell);
    const cached = cache.borders.get(key);

    if (cached && cached.version === cacheVersion) {
      cache.metadata.hits++;
      return cached.path;
    }

    cache.metadata.misses++;
    return null;
  }

  /**
   * Set border path in cache
   */
  function setBorderPath(type, fromCell, toCell, path) {
    if (!config.enabled) return;

    const key = getBorderKey(type, fromCell, toCell);
    cache.borders.set(key, {
      path,
      version: cacheVersion,
      size: path.length * 2,
      timestamp: Date.now()
    });

    updateCacheSize();
  }

  /**
   * Get cached river path
   */
  function getRiverPath(riverId) {
    if (!config.enabled) return null;

    const cached = cache.rivers.get(riverId);
    if (cached && cached.version === cacheVersion) {
      cache.metadata.hits++;
      return cached.path;
    }

    cache.metadata.misses++;
    return null;
  }

  /**
   * Set river path in cache
   */
  function setRiverPath(riverId, path) {
    if (!config.enabled) return;

    cache.rivers.set(riverId, {
      path,
      version: cacheVersion,
      size: path.length * 2,
      timestamp: Date.now()
    });

    updateCacheSize();
  }

  /**
   * Get cached route path
   */
  function getRoutePath(routeId) {
    if (!config.enabled) return null;

    const cached = cache.routes.get(routeId);
    if (cached && cached.version === cacheVersion) {
      cache.metadata.hits++;
      return cached.path;
    }

    cache.metadata.misses++;
    return null;
  }

  /**
   * Set route path in cache
   */
  function setRoutePath(routeId, path) {
    if (!config.enabled) return;

    cache.routes.set(routeId, {
      path,
      version: cacheVersion,
      size: path.length * 2,
      timestamp: Date.now()
    });

    updateCacheSize();
  }

  /**
   * Invalidate entire cache (e.g., when map regenerated)
   */
  function invalidate() {
    cacheVersion++;
    console.log(`🗑️  Path cache invalidated (version: ${cacheVersion})`);

    // Optionally clear old versions to free memory
    if (config.autoClean) {
      setTimeout(cleanOldVersions, 100);
    }
  }

  /**
   * Clear all caches
   */
  function clear() {
    cache.features.clear();
    cache.borders.clear();
    cache.rivers.clear();
    cache.routes.clear();

    cache.metadata.size = 0;
    cache.metadata.lastCleared = Date.now();

    console.log('🗑️  Path cache cleared');
  }

  /**
   * Clean old versions from cache
   */
  function cleanOldVersions() {
    const currentVersion = cacheVersion;
    let removed = 0;

    // Clean features
    for (const [key, value] of cache.features.entries()) {
      if (value.version < currentVersion) {
        cache.features.delete(key);
        removed++;
      }
    }

    // Clean borders
    for (const [key, value] of cache.borders.entries()) {
      if (value.version < currentVersion) {
        cache.borders.delete(key);
        removed++;
      }
    }

    // Clean rivers
    for (const [key, value] of cache.rivers.entries()) {
      if (value.version < currentVersion) {
        cache.rivers.delete(key);
        removed++;
      }
    }

    // Clean routes
    for (const [key, value] of cache.routes.entries()) {
      if (value.version < currentVersion) {
        cache.routes.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned ${removed} old cache entries`);
      updateCacheSize();
    }
  }

  /**
   * Clean expired entries (based on TTL)
   */
  function cleanExpired() {
    const now = Date.now();
    const ttl = config.ttl;
    let removed = 0;

    const cleanMap = (map) => {
      for (const [key, value] of map.entries()) {
        if (now - value.timestamp > ttl) {
          map.delete(key);
          removed++;
        }
      }
    };

    cleanMap(cache.features);
    cleanMap(cache.borders);
    cleanMap(cache.rivers);
    cleanMap(cache.routes);

    if (removed > 0) {
      console.log(`🧹 Cleaned ${removed} expired cache entries`);
      updateCacheSize();
    }
  }

  /**
   * Update total cache size
   */
  function updateCacheSize() {
    let totalSize = 0;

    const sumSizes = (map) => {
      for (const value of map.values()) {
        totalSize += value.size || 0;
      }
    };

    sumSizes(cache.features);
    sumSizes(cache.borders);
    sumSizes(cache.rivers);
    sumSizes(cache.routes);

    cache.metadata.size = totalSize;

    // If over max size, trigger cleanup
    if (totalSize > config.maxSize) {
      console.warn('⚠️  Cache size exceeded, cleaning...');
      cleanLRU();
    }
  }

  /**
   * Clean least recently used entries
   */
  function cleanLRU() {
    // Collect all entries with timestamps
    const allEntries = [];

    const collectEntries = (map, type) => {
      for (const [key, value] of map.entries()) {
        allEntries.push({
          type,
          key,
          timestamp: value.timestamp,
          size: value.size
        });
      }
    };

    collectEntries(cache.features, 'features');
    collectEntries(cache.borders, 'borders');
    collectEntries(cache.rivers, 'rivers');
    collectEntries(cache.routes, 'routes');

    // Sort by timestamp (oldest first)
    allEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries until under max size
    let currentSize = cache.metadata.size;
    let removed = 0;

    for (const entry of allEntries) {
      if (currentSize <= config.maxSize * 0.8) break; // Target 80% of max

      cache[entry.type].delete(entry.key);
      currentSize -= entry.size;
      removed++;
    }

    console.log(`🧹 LRU cleanup: removed ${removed} entries`);
    updateCacheSize();
  }

  /**
   * Get cache statistics
   */
  function getStats() {
    const hitRate = cache.metadata.hits + cache.metadata.misses > 0
      ? (cache.metadata.hits / (cache.metadata.hits + cache.metadata.misses) * 100).toFixed(1)
      : 0;

    return {
      enabled: config.enabled,
      version: cacheVersion,
      entries: {
        features: cache.features.size,
        borders: cache.borders.size,
        rivers: cache.rivers.size,
        routes: cache.routes.size,
        total: cache.features.size + cache.borders.size + cache.rivers.size + cache.routes.size
      },
      size: {
        bytes: cache.metadata.size,
        mb: (cache.metadata.size / (1024 * 1024)).toFixed(2),
        maxMB: (config.maxSize / (1024 * 1024)).toFixed(0)
      },
      performance: {
        hits: cache.metadata.hits,
        misses: cache.metadata.misses,
        hitRate: hitRate + '%'
      },
      age: {
        created: new Date(cache.metadata.created).toLocaleString(),
        lastCleared: new Date(cache.metadata.lastCleared).toLocaleString()
      }
    };
  }

  /**
   * Log statistics to console
   */
  function logStats() {
    const stats = getStats();

    console.log('\n📊 PATH CACHE STATISTICS');
    console.log('════════════════════════════════════');
    console.log(`Status: ${stats.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Version: ${stats.version}`);
    console.log('\nEntries:');
    console.log(`  Features: ${stats.entries.features.toLocaleString()}`);
    console.log(`  Borders: ${stats.entries.borders.toLocaleString()}`);
    console.log(`  Rivers: ${stats.entries.rivers.toLocaleString()}`);
    console.log(`  Routes: ${stats.entries.routes.toLocaleString()}`);
    console.log(`  Total: ${stats.entries.total.toLocaleString()}`);
    console.log('\nSize:');
    console.log(`  ${stats.size.mb} MB / ${stats.size.maxMB} MB`);
    console.log('\nPerformance:');
    console.log(`  Hits: ${stats.performance.hits.toLocaleString()}`);
    console.log(`  Misses: ${stats.performance.misses.toLocaleString()}`);
    console.log(`  Hit Rate: ${stats.performance.hitRate}`);
    console.log('════════════════════════════════════\n');
  }

  /**
   * Enable cache
   */
  function enable() {
    config.enabled = true;
    console.log('✅ Path cache enabled');
  }

  /**
   * Disable cache
   */
  function disable() {
    config.enabled = false;
    console.log('❌ Path cache disabled');
  }

  /**
   * Configure cache
   */
  function configure(options) {
    Object.assign(config, options);
    console.log('⚙️  Path cache configured:', config);
  }

  /**
   * Export cache to JSON (for debugging)
   */
  function exportCache() {
    const data = {
      version: cacheVersion,
      config,
      metadata: cache.metadata,
      entries: {
        features: cache.features.size,
        borders: cache.borders.size,
        rivers: cache.rivers.size,
        routes: cache.routes.size
      }
    };

    return JSON.stringify(data, null, 2);
  }

  // Auto-cleanup interval
  if (config.autoClean) {
    setInterval(() => {
      cleanExpired();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Public API
  return {
    // Feature paths
    getFeaturePath,
    setFeaturePath,

    // Border paths
    getBorderPath,
    setBorderPath,

    // River paths
    getRiverPath,
    setRiverPath,

    // Route paths
    getRoutePath,
    setRoutePath,

    // Cache management
    invalidate,
    clear,
    cleanOldVersions,
    cleanExpired,

    // Configuration
    enable,
    disable,
    configure,

    // Statistics
    getStats,
    logStats,
    exportCache,

    // Direct access (for debugging)
    _cache: cache,
    _config: config
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.pathCache = window.PathCache;
}

console.log('✅ Path Cache System loaded. Use: pathCache.logStats()');
