"use strict";

/**
 * Level-of-Detail (LOD) System
 * Dynamically adjusts rendering detail based on zoom level
 * Version: 1.0.0
 */

window.LODSystem = (function() {

  // LOD configuration
  const config = {
    enabled: true,
    levels: {
      minimal: {
        name: "Minimal Detail",
        zoomRange: [0, 0.5],
        features: {
          minArea: 1000,           // Only show features > 1000 sq units
          simplification: 2.0       // Aggressive simplification
        },
        labels: {
          density: 0.1,             // Show 10% of labels
          minBurgPopulation: 50000, // Only show major cities
          showStateLabels: true,
          showBurgLabels: false,
          showProvince:Labels: false
        },
        borders: {
          showStateBorders: true,
          showProvinceBorders: false,
          simplification: 1.5
        },
        icons: {
          density: 0.1,
          minSize: 20
        },
        rivers: {
          minFlux: 100,             // Only major rivers
          simplification: 2.0
        },
        routes: {
          showRoads: false,
          showTrails: false,
          showSeaRoutes: true       // Only sea routes at this zoom
        },
        misc: {
          showMarkers: false,
          showMilitary: false,
          showReliefIcons: false,
          showTexture: false
        }
      },

      low: {
        name: "Low Detail",
        zoomRange: [0.5, 1.0],
        features: {
          minArea: 100,
          simplification: 1.0
        },
        labels: {
          density: 0.3,
          minBurgPopulation: 10000,
          showStateLabels: true,
          showBurgLabels: true,
          showProvinceLabels: false
        },
        borders: {
          showStateBorders: true,
          showProvinceBorders: false,
          simplification: 1.0
        },
        icons: {
          density: 0.3,
          minSize: 15
        },
        rivers: {
          minFlux: 50,
          simplification: 1.0
        },
        routes: {
          showRoads: false,
          showTrails: false,
          showSeaRoutes: true
        },
        misc: {
          showMarkers: false,
          showMilitary: false,
          showReliefIcons: false,
          showTexture: true
        }
      },

      medium: {
        name: "Medium Detail",
        zoomRange: [1.0, 2.0],
        features: {
          minArea: 10,
          simplification: 0.5
        },
        labels: {
          density: 0.7,
          minBurgPopulation: 1000,
          showStateLabels: true,
          showBurgLabels: true,
          showProvinceLabels: true
        },
        borders: {
          showStateBorders: true,
          showProvinceBorders: true,
          simplification: 0.5
        },
        icons: {
          density: 0.7,
          minSize: 10
        },
        rivers: {
          minFlux: 30,
          simplification: 0.5
        },
        routes: {
          showRoads: true,
          showTrails: false,
          showSeaRoutes: true
        },
        misc: {
          showMarkers: true,
          showMilitary: true,
          showReliefIcons: true,
          showTexture: true
        }
      },

      high: {
        name: "High Detail",
        zoomRange: [2.0, 5.0],
        features: {
          minArea: 0,              // Show all features
          simplification: 0.3
        },
        labels: {
          density: 1.0,            // Show all labels
          minBurgPopulation: 0,    // Show all settlements
          showStateLabels: true,
          showBurgLabels: true,
          showProvinceLabels: true
        },
        borders: {
          showStateBorders: true,
          showProvinceBorders: true,
          simplification: 0.3
        },
        icons: {
          density: 1.0,
          minSize: 5
        },
        rivers: {
          minFlux: 20,
          simplification: 0.3
        },
        routes: {
          showRoads: true,
          showTrails: true,
          showSeaRoutes: true
        },
        misc: {
          showMarkers: true,
          showMilitary: true,
          showReliefIcons: true,
          showTexture: true
        }
      },

      ultra: {
        name: "Ultra Detail",
        zoomRange: [5.0, Infinity],
        features: {
          minArea: 0,
          simplification: 0.1       // Minimal simplification
        },
        labels: {
          density: 1.0,
          minBurgPopulation: 0,
          showStateLabels: true,
          showBurgLabels: true,
          showProvinceLabels: true
        },
        borders: {
          showStateBorders: true,
          showProvinceBorders: true,
          simplification: 0.1
        },
        icons: {
          density: 1.0,
          minSize: 3
        },
        rivers: {
          minFlux: 10,
          simplification: 0.1
        },
        routes: {
          showRoads: true,
          showTrails: true,
          showSeaRoutes: true
        },
        misc: {
          showMarkers: true,
          showMilitary: true,
          showReliefIcons: true,
          showTexture: true
        }
      }
    }
  };

  // Current state
  let currentLevel = null;
  let lastZoom = 1.0;

  /**
   * Get LOD level for given zoom scale
   */
  function getLevelForZoom(zoom) {
    for (const [levelName, level] of Object.entries(config.levels)) {
      const [min, max] = level.zoomRange;
      if (zoom >= min && zoom < max) {
        return { name: levelName, ...level };
      }
    }
    return { name: 'high', ...config.levels.high }; // Default
  }

  /**
   * Apply LOD settings to rendering
   */
  function applyLOD(zoom) {
    if (!config.enabled) return null;

    const level = getLevelForZoom(zoom);

    // Only reapply if level changed
    if (currentLevel && currentLevel.name === level.name) {
      return currentLevel;
    }

    console.log(`🔍 LOD: Switching to ${level.name} (zoom: ${zoom.toFixed(2)})`);

    currentLevel = level;
    lastZoom = zoom;

    // Update global optimization flags
    if (!window.FMG_OPTIMIZATION_FLAGS) {
      window.FMG_OPTIMIZATION_FLAGS = {};
    }

    Object.assign(window.FMG_OPTIMIZATION_FLAGS, {
      lodLevel: level.name,
      lodSettings: level,
      simplificationTolerance: level.features.simplification
    });

    // Apply visibility settings to SVG layers
    applyLayerVisibility(level);

    return level;
  }

  /**
   * Apply layer visibility based on LOD level
   */
  function applyLayerVisibility(level) {
    const svg = document.getElementById('map');
    if (!svg) return;

    // Borders
    const stateBorders = svg.querySelector('#stateBorders');
    if (stateBorders) {
      stateBorders.style.display = level.borders.showStateBorders ? '' : 'none';
    }

    const provinceBorders = svg.querySelector('#provinceBorders');
    if (provinceBorders) {
      provinceBorders.style.display = level.borders.showProvinceBorders ? '' : 'none';
    }

    // Routes
    const roads = svg.querySelector('#roads');
    if (roads) {
      roads.style.display = level.routes.showRoads ? '' : 'none';
    }

    const trails = svg.querySelector('#trails');
    if (trails) {
      trails.style.display = level.routes.showTrails ? '' : 'none';
    }

    const searoutes = svg.querySelector('#searoutes');
    if (searoutes) {
      searoutes.style.display = level.routes.showSeaRoutes ? '' : 'none';
    }

    // Markers and military
    const markers = svg.querySelector('#markers');
    if (markers) {
      markers.style.display = level.misc.showMarkers ? '' : 'none';
    }

    const military = svg.querySelector('#military');
    if (military) {
      military.style.display = level.misc.showMilitary ? '' : 'none';
    }

    // Relief icons
    const reliefIcons = svg.querySelector('#reliefIcons');
    if (reliefIcons) {
      reliefIcons.style.display = level.misc.showReliefIcons ? '' : 'none';
    }

    // Texture
    const texture = svg.querySelector('#texture');
    if (texture) {
      texture.style.display = level.misc.showTexture ? '' : 'none';
    }
  }

  /**
   * Filter features based on LOD level
   */
  function shouldRenderFeature(feature, level) {
    if (!config.enabled) return true;
    if (!level) level = currentLevel;
    if (!level) return true;

    // Check minimum area
    if (feature.area !== undefined && feature.area < level.features.minArea) {
      return false;
    }

    return true;
  }

  /**
   * Filter labels based on LOD level
   */
  function shouldRenderLabel(element, level) {
    if (!config.enabled) return true;
    if (!level) level = currentLevel;
    if (!level) return true;

    // Random sampling based on density
    if (Math.random() > level.labels.density) {
      return false;
    }

    // Check if element has population data (for burgs)
    if (element.population !== undefined) {
      if (element.population < level.labels.minBurgPopulation) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter river based on LOD level
   */
  function shouldRenderRiver(river, level) {
    if (!config.enabled) return true;
    if (!level) level = currentLevel;
    if (!level) return true;

    // Check minimum flux
    if (river.flux !== undefined && river.flux < level.rivers.minFlux) {
      return false;
    }

    return true;
  }

  /**
   * Filter icon based on LOD level
   */
  function shouldRenderIcon(icon, level) {
    if (!config.enabled) return true;
    if (!level) level = currentLevel;
    if (!level) return true;

    // Random sampling based on density
    if (Math.random() > level.icons.density) {
      return false;
    }

    // Check minimum size
    if (icon.size !== undefined && icon.size < level.icons.minSize) {
      return false;
    }

    return true;
  }

  /**
   * Get simplification tolerance for current LOD level
   */
  function getSimplificationTolerance(type = 'features') {
    if (!config.enabled) return 0.3; // Default
    if (!currentLevel) return 0.3;

    switch (type) {
      case 'features':
        return currentLevel.features.simplification;
      case 'borders':
        return currentLevel.borders.simplification;
      case 'rivers':
        return currentLevel.rivers.simplification;
      default:
        return 0.3;
    }
  }

  /**
   * Hook into zoom events to automatically apply LOD
   */
  function hookIntoZoom() {
    // Try to hook into existing zoom handler
    if (typeof invokeActiveZooming === 'function') {
      const originalZoom = invokeActiveZooming;

      window.invokeActiveZooming = function() {
        // Apply LOD before zoom processing
        if (typeof scale !== 'undefined') {
          applyLOD(scale);
        }

        // Call original function
        return originalZoom.apply(this, arguments);
      };

      console.log('✅ LOD System hooked into zoom events');
    } else {
      console.warn('⚠️  Could not hook into zoom events - invokeActiveZooming not found');
    }
  }

  /**
   * Enable LOD system
   */
  function enable() {
    config.enabled = true;
    console.log('✅ LOD System enabled');

    // Apply current zoom level
    if (typeof scale !== 'undefined') {
      applyLOD(scale);
    }
  }

  /**
   * Disable LOD system
   */
  function disable() {
    config.enabled = false;
    console.log('❌ LOD System disabled');

    // Show all layers
    const svg = document.getElementById('map');
    if (svg) {
      svg.querySelectorAll('[style*="display: none"]').forEach(el => {
        el.style.display = '';
      });
    }
  }

  /**
   * Configure LOD system
   */
  function configure(options) {
    Object.assign(config, options);
    console.log('⚙️  LOD System configured');

    // Reapply current level
    if (currentLevel && typeof scale !== 'undefined') {
      applyLOD(scale);
    }
  }

  /**
   * Get current level info
   */
  function getCurrentLevel() {
    return currentLevel;
  }

  /**
   * Get configuration
   */
  function getConfig() {
    return config;
  }

  /**
   * Log current LOD status
   */
  function logStatus() {
    console.log('\n🔍 LOD SYSTEM STATUS');
    console.log('════════════════════════════════════');
    console.log(`Status: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    if (currentLevel) {
      console.log(`Current Level: ${currentLevel.name}`);
      console.log(`Zoom: ${lastZoom.toFixed(2)}`);
      console.log(`Zoom Range: [${currentLevel.zoomRange[0]}, ${currentLevel.zoomRange[1]})`);
      console.log('\nSettings:');
      console.log(`  Min Feature Area: ${currentLevel.features.minArea}`);
      console.log(`  Simplification: ${currentLevel.features.simplification}`);
      console.log(`  Label Density: ${(currentLevel.labels.density * 100).toFixed(0)}%`);
      console.log(`  Icon Density: ${(currentLevel.icons.density * 100).toFixed(0)}%`);
      console.log(`  Min River Flux: ${currentLevel.rivers.minFlux}`);
      console.log(`  State Borders: ${currentLevel.borders.showStateBorders ? 'Yes' : 'No'}`);
      console.log(`  Province Borders: ${currentLevel.borders.showProvinceBorders ? 'Yes' : 'No'}`);
    } else {
      console.log('No level active');
    }
    console.log('════════════════════════════════════\n');
  }

  // Initialize
  setTimeout(() => {
    if (config.enabled) {
      hookIntoZoom();

      // Apply initial LOD based on current zoom
      if (typeof scale !== 'undefined') {
        applyLOD(scale);
      }
    }
  }, 1000);

  // Public API
  return {
    getLevelForZoom,
    applyLOD,
    shouldRenderFeature,
    shouldRenderLabel,
    shouldRenderRiver,
    shouldRenderIcon,
    getSimplificationTolerance,
    enable,
    disable,
    configure,
    getCurrentLevel,
    getConfig,
    logStatus,
    hookIntoZoom
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.lod = window.LODSystem;
}

console.log('✅ LOD System loaded. Use: lod.logStatus()');
