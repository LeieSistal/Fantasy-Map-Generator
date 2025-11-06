"use strict";

function drawFeatures() {
  TIME && console.time("drawFeatures");
  INFO && console.log("drawFeatures: Starting...");

  try {
    if (!pack || !pack.features) {
      ERROR && console.error("drawFeatures: pack.features does not exist!");
      throw new Error("Cannot draw features: pack.features is undefined");
    }

    const totalFeatures = pack.features.length;
    const landFeatures = pack.features.filter(f => f && f.type === "island").length;
    const lakeFeatures = pack.features.filter(f => f && f.type === "lake").length;
    const oceanFeatures = pack.features.filter(f => f && f.type === "ocean").length;

    INFO && console.log(`drawFeatures: Found ${totalFeatures} features (Land: ${landFeatures}, Lakes: ${lakeFeatures}, Ocean: ${oceanFeatures})`);

    if (landFeatures === 0) {
      WARN && console.warn("drawFeatures: WARNING - No land features found! Only ocean will be visible.");
    }

    const html = {
      paths: [],
      landMask: [],
      waterMask: ['<rect x="0" y="0" width="100%" height="100%" fill="white" />'],
      coastline: {},
      lakes: {}
    };

    let processedFeatures = 0;
    for (const feature of pack.features) {
      if (!feature || feature.type === "ocean") continue;
      processedFeatures++;

      try {
        const featurePath = getFeaturePath(feature);
        if (!featurePath) continue; // Skip if path generation failed

        html.paths.push(`<path d="${featurePath}" id="feature_${feature.i}" data-f="${feature.i}"></path>`);

        if (feature.type === "lake") {
          html.landMask.push(`<use href="#feature_${feature.i}" data-f="${feature.i}" fill="black"></use>`);

          const lakeGroup = feature.group || "freshwater";
          if (!html.lakes[lakeGroup]) html.lakes[lakeGroup] = [];
          html.lakes[lakeGroup].push(`<use href="#feature_${feature.i}" data-f="${feature.i}"></use>`);
        } else {
          html.landMask.push(`<use href="#feature_${feature.i}" data-f="${feature.i}" fill="white"></use>`);
          html.waterMask.push(`<use href="#feature_${feature.i}" data-f="${feature.i}" fill="black"></use>`);

          const coastlineGroup = feature.group === "lake_island" ? "lake_island" : "sea_island";
          if (!html.coastline[coastlineGroup]) html.coastline[coastlineGroup] = [];
          html.coastline[coastlineGroup].push(`<use href="#feature_${feature.i}" data-f="${feature.i}"></use>`);
        }
      } catch (featureError) {
        ERROR && console.error(`Failed to draw feature ${feature.i}:`, featureError);
        continue; // Skip this feature but continue with others
      }
    }

    INFO && console.log(`drawFeatures: Processed ${processedFeatures} non-ocean features`);
    INFO && console.log(`drawFeatures: Generated ${html.paths.length} paths, ${html.landMask.length} land masks, ${html.waterMask.length} water masks`);

    defs.select("#featurePaths").html(html.paths.join(""));
    defs.select("#land").html(html.landMask.join(""));
    defs.select("#water").html(html.waterMask.join(""));

    coastline.selectAll("g").each(function () {
      const paths = html.coastline[this.id] || [];
      d3.select(this).html(paths.join(""));
    });

    lakes.selectAll("g").each(function () {
      const paths = html.lakes[this.id] || [];
      d3.select(this).html(paths.join(""));
    });

    // Verify paths were added to DOM
    const pathsInDom = document.querySelectorAll('#featurePaths path').length;
    INFO && console.log(`drawFeatures: ${pathsInDom} paths added to DOM`);

    if (pathsInDom === 0 && html.paths.length > 0) {
      ERROR && console.error("drawFeatures: Paths generated but not added to DOM!");
    }

    if (pathsInDom > 0) {
      INFO && console.log("drawFeatures: ✅ Features rendered successfully");
    } else {
      WARN && console.warn("drawFeatures: ⚠️ No feature paths in DOM - map will show only ocean");
    }

  } catch (error) {
    ERROR && console.error("Critical error in drawFeatures:", error);
    ERROR && console.error("Stack trace:", error.stack);
    // Attempt to show at least the basic ocean/water mask
    defs.select("#water").html('<rect x="0" y="0" width="100%" height="100%" fill="white" />');
  } finally {
    TIME && console.timeEnd("drawFeatures");
  }
}

function getFeaturePath(feature) {
  try {
    const points = feature.vertices.map(vertex => pack.vertices.p[vertex]);
    if (points.some(point => point === undefined)) {
      ERROR && console.error("Undefined point in getFeaturePath");
      return "";
    }

    const simplifiedPoints = simplify(points, 0.3);
    const clippedPoints = clipPoly(simplifiedPoints, 1);

    const lineGen = d3.line().curve(d3.curveBasisClosed);
    const path = round(lineGen(clippedPoints)) + "Z";

    return path;
  } catch (error) {
    ERROR && console.error("Error generating feature path:", error);
    return "";
  }
}
