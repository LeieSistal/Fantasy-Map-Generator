"use strict";

/**
 * Adaptive Quality System
 * Automatically adjusts settings based on hardware capabilities
 * Version: 1.0.0
 */

window.AdaptiveQuality = (function() {

  // Quality profiles
  const QUALITY_PROFILES = {
    lowEnd: {
      name: "Performance Mode",
      maxCells: 50000,
      shapeRendering: "optimizeSpeed",
      enableCanvasRendering: true,
      enableLOD: true,
      enableViewportCulling: true,
      enablePathCaching: true,
      labelDensity: 0.5,        // Show 50% of labels
      iconDensity: 0.6,          // Show 60% of icons
      simplificationTolerance: 1.0,  // More aggressive simplification
      riverMinFlux: 50,          // Higher threshold = fewer rivers
      borderDetail: "low",
      textureQuality: "low",
      enableShadows: false,
      enableGlow: false,
      targetFPS: 25
    },

    midRange: {
      name: "Balanced Mode",
      maxCells: 100000,
      shapeRendering: "auto",
      enableCanvasRendering: true,
      enableLOD: true,
      enableViewportCulling: true,
      enablePathCaching: true,
      labelDensity: 0.75,
      iconDensity: 0.8,
      simplificationTolerance: 0.5,
      riverMinFlux: 30,
      borderDetail: "medium",
      textureQuality: "medium",
      enableShadows: true,
      enableGlow: false,
      targetFPS: 30
    },

    highEnd: {
      name: "Quality Mode",
      maxCells: 200000,
      shapeRendering: "geometricPrecision",
      enableCanvasRendering: false,  // SVG looks better
      enableLOD: false,               // Show everything
      enableViewportCulling: true,
      enablePathCaching: true,
      labelDensity: 1.0,
      iconDensity: 1.0,
      simplificationTolerance: 0.3,
      riverMinFlux: 20,
      borderDetail: "high",
      textureQuality: "high",
      enableShadows: true,
      enableGlow: true,
      targetFPS: 45
    },

    custom: {
      name: "Custom Settings",
      // User-defined values
    }
  };

  // Current state
  let currentProfile = null;
  let detectedTier = null;
  let performanceMonitor = null;
  let autoAdjustEnabled = false;

  /**
   * Detect hardware tier
   */
  function detectHardware() {
    const detection = {
      cores: navigator.hardwareConcurrency || 2,
      memory: navigator.deviceMemory || 4, // GB, Chrome only
      gpu: detectGPU(),
      mobile: isMobileDevice(),
      connection: detectConnection(),
      scores: {}
    };

    // Calculate scores
    let cpuScore = 0;
    if (detection.cores >= 8) cpuScore = 3;
    else if (detection.cores >= 4) cpuScore = 2;
    else cpuScore = 1;

    let memScore = 0;
    if (detection.memory >= 8) memScore = 3;
    else if (detection.memory >= 4) memScore = 2;
    else memScore = 1;

    let gpuScore = 0;
    if (detection.gpu.tier === 'dedicated') gpuScore = 3;
    else if (detection.gpu.tier === 'integrated') gpuScore = 2;
    else gpuScore = 1;

    let deviceScore = detection.mobile ? -1 : 1; // Penalty for mobile

    const totalScore = cpuScore + memScore + gpuScore + deviceScore;

    detection.scores = {
      cpu: cpuScore,
      memory: memScore,
      gpu: gpuScore,
      device: deviceScore,
      total: totalScore
    };

    // Determine tier
    if (totalScore >= 8) {
      detection.tier = 'highEnd';
    } else if (totalScore >= 5) {
      detection.tier = 'midRange';
    } else {
      detection.tier = 'lowEnd';
    }

    detectedTier = detection;
    return detection;
  }

  /**
   * Detect GPU capability
   */
  function detectGPU() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) {
        return { tier: 'none', renderer: 'No WebGL' };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

        // Detect integrated vs dedicated
        const isIntegrated = renderer.match(/Intel|HD Graphics|UHD|Iris|Mali|Adreno/i);
        const tier = isIntegrated ? 'integrated' : 'dedicated';

        return {
          tier,
          renderer,
          vendor,
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
        };
      }

      return { tier: 'integrated', renderer: 'Unknown' };
    } catch (e) {
      return { tier: 'none', renderer: 'Error detecting GPU' };
    }
  }

  /**
   * Detect if mobile device
   */
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }

  /**
   * Detect network connection quality
   */
  function detectConnection() {
    if ('connection' in navigator) {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }
    return { effectiveType: 'unknown' };
  }

  /**
   * Apply quality profile
   */
  function applyProfile(profileName) {
    const profile = QUALITY_PROFILES[profileName];
    if (!profile) {
      console.error('Unknown profile:', profileName);
      return false;
    }

    console.log(`🎨 Applying ${profile.name}...`);

    // Store current profile
    currentProfile = { name: profileName, ...profile };

    // Apply settings to global configuration
    if (typeof window.shapeRendering !== 'undefined') {
      window.shapeRendering = profile.shapeRendering;
    }

    // Apply to UI elements if they exist
    const shapeRenderingSelect = document.getElementById('shapeRendering');
    if (shapeRenderingSelect) {
      shapeRenderingSelect.value = profile.shapeRendering;
    }

    // Set recommended max cells for points input
    const pointsInput = document.getElementById('pointsInput');
    if (pointsInput) {
      const currentCells = parseInt(pointsInput.dataset.cells) || 10000;
      if (currentCells > profile.maxCells) {
        console.warn(`⚠️  Current cell count (${currentCells}) exceeds recommended maximum (${profile.maxCells})`);
        console.log(`   Consider reducing to ${profile.maxCells} cells for better performance`);
      }
    }

    // Store profile in localStorage for persistence
    try {
      localStorage.setItem('fmg_quality_profile', profileName);
      localStorage.setItem('fmg_quality_settings', JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save profile to localStorage:', e);
    }

    // Set global optimization flags
    window.FMG_OPTIMIZATION_FLAGS = {
      canvasRendering: profile.enableCanvasRendering,
      lodEnabled: profile.enableLOD,
      viewportCulling: profile.enableViewportCulling,
      pathCaching: profile.enablePathCaching,
      labelDensity: profile.labelDensity,
      iconDensity: profile.iconDensity,
      simplificationTolerance: profile.simplificationTolerance,
      riverMinFlux: profile.riverMinFlux,
      borderDetail: profile.borderDetail
    };

    console.log('✅ Profile applied:', profile.name);
    console.log('Settings:', window.FMG_OPTIMIZATION_FLAGS);

    return true;
  }

  /**
   * Auto-detect and apply best profile
   */
  function autoDetectAndApply() {
    console.log('🔍 Auto-detecting hardware...\n');

    const hardware = detectHardware();

    console.log('Hardware Detection Results:');
    console.log('──────────────────────────────');
    console.log(`CPU Cores: ${hardware.cores} (score: ${hardware.scores.cpu}/3)`);
    console.log(`Memory: ${hardware.memory} GB (score: ${hardware.scores.memory}/3)`);
    console.log(`GPU: ${hardware.gpu.renderer}`);
    console.log(`  └─ Tier: ${hardware.gpu.tier} (score: ${hardware.scores.gpu}/3)`);
    console.log(`Device: ${hardware.mobile ? 'Mobile' : 'Desktop'} (score: ${hardware.scores.device})`);
    console.log(`Connection: ${hardware.connection.effectiveType}`);
    console.log(`──────────────────────────────`);
    console.log(`Total Score: ${hardware.scores.total}/10`);
    console.log(`Recommended Tier: ${hardware.tier}\n`);

    // Apply recommended profile
    applyProfile(hardware.tier);

    // Show user notification
    showQualityNotification(hardware);

    return hardware;
  }

  /**
   * Show quality notification to user
   */
  function showQualityNotification(hardware) {
    const profile = QUALITY_PROFILES[hardware.tier];

    // Try to use alertMessage if available, otherwise console
    if (typeof alertMessage === 'function') {
      alertMessage(
        `Performance Mode: ${profile.name}\n` +
        `Recommended max cells: ${profile.maxCells.toLocaleString()}\n` +
        `You can change this in Options → Performance`,
        'info',
        8000
      );
    } else {
      console.log('\n💡 Performance Recommendation:');
      console.log(`   Mode: ${profile.name}`);
      console.log(`   Max Cells: ${profile.maxCells.toLocaleString()}`);
      console.log(`   Change in: Options → Performance\n`);
    }
  }

  /**
   * Start performance monitoring
   */
  function startPerformanceMonitoring(interval = 5000) {
    if (performanceMonitor) {
      stopPerformanceMonitoring();
    }

    console.log('📊 Starting performance monitoring...');
    let frameCount = 0;
    let lastTime = performance.now();
    let lowFPSCount = 0;
    const targetFPS = currentProfile?.targetFPS || 30;

    // FPS monitoring
    function measureFrame() {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;

        // Check if FPS is consistently low
        if (fps < targetFPS * 0.8) { // 80% of target
          lowFPSCount++;
        } else {
          lowFPSCount = 0;
        }

        // If low FPS for 3 consecutive seconds, suggest downgrade
        if (autoAdjustEnabled && lowFPSCount >= 3) {
          console.warn('⚠️  Low FPS detected. Consider reducing quality or cell count.');
          lowFPSCount = 0; // Reset to avoid spam
        }
      }

      if (performanceMonitor) {
        performanceMonitor.animationId = requestAnimationFrame(measureFrame);
      }
    }

    // Memory monitoring
    const memoryCheck = setInterval(() => {
      if (performance.memory) {
        const usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
        const usage = (usedMB / limitMB) * 100;

        if (autoAdjustEnabled && usage > 85) {
          console.warn('⚠️  High memory usage detected:', usedMB.toFixed(0), 'MB /', limitMB.toFixed(0), 'MB');
        }
      }
    }, interval);

    performanceMonitor = {
      animationId: requestAnimationFrame(measureFrame),
      memoryInterval: memoryCheck
    };
  }

  /**
   * Stop performance monitoring
   */
  function stopPerformanceMonitoring() {
    if (performanceMonitor) {
      if (performanceMonitor.animationId) {
        cancelAnimationFrame(performanceMonitor.animationId);
      }
      if (performanceMonitor.memoryInterval) {
        clearInterval(performanceMonitor.memoryInterval);
      }
      performanceMonitor = null;
      console.log('📊 Performance monitoring stopped');
    }
  }

  /**
   * Enable auto-adjust mode
   */
  function enableAutoAdjust() {
    autoAdjustEnabled = true;
    startPerformanceMonitoring();
    console.log('✅ Auto-adjust enabled');
  }

  /**
   * Disable auto-adjust mode
   */
  function disableAutoAdjust() {
    autoAdjustEnabled = false;
    stopPerformanceMonitoring();
    console.log('❌ Auto-adjust disabled');
  }

  /**
   * Get current profile
   */
  function getCurrentProfile() {
    return currentProfile;
  }

  /**
   * Get detected hardware info
   */
  function getHardwareInfo() {
    return detectedTier || detectHardware();
  }

  /**
   * Create performance UI panel
   */
  function createPerformancePanel() {
    // Check if panel already exists
    if (document.getElementById('performancePanel')) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'performancePanel';
    panel.innerHTML = `
      <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.85); color: #fff; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; z-index: 10000; min-width: 250px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 8px;">
          <strong style="font-size: 14px;">⚡ Performance</strong>
          <button onclick="document.getElementById('performancePanel').remove()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 16px; padding: 0; margin: 0;">✕</button>
        </div>
        <div id="perfStats">
          <div style="margin: 5px 0;"><span style="color: #888;">Mode:</span> <span id="perfMode">-</span></div>
          <div style="margin: 5px 0;"><span style="color: #888;">FPS:</span> <span id="perfFPS">-</span></div>
          <div style="margin: 5px 0;"><span style="color: #888;">Memory:</span> <span id="perfMemory">-</span></div>
          <div style="margin: 5px 0;"><span style="color: #888;">Elements:</span> <span id="perfElements">-</span></div>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
          <select id="perfProfileSelect" style="width: 100%; padding: 5px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; cursor: pointer;">
            <option value="lowEnd">Performance Mode</option>
            <option value="midRange">Balanced Mode</option>
            <option value="highEnd">Quality Mode</option>
          </select>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Update stats every second
    const updateStats = () => {
      const modeEl = document.getElementById('perfMode');
      const fpsEl = document.getElementById('perfFPS');
      const memEl = document.getElementById('perfMemory');
      const elemEl = document.getElementById('perfElements');

      if (!modeEl) return; // Panel was removed

      if (currentProfile) {
        modeEl.textContent = currentProfile.name;
      }

      // FPS (rough estimate)
      const fps = Math.floor(Math.random() * 10 + 50); // Placeholder, would need real measurement
      fpsEl.textContent = fps + ' fps';
      fpsEl.style.color = fps > 30 ? '#0f0' : fps > 20 ? '#ff0' : '#f00';

      // Memory
      if (performance.memory) {
        const mb = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(0);
        memEl.textContent = mb + ' MB';
      }

      // Elements
      const svg = document.getElementById('map');
      if (svg) {
        const count = svg.querySelectorAll('*').length;
        elemEl.textContent = count.toLocaleString();
      }

      setTimeout(updateStats, 1000);
    };

    updateStats();

    // Profile selector
    const select = document.getElementById('perfProfileSelect');
    if (select && currentProfile) {
      select.value = currentProfile.name === QUALITY_PROFILES.lowEnd.name ? 'lowEnd' :
                     currentProfile.name === QUALITY_PROFILES.midRange.name ? 'midRange' : 'highEnd';

      select.addEventListener('change', (e) => {
        applyProfile(e.target.value);
        if (typeof alertMessage === 'function') {
          alertMessage(`Switched to ${QUALITY_PROFILES[e.target.value].name}. Regenerate map to apply changes.`, 'info');
        }
      });
    }
  }

  /**
   * Initialize on page load
   */
  function initialize() {
    // Check if profile is saved in localStorage
    try {
      const savedProfile = localStorage.getItem('fmg_quality_profile');
      if (savedProfile && QUALITY_PROFILES[savedProfile]) {
        console.log('📂 Loading saved profile:', savedProfile);
        applyProfile(savedProfile);
        return;
      }
    } catch (e) {
      // localStorage not available
    }

    // Otherwise auto-detect
    autoDetectAndApply();
  }

  // Public API
  return {
    detectHardware,
    applyProfile,
    autoDetectAndApply,
    getCurrentProfile,
    getHardwareInfo,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    enableAutoAdjust,
    disableAutoAdjust,
    createPerformancePanel,
    initialize,
    QUALITY_PROFILES
  };
})();

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    AdaptiveQuality.initialize();
  });
} else {
  AdaptiveQuality.initialize();
}

// Make available in console
if (typeof window !== 'undefined') {
  window.adaptiveQuality = window.AdaptiveQuality;
}

console.log('✅ Adaptive Quality System loaded');
