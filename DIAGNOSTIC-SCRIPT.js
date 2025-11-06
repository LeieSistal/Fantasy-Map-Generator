// DIAGNOSTIC SCRIPT - Run this directly in the main page console
// or add as a bookmarklet for iPad

(function() {
  'use strict';

  // Create diagnostic overlay
  const overlay = document.createElement('div');
  overlay.id = 'diagnostic-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    color: #0f0;
    font-family: monospace;
    font-size: 14px;
    padding: 20px;
    overflow-y: auto;
    z-index: 999999;
    line-height: 1.6;
  `;

  const results = [];

  function log(message, type = 'info') {
    const colors = {
      info: '#0ff',
      success: '#0f0',
      warn: '#ff0',
      error: '#f00'
    };

    const line = document.createElement('div');
    line.style.color = colors[type] || '#0ff';
    line.style.marginBottom = '10px';
    line.innerHTML = message;
    overlay.appendChild(line);
    results.push({ message, type });
  }

  function logSection(title) {
    const section = document.createElement('div');
    section.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #0ff;
      margin-top: 20px;
      margin-bottom: 10px;
      border-bottom: 2px solid #0ff;
      padding-bottom: 5px;
    `;
    section.textContent = title;
    overlay.appendChild(section);
  }

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖ Close';
  closeBtn.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px 20px;
    background: #f00;
    color: #fff;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    z-index: 1000000;
  `;
  closeBtn.onclick = () => overlay.remove();

  document.body.appendChild(overlay);
  overlay.appendChild(closeBtn);

  log('🔍 DIAGNOSTIC STARTED', 'success');
  log('Time: ' + new Date().toLocaleTimeString(), 'info');
  log('');

  // CHECK 1: Grid exists
  logSection('1️⃣ CHECK GRID');
  if (typeof grid === 'undefined') {
    log('❌ CRITICAL: grid is undefined!', 'error');
    log('The grid object does not exist at all.', 'error');
  } else if (!grid) {
    log('❌ CRITICAL: grid is null!', 'error');
  } else {
    log('✅ grid exists', 'success');

    if (grid.cells) {
      log('✅ grid.cells exists', 'success');

      if (grid.cells.h) {
        const heights = grid.cells.h;
        log('✅ grid.cells.h exists', 'success');
        log(`   Total cells: ${heights.length}`, 'info');

        const landCells = Array.from(heights).filter(h => h >= 20).length;
        const waterCells = heights.length - landCells;
        const landPercent = ((landCells / heights.length) * 100).toFixed(1);

        log(`   Land cells: ${landCells} (${landPercent}%)`, landCells > 0 ? 'success' : 'error');
        log(`   Water cells: ${waterCells}`, 'info');
        log(`   Min height: ${Math.min(...heights)}`, 'info');
        log(`   Max height: ${Math.max(...heights)}`, 'info');

        if (landCells === 0) {
          log('❌ BUG: ALL CELLS ARE WATER!', 'error');
          log('This is the heightmap generation bug.', 'error');
        }
      } else {
        log('❌ grid.cells.h does NOT exist!', 'error');
        log('Heightmap was never generated.', 'error');
      }
    } else {
      log('❌ grid.cells does NOT exist!', 'error');
    }
  }

  log('');

  // CHECK 2: Pack exists
  logSection('2️⃣ CHECK PACK');
  if (typeof pack === 'undefined') {
    log('❌ CRITICAL: pack is undefined!', 'error');
  } else if (!pack) {
    log('❌ CRITICAL: pack is null!', 'error');
  } else if (!pack.features) {
    log('❌ pack.features does NOT exist!', 'error');
    log('Features were never generated.', 'error');
  } else {
    log('✅ pack.features exists', 'success');
    log(`   Total features: ${pack.features.length}`, 'info');

    const islands = pack.features.filter(f => f && f.type === 'island').length;
    const lakes = pack.features.filter(f => f && f.type === 'lake').length;
    const oceans = pack.features.filter(f => f && f.type === 'ocean').length;

    log(`   Islands: ${islands}`, islands > 0 ? 'success' : 'error');
    log(`   Lakes: ${lakes}`, 'info');
    log(`   Oceans: ${oceans}`, 'info');

    if (islands === 0) {
      log('❌ BUG: NO LAND FEATURES!', 'error');
      log('pack.features has no islands - only water will be visible.', 'error');
    }
  }

  log('');

  // CHECK 3: SVG elements
  logSection('3️⃣ CHECK SVG ELEMENTS');

  const svg = document.getElementById('map');
  if (!svg) {
    log('❌ SVG #map not found!', 'error');
  } else {
    log('✅ SVG #map exists', 'success');

    const featurePaths = svg.querySelector('#featurePaths');
    if (!featurePaths) {
      log('❌ #featurePaths not found in SVG!', 'error');
    } else {
      const paths = featurePaths.querySelectorAll('path');
      log(`✅ #featurePaths exists with ${paths.length} paths`, paths.length > 0 ? 'success' : 'error');

      if (paths.length === 0 && typeof pack !== 'undefined' && pack.features) {
        const islands = pack.features.filter(f => f && f.type === 'island').length;
        if (islands > 0) {
          log('❌ RENDERING BUG: Islands exist but no paths rendered!', 'error');
          log('drawFeatures() may not have been called or failed.', 'error');
        }
      }
    }

    const landmass = svg.querySelector('#landmass');
    if (landmass) {
      const display = window.getComputedStyle(landmass).display;
      log(`✅ #landmass exists (display: ${display})`, 'info');

      if (display === 'none') {
        log('⚠️ WARNING: #landmass is hidden (display: none)!', 'warn');
        log('This is why you cannot see land. Toggle layer visibility.', 'warn');
      }
    }
  }

  log('');

  // CHECK 4: Recent errors
  logSection('4️⃣ CHECK FOR ERRORS');
  log('Check browser console for errors (if accessible)', 'info');

  log('');

  // CHECK 5: Functions
  logSection('5️⃣ CHECK KEY FUNCTIONS');
  log(`drawFeatures: ${typeof drawFeatures === 'function' ? '✅ exists' : '❌ missing'}`,
      typeof drawFeatures === 'function' ? 'success' : 'error');
  log(`drawLayers: ${typeof drawLayers === 'function' ? '✅ exists' : '❌ missing'}`,
      typeof drawLayers === 'function' ? 'success' : 'error');
  log(`HeightmapGenerator: ${typeof HeightmapGenerator !== 'undefined' ? '✅ exists' : '❌ missing'}`,
      typeof HeightmapGenerator !== 'undefined' ? 'success' : 'error');

  log('');

  // SUMMARY
  logSection('📊 SUMMARY');

  const hasGrid = typeof grid !== 'undefined' && grid && grid.cells && grid.cells.h;
  const hasPack = typeof pack !== 'undefined' && pack && pack.features;
  const hasIslands = hasPack && pack.features.filter(f => f && f.type === 'island').length > 0;
  const hasPaths = document.querySelectorAll('#featurePaths path').length > 0;

  if (!hasGrid) {
    log('❌ PROBLEM: Grid/heightmap not generated', 'error');
    log('→ Issue is in map generation phase', 'error');
  } else if (!hasPack || !hasIslands) {
    log('❌ PROBLEM: No land features in pack.features', 'error');
    log('→ Issue is in Features.markupPack() or grid is all water', 'error');
  } else if (!hasPaths) {
    log('❌ PROBLEM: Land exists but not rendered to SVG', 'error');
    log('→ Issue is in drawFeatures() - it did not create paths', 'error');
  } else {
    log('✅ Everything looks OK!', 'success');
    log('If you still see only water, check:', 'info');
    log('  • Layer visibility (toggle buttons on left)', 'info');
    log('  • Zoom level', 'info');
    log('  • Browser cache (hard reload)', 'info');
  }

  log('');
  log('🔍 DIAGNOSTIC COMPLETE', 'success');

})();
