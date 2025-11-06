"use strict";

function drawReliefIcons() {
  TIME && console.time("drawRelief");
  terrain.selectAll("*").remove();

  const cells = pack.cells;

  // Get current zoom level (scale variable is global)
  const currentZoom = typeof scale !== 'undefined' ? scale : 1.0;

  // Apply zoom-based density scaling
  // Below zoom 1.0, reduce density progressively
  // At zoom 0.5, density is halved; below 0.5, no icons
  let zoomFactor = 1.0;
  if (currentZoom < 1.0) {
    if (currentZoom < 0.5) {
      // No relief icons at very low zoom
      TIME && console.timeEnd("drawRelief");
      return;
    }
    // Linear scaling between 0.5 and 1.0
    zoomFactor = (currentZoom - 0.5) / 0.5;
  } else if (currentZoom >= 2.0) {
    // Increase density slightly at high zoom
    zoomFactor = Math.min(1.5, 1.0 + (currentZoom - 2.0) * 0.1);
  }

  const baseDensity = terrain.attr("density") || 0.4;
  const density = baseDensity * zoomFactor;
  const size = 2 * (terrain.attr("size") || 1);
  const mod = 0.2 * size; // size modifier
  const relief = [];

  for (const i of cells.i) {
    const height = cells.h[i];
    if (height < 20) continue; // no icons on water
    if (cells.r[i]) continue; // no icons on rivers
    const biome = cells.biome[i];
    if (height < 50 && biomesData.iconsDensity[biome] === 0) continue; // no icons for this biome

    const polygon = getPackPolygon(i);
    const [minX, maxX] = d3.extent(polygon, p => p[0]);
    const [minY, maxY] = d3.extent(polygon, p => p[1]);

    if (height < 50) placeBiomeIcons(i, biome);
    else placeReliefIcons(i);

    function placeBiomeIcons() {
      const iconsDensity = biomesData.iconsDensity[biome] / 100;
      const radius = 2 / iconsDensity / density;
      if (Math.random() > iconsDensity * 10) return;

      for (const [cx, cy] of poissonDiscSampler(minX, minY, maxX, maxY, radius)) {
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
        if (!d3.polygonContains(polygon, [cx, cy])) continue;
        relief.push({i: icon, x: rn(cx - h, 2), y: rn(cy - h, 2), s: rn(h * 2, 2)});
      }
    }

    function getReliefIcon(i, h) {
      const temp = grid.cells.temp[pack.cells.g[i]];
      const type = h > 70 && temp < 0 ? "mountSnow" : h > 70 ? "mount" : "hill";
      const size = h > 70 ? (h - 45) * mod : minmax((h - 40) * mod, 3, 6);
      return [getIcon(type), size];
    }
  }

  // sort relief icons by y+size
  relief.sort((a, b) => a.y + a.s - (b.y + b.s));

  const reliefHTML = new Array(relief.length);
  for (const r of relief) {
    reliefHTML.push(`<use href="${r.i}" x="${r.x}" y="${r.y}" width="${r.s}" height="${r.s}"/>`);
  }
  terrain.html(reliefHTML.join(""));

  TIME && console.timeEnd("drawRelief");

  function getBiomeIcon(i, b) {
    let type = b[Math.floor(Math.random() * b.length)];
    const temp = grid.cells.temp[pack.cells.g[i]];
    if (type === "conifer" && temp < 0) type = "coniferSnow";
    return getIcon(type);
  }

  function getVariant(type) {
    switch (type) {
      case "mount":
        return rand(2, 9); // Increased from 7 to 9 for new variants
      case "mountSnow":
        return rand(1, 6);
      case "hill":
        return rand(2, 7); // Increased from 5 to 7 for new variants
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
}
