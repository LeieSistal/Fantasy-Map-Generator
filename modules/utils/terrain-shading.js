"use strict";

/**
 * Terrain Shading Utilities
 * Calculates lighting based on terrain slopes for realistic heightmap rendering
 */

window.TerrainShading = (function() {

  // Default shading configuration
  const config = {
    enabled: true,
    lightDirection: { x: 0.5, y: -0.5, z: 0.7 }, // Normalized light direction
    intensity: 0.6,        // How strong the shading effect is (0-1)
    ambientLight: 0.4,     // Minimum light level in shadows (0-1)
    exaggeration: 2.0      // Height exaggeration for slope calculation
  };

  /**
   * Normalize a vector
   */
  function normalize(vec) {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    return {
      x: vec.x / len,
      y: vec.y / len,
      z: vec.z / len
    };
  }

  /**
   * Calculate normal vector for a cell based on neighbor heights
   */
  function calculateCellNormal(cellId, cells, vertices) {
    const h = cells.h[cellId];
    const neighbors = cells.c[cellId];

    if (!neighbors || neighbors.length === 0) {
      return { x: 0, y: 0, z: 1 }; // Flat surface
    }

    // Get cell position
    const cellVertices = cells.v[cellId];
    const cellPos = getAveragePosition(cellVertices, vertices);

    // Calculate height gradients
    let dx = 0, dy = 0;
    let count = 0;

    for (const nId of neighbors) {
      if (nId >= cells.i.length) continue; // Skip invalid neighbors

      const nVertices = cells.v[nId];
      const nPos = getAveragePosition(nVertices, vertices);
      const nH = cells.h[nId];

      const distX = nPos.x - cellPos.x;
      const distY = nPos.y - cellPos.y;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist > 0) {
        const heightDiff = (nH - h) * config.exaggeration;
        dx += (heightDiff / dist) * (distX / dist);
        dy += (heightDiff / dist) * (distY / dist);
        count++;
      }
    }

    if (count > 0) {
      dx /= count;
      dy /= count;
    }

    // Build normal vector from gradients
    // Surface is at (x, y, h), tangent vectors are (1, 0, dx) and (0, 1, dy)
    // Cross product gives normal: (-dx, -dy, 1)
    return normalize({ x: -dx, y: -dy, z: 1 });
  }

  /**
   * Get average position of vertices
   */
  function getAveragePosition(vertexIds, vertices) {
    let x = 0, y = 0;
    for (const vId of vertexIds) {
      const pos = vertices.p[vId];
      x += pos[0];
      y += pos[1];
    }
    return { x: x / vertexIds.length, y: y / vertexIds.length };
  }

  /**
   * Calculate lighting factor for a normal vector
   * Returns value between 0 (dark) and 1 (bright)
   */
  function calculateLighting(normal) {
    const light = normalize(config.lightDirection);

    // Dot product of normal and light direction
    const dotProduct = normal.x * light.x + normal.y * light.y + normal.z * light.z;

    // Map from [-1, 1] to [ambientLight, 1]
    const lightFactor = config.ambientLight + (1 - config.ambientLight) * Math.max(0, dotProduct);

    // Apply intensity
    return config.ambientLight + (lightFactor - config.ambientLight) * config.intensity;
  }

  /**
   * Apply shading to a color based on lighting factor
   */
  function applyShading(color, lightFactor) {
    const c = d3.color(color);
    if (!c) return color;

    // Adjust brightness
    const adjust = (lightFactor - 0.5) * 2; // Map [0, 1] to [-1, 1]

    if (adjust > 0) {
      return c.brighter(adjust * 0.5).toString();
    } else {
      return c.darker(-adjust * 0.8).toString();
    }
  }

  /**
   * Calculate shading map for all cells
   * Returns a map of cellId -> lightFactor
   */
  function calculateShadingMap() {
    if (!config.enabled) return null;
    if (!grid || !grid.cells) return null;

    const { cells, vertices } = grid;
    const shadingMap = new Map();

    for (const i of cells.i) {
      const normal = calculateCellNormal(i, cells, vertices);
      const lightFactor = calculateLighting(normal);
      shadingMap.set(i, lightFactor);
    }

    return shadingMap;
  }

  /**
   * Get shaded color for a specific height/cell
   */
  function getShaded Color(height, scheme, shadingFactor) {
    if (!config.enabled || shadingFactor === undefined) {
      return getColor(height, scheme);
    }

    const baseColor = getColor(height, scheme);
    return applyShading(baseColor, shadingFactor);
  }

  /**
   * Configure shading parameters
   */
  function configure(options) {
    if (options.enabled !== undefined) config.enabled = options.enabled;
    if (options.intensity !== undefined) config.intensity = Math.max(0, Math.min(1, options.intensity));
    if (options.ambientLight !== undefined) config.ambientLight = Math.max(0, Math.min(1, options.ambientLight));
    if (options.exaggeration !== undefined) config.exaggeration = Math.max(0.1, options.exaggeration);

    if (options.lightDirection) {
      config.lightDirection = normalize(options.lightDirection);
    }
  }

  /**
   * Set light direction from azimuth (degrees) and altitude (degrees)
   * Azimuth: 0=North, 90=East, 180=South, 270=West
   * Altitude: 0=horizon, 90=directly overhead
   */
  function setLightFromAngles(azimuth, altitude) {
    const azimuthRad = (azimuth - 90) * Math.PI / 180; // Adjust so 0 is North
    const altitudeRad = altitude * Math.PI / 180;

    config.lightDirection = normalize({
      x: Math.cos(altitudeRad) * Math.cos(azimuthRad),
      y: Math.cos(altitudeRad) * Math.sin(azimuthRad),
      z: Math.sin(altitudeRad)
    });
  }

  /**
   * Enable shading
   */
  function enable() {
    config.enabled = true;
    console.log('✅ Terrain Shading enabled');
  }

  /**
   * Disable shading
   */
  function disable() {
    config.enabled = false;
    console.log('❌ Terrain Shading disabled');
  }

  /**
   * Get configuration
   */
  function getConfig() {
    return { ...config };
  }

  // Public API
  return {
    calculateCellNormal,
    calculateLighting,
    calculateShadingMap,
    getShadedColor,
    applyShading,
    configure,
    setLightFromAngles,
    enable,
    disable,
    getConfig
  };
})();

console.log('✅ Terrain Shading utilities loaded');
