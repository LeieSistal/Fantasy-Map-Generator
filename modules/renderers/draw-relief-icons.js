"use strict";

// Performance cache for cell data
const reliefIconsCache = {
  polygons: new Map(),
  bounds: new Map(),
  icons: new Map(),
  clear() {
    this.polygons.clear();
    this.bounds.clear();
    this.icons.clear();
  }
};

// Configuration for progressive rendering
const reliefRenderConfig = {
  chunkSize: 100, // Process 100 cells per frame
  useProgressive: null // Auto-detect based on cell count (null = auto, true = force, false = disable)
};

function drawReliefIcons() {
  TIME && console.time("drawRelief");
  const perfStart = performance.now();

  terrain.selectAll("*").remove();

  const cells = pack.cells;
  const density = terrain.attr("density") || 0.4;
  const size = 2 * (terrain.attr("size") || 1);
  const mod = 0.2 * size; // size modifier
  const relief = [];

  // Pre-filter valid cells to avoid unnecessary iterations
  const validCells = [];
  for (const i of cells.i) {
    const height = cells.h[i];
    if (height < 20) continue; // no icons on water
    if (cells.r[i]) continue; // no icons on rivers
    const biome = cells.biome[i];
    if (height < 50 && biomesData.iconsDensity[biome] === 0) continue; // no icons for this biome

    validCells.push({i, height, biome});
  }

  TIME && console.log(`drawRelief: Processing ${validCells.length} valid cells (filtered from ${cells.i.length})`);

  // Determine if progressive rendering should be used
  const useProgressive = reliefRenderConfig.useProgressive !== null
    ? reliefRenderConfig.useProgressive
    : validCells.length > 500; // Auto: use progressive for >500 cells

  if (useProgressive) {
    // Progressive rendering for large maps
    drawReliefIconsProgressive(validCells, density, size, mod, perfStart);
    return;
  }

  // Process cells with caching (standard rendering)
  for (const {i, height, biome} of validCells) {
    // Get or cache polygon and bounds
    let polygon, bounds;
    if (reliefIconsCache.polygons.has(i)) {
      polygon = reliefIconsCache.polygons.get(i);
      bounds = reliefIconsCache.bounds.get(i);
    } else {
      polygon = getPackPolygon(i);
      bounds = {
        minX: Math.min(...polygon.map(p => p[0])),
        maxX: Math.max(...polygon.map(p => p[0])),
        minY: Math.min(...polygon.map(p => p[1])),
        maxY: Math.max(...polygon.map(p => p[1]))
      };
      reliefIconsCache.polygons.set(i, polygon);
      reliefIconsCache.bounds.set(i, bounds);
    }

    const {minX, maxX, minY, maxY} = bounds;

    if (height < 50) placeBiomeIcons(i, biome);
    else placeReliefIcons(i);

    function placeBiomeIcons() {
      const iconsDensity = biomesData.iconsDensity[biome] / 100;
      const radius = 2 / iconsDensity / density;
      if (Math.random() > iconsDensity * 10) return;

      for (const [cx, cy] of poissonDiscSampler(minX, minY, maxX, maxY, radius)) {
        // Fast bounding box check before expensive polygon containment test
        if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;
        if (!d3.polygonContains(polygon, [cx, cy])) continue;

        let h = (4 + Math.random()) * size;
        const icon = getBiomeIcon(i, biomesData.icons[biome]);
        if (icon === "#relief-grass-1") h *= 1.2;
        relief.push({i: icon, x: rn(cx - h, 2), y: rn(cy - h, 2), s: rn(h * 2, 2)});
      }
    }

    function placeReliefIcons(i) {
      const radius = 2 / density;
      const [icon, h] = getReliefIcon(i, height);

      for (const [cx, cy] of poissonDiscSampler(minX, minY, maxX, maxY, radius)) {
        // Fast bounding box check before expensive polygon containment test
        if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;
        if (!d3.polygonContains(polygon, [cx, cy])) continue;
        relief.push({i: icon, x: rn(cx - h, 2), y: rn(cy - h, 2), s: rn(h * 2, 2)});
      }
    }

    function getReliefIcon(i, h) {
      // Check cache first
      const cacheKey = `${i}-${h}`;
      if (reliefIconsCache.icons.has(cacheKey)) {
        return reliefIconsCache.icons.get(cacheKey);
      }

      const temp = grid.cells.temp[pack.cells.g[i]];
      const type = h > 70 && temp < 0 ? "mountSnow" : h > 70 ? "mount" : "hill";
      const iconSize = h > 70 ? (h - 45) * mod : minmax((h - 40) * mod, 3, 6);
      const result = [getIcon(type), iconSize];

      reliefIconsCache.icons.set(cacheKey, result);
      return result;
    }
  }

  // sort relief icons by y+size
  relief.sort((a, b) => a.y + a.s - (b.y + b.s));

  // Build HTML string efficiently
  const reliefHTML = new Array(relief.length);
  for (const r of relief) {
    reliefHTML.push(`<use href="${r.i}" x="${r.x}" y="${r.y}" width="${r.s}" height="${r.s}"/>`);
  }
  terrain.html(reliefHTML.join(""));

  const perfEnd = performance.now();
  TIME && console.timeEnd("drawRelief");
  TIME && console.log(`drawRelief: Generated ${relief.length} icons in ${(perfEnd - perfStart).toFixed(2)}ms`);
}

