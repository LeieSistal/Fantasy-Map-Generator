"use strict";

/**
 * Relief Rendering Optimizer
 * Coordinates performance optimizations for relief and heightmap rendering
 * Version: 1.0.0
 */

window.ReliefOptimizer = (function() {

  // Performance statistics
  const stats = {
    reliefRenderCount: 0,
    heightmapRenderCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalRenderTime: 0,
    lastRenderTime: 0
  };

  /**
   * Clear all rendering caches
   * Call this when map is regenerated or data changes
   */
  function clearAllCaches() {
    // Clear relief icons cache
    if (typeof reliefIconsCache !== 'undefined') {
      reliefIconsCache.clear();
      console.log('✅ Relief icons cache cleared');
    }

    // Clear heightmap cache
    if (typeof heightmapCache !== 'undefined') {
      heightmapCache.clear();
      console.log('✅ Heightmap cache cleared');
    }

    // Mark canvas as dirty
    if (window.CanvasRenderer) {
      CanvasRenderer.markDirty();
    }

    console.log('🧹 All relief rendering caches cleared');
  }

  /**
   * Configure relief rendering performance settings
   */
  function configure(options = {}) {
    const config = {
      useProgressiveRendering: options.useProgressiveRendering ?? null, // null = auto
      chunkSize: options.chunkSize ?? 100,
      useCanvasRendering: options.useCanvasRendering ?? false,
      throttleMs: options.throttleMs ?? 16
    };

    // Apply relief render config
    if (typeof reliefRenderConfig !== 'undefined') {
      reliefRenderConfig.useProgressive = config.useProgressiveRendering;
      reliefRenderConfig.chunkSize = config.chunkSize;
    }

    // Enable/disable canvas rendering
    if (window.CanvasRenderer) {
      if (config.useCanvasRendering) {
        CanvasRenderer.enable();
      } else {
        CanvasRenderer.disable();
      }
    }

    console.log('⚙️  Relief optimizer configured:', config);
    return config;
  }

  /**
   * Get performance statistics
   */
  function getStats() {
    return { ...stats };
  }

  /**
   * Reset statistics
   */
  function resetStats() {
    stats.reliefRenderCount = 0;
    stats.heightmapRenderCount = 0;
    stats.cacheHits = 0;
    stats.cacheMisses = 0;
    stats.totalRenderTime = 0;
    stats.lastRenderTime = 0;
    console.log('📊 Statistics reset');
  }

  /**
   * Log current performance status
   */
  function logStatus() {
    console.log('\n⚡ RELIEF OPTIMIZER STATUS');
    console.log('═══════════════════════════════════');
    console.log('Relief Renders:', stats.reliefRenderCount);
    console.log('Heightmap Renders:', stats.heightmapRenderCount);
    console.log('Cache Hits:', stats.cacheHits);
    console.log('Cache Misses:', stats.cacheMisses);
    console.log('Total Render Time:', stats.totalRenderTime.toFixed(2), 'ms');
    console.log('Last Render Time:', stats.lastRenderTime.toFixed(2), 'ms');

    if (typeof reliefRenderConfig !== 'undefined') {
      console.log('\nConfiguration:');
      console.log('  Progressive Rendering:', reliefRenderConfig.useProgressive === null ? 'Auto' : reliefRenderConfig.useProgressive);
      console.log('  Chunk Size:', reliefRenderConfig.chunkSize);
    }

    if (window.CanvasRenderer) {
      const canvasConfig = CanvasRenderer.getConfig();
      console.log('  Canvas Rendering:', canvasConfig.enabled ? 'Enabled' : 'Disabled');
    }

    console.log('═══════════════════════════════════\n');
  }

  /**
   * Enable all optimizations (recommended for large maps)
   */
  function enableAll() {
    configure({
      useProgressiveRendering: true,
      useCanvasRendering: true,
      chunkSize: 100
    });
    console.log('✅ All optimizations enabled');
  }

  /**
   * Disable all optimizations (for debugging or small maps)
   */
  function disableAll() {
    configure({
      useProgressiveRendering: false,
      useCanvasRendering: false
    });
    console.log('❌ All optimizations disabled');
  }

  /**
   * Auto-configure based on map size
   */
  function autoOptimize() {
    if (typeof pack === 'undefined' || !pack.cells) {
      console.warn('Cannot auto-optimize: pack.cells not available');
      return;
    }

    const cellCount = pack.cells.i.length;
    console.log(`🔍 Auto-optimizing for ${cellCount} cells...`);

    if (cellCount > 5000) {
      // Large map: enable all optimizations
      configure({
        useProgressiveRendering: true,
        useCanvasRendering: true,
        chunkSize: 150
      });
      console.log('✅ Large map detected: All optimizations enabled');
    } else if (cellCount > 2000) {
      // Medium map: enable progressive rendering only
      configure({
        useProgressiveRendering: true,
        useCanvasRendering: false,
        chunkSize: 100
      });
      console.log('✅ Medium map detected: Progressive rendering enabled');
    } else {
      // Small map: disable optimizations
      configure({
        useProgressiveRendering: false,
        useCanvasRendering: false
      });
      console.log('✅ Small map detected: Standard rendering');
    }
  }

  // Public API
  return {
    clearAllCaches,
    configure,
    getStats,
    resetStats,
    logStatus,
    enableAll,
    disableAll,
    autoOptimize
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.reliefOptimizer = window.ReliefOptimizer;
}

console.log('✅ Relief Optimizer loaded. Use: reliefOptimizer.autoOptimize()');