// Progressive rendering function for large maps
function drawReliefIconsProgressive(validCells, density, size, mod, perfStart) {
  TIME && console.log(`drawRelief: Using progressive rendering for ${validCells.length} cells`);

  const relief = [];
  let currentIndex = 0;
  const chunkSize = reliefRenderConfig.chunkSize;

  function processChunk() {
    const endIndex = Math.min(currentIndex + chunkSize, validCells.length);
    const cells = pack.cells;

    // Process chunk of cells
    for (let idx = currentIndex; idx < endIndex; idx++) {
      const {i, height, biome} = validCells[idx];

      // Get or cache polygon and bounds
      let polygon, bounds;
      if (reliefIconsCache.polygons.has(i)) {
        polygon = reliefIconsCache.polygons.get(i);
        bounds = reliefIconsCache.bounds.get(i);
      } else {
        polygon = getPackPolygon(i);
        bounds = {
          minX: Math.min(...polygon.map(p => p[0])),
          maxX: Math.max(...polygon.map(p => p[0])),
          minY: Math.min(...polygon.map(p => p[1])),
          maxY: Math.max(...polygon.map(p => p[1]))
        };
        reliefIconsCache.polygons.set(i, polygon);
        reliefIconsCache.bounds.set(i, bounds);
      }

      const {minX, maxX, minY, maxY} = bounds;

      if (height < 50) {
        placeBiomeIcons(i, biome, polygon, minX, maxX, minY, maxY, density, size);
      } else {
        placeReliefIcons(i, height, polygon, minX, maxX, minY, maxY, density, mod);
      }
    }

    currentIndex = endIndex;

    // Update progress
    const progress = Math.round((currentIndex / validCells.length) * 100);
    if (progress % 25 === 0 && TIME) {
      console.log(`drawRelief: Progress ${progress}% (${currentIndex}/${validCells.length} cells)`);
    }

    // Continue processing or finish
    if (currentIndex < validCells.length) {
      requestAnimationFrame(processChunk);
    } else {
      finishRendering();
    }
  }

  function finishRendering() {
    // Sort relief icons by y+size
    relief.sort((a, b) => a.y + a.s - (b.y + b.s));

    // Build HTML string efficiently
    const reliefHTML = new Array(relief.length);
    for (const r of relief) {
      reliefHTML.push(`<use href="${r.i}" x="${r.x}" y="${r.y}" width="${r.s}" height="${r.s}"/>`);
    }
    terrain.html(reliefHTML.join(""));

    const perfEnd = performance.now();
    TIME && console.timeEnd("drawRelief");
    TIME && console.log(`drawRelief: Generated ${relief.length} icons in ${(perfEnd - perfStart).toFixed(2)}ms (progressive)`);
  }

  function placeBiomeIcons(i, biome, polygon, minX, maxX, minY, maxY, density, size) {
    const iconsDensity = biomesData.iconsDensity[biome] / 100;
    const radius = 2 / iconsDensity / density;
    if (Math.random() > iconsDensity * 10) return;

    for (const [cx, cy] of poissonDiscSampler(minX, minY, maxX, maxY, radius)) {
      // Fast bounding box check before expensive polygon containment test
      if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;
      if (!d3.polygonContains(polygon, [cx, cy])) continue;

      let h = (4 + Math.random()) * size;
      const icon = getBiomeIcon(i, biomesData.icons[biome]);
      if (icon === "#relief-grass-1") h *= 1.2;
      relief.push({i: icon, x: rn(cx - h, 2), y: rn(cy - h, 2), s: rn(h * 2, 2)});
    }
  }

  function placeReliefIcons(i, height, polygon, minX, maxX, minY, maxY, density, mod) {
    const radius = 2 / density;
    const [icon, h] = getReliefIcon(i, height, mod);

    for (const [cx, cy] of poissonDiscSampler(minX, minY, maxX, maxY, radius)) {
      // Fast bounding box check before expensive polygon containment test
      if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;
      if (!d3.polygonContains(polygon, [cx, cy])) continue;
      relief.push({i: icon, x: rn(cx - h, 2), y: rn(cy - h, 2), s: rn(h * 2, 2)});
    }
  }

  function getReliefIcon(i, h, mod) {
    // Check cache first
    const cacheKey = `${i}-${h}`;
    if (reliefIconsCache.icons.has(cacheKey)) {
      return reliefIconsCache.icons.get(cacheKey);
    }

    const temp = grid.cells.temp[pack.cells.g[i]];
    const type = h > 70 && temp < 0 ? "mountSnow" : h > 70 ? "mount" : "hill";
    const iconSize = h > 70 ? (h - 45) * mod : minmax((h - 40) * mod, 3, 6);
    const result = [getIcon(type), iconSize];

    reliefIconsCache.icons.set(cacheKey, result);
    return result;
  }

  // Start processing
  requestAnimationFrame(processChunk);
}

// Helper functions shared across rendering modes
function getBiomeIcon(i, b) {
  let type = b[Math.floor(Math.random() * b.length)];
  const temp = grid.cells.temp[pack.cells.g[i]];
  if (type === "conifer" && temp < 0) type = "coniferSnow";
  return getIcon(type);
}

function getVariant(type) {
  switch (type) {
    case "mount":
      return rand(2, 7);
    case "mountSnow":
      return rand(1, 6);
    case "hill":
      return rand(2, 5);
    case "conifer":
      return 2;
    case "coniferSnow":
      return 1;
    case "swamp":
      return rand(2, 3);
    case "cactus":
      return rand(1, 3);
    case "deadTree":
      return rand(1, 2);
    default:
      return 2;
  }
}

function getOldIcon(type) {
  switch (type) {
    case "mountSnow":
      return "mount";
    case "vulcan":
      return "mount";
    case "coniferSnow":
      return "conifer";
    case "cactus":
      return "dune";
    case "deadTree":
      return "dune";
    default:
      return type;
  }
}

function getIcon(type) {
  const set = terrain.attr("set") || "simple";
  if (set === "simple") return "#relief-" + getOldIcon(type) + "-1";
  if (set === "colored") return "#relief-" + type + "-" + getVariant(type);
  if (set === "gray") return "#relief-" + type + "-" + getVariant(type) + "-bw";
  return "#relief-" + getOldIcon(type) + "-1"; // simple
}
