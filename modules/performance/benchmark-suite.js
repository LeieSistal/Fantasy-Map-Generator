"use strict";

/**
 * Comprehensive Performance Benchmarking Suite
 * Measures and tracks performance metrics for Fantasy Map Generator
 * Version: 2.0.0
 */

window.FMGBenchmark = (function() {
  // Benchmark results storage
  const results = {
    history: [],
    current: null,
    baseline: null
  };

  // Performance thresholds for different hardware tiers
  const THRESHOLDS = {
    lowEnd: {
      cells: 50000,
      maxGenTime: 60000,      // 60s max generation
      minFPS: 20,              // 20 FPS minimum
      maxMemoryMB: 500,        // 500 MB max
      name: "Low-End Device"
    },
    midRange: {
      cells: 100000,
      maxGenTime: 40000,       // 40s max generation
      minFPS: 30,              // 30 FPS minimum
      maxMemoryMB: 800,        // 800 MB max
      name: "Mid-Range Device"
    },
    highEnd: {
      cells: 200000,
      maxGenTime: 60000,       // 60s for 200k cells
      minFPS: 45,              // 45 FPS minimum
      maxMemoryMB: 1500,       // 1.5 GB max
      name: "High-End Device"
    }
  };

  /**
   * Detect hardware tier based on navigator API
   */
  function detectHardwareTier() {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4; // GB, Chrome only
    const hasGoodGPU = checkGPUCapability();

    let score = 0;
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;

    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else score += 1;

    if (hasGoodGPU) score += 2;

    if (score >= 7) return 'highEnd';
    if (score >= 4) return 'midRange';
    return 'lowEnd';
  }

  /**
   * Check GPU capability using WebGL
   */
  function checkGPUCapability() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return false;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Check for integrated vs dedicated GPU
        return !renderer.match(/Intel|HD Graphics|UHD/i);
      }
      return true; // Assume decent if can't detect
    } catch (e) {
      return false;
    }
  }

  /**
   * Run a complete benchmark suite
   */
  async function runFullBenchmark(options = {}) {
    const {
      cellCounts = [10000, 25000, 50000],
      includeStressTest = false
    } = options;

    console.log('🔬 Starting Full Benchmark Suite...');
    console.log('================================================');

    const hardwareTier = detectHardwareTier();
    console.log(`Hardware Tier: ${THRESHOLDS[hardwareTier].name}`);
    console.log(`Cores: ${navigator.hardwareConcurrency || 'unknown'}`);
    console.log(`Memory: ${navigator.deviceMemory || 'unknown'} GB`);
    console.log('================================================\n');

    const benchmarkResults = {
      timestamp: Date.now(),
      hardwareTier,
      hardware: {
        cores: navigator.hardwareConcurrency || 0,
        memory: navigator.deviceMemory || 0,
        gpu: checkGPUCapability() ? 'Dedicated' : 'Integrated'
      },
      tests: []
    };

    for (const cellCount of cellCounts) {
      console.log(`\n📊 Testing ${cellCount.toLocaleString()} cells...`);

      try {
        const result = await benchmarkGeneration(cellCount);
        benchmarkResults.tests.push(result);

        // Display results
        displayBenchmarkResult(result, THRESHOLDS[hardwareTier]);

        // Wait between tests to allow GC
        await sleep(2000);
      } catch (error) {
        console.error(`❌ Failed benchmark for ${cellCount} cells:`, error);
        benchmarkResults.tests.push({
          cellCount,
          error: error.message,
          passed: false
        });
      }
    }

    // Stress test for high-end hardware
    if (includeStressTest && hardwareTier === 'highEnd') {
      console.log('\n🔥 Running Stress Test (150k cells)...');
      try {
        const result = await benchmarkGeneration(150000);
        benchmarkResults.tests.push({...result, isStressTest: true});
        displayBenchmarkResult(result, THRESHOLDS[hardwareTier]);
      } catch (error) {
        console.error('❌ Stress test failed:', error);
      }
    }

    // Store results
    results.history.push(benchmarkResults);
    results.current = benchmarkResults;

    // Generate summary
    generateBenchmarkSummary(benchmarkResults);

    return benchmarkResults;
  }

  /**
   * Benchmark a single map generation
   */
  async function benchmarkGeneration(cellCount) {
    // Prepare
    const seed = `benchmark_${cellCount}_${Date.now()}`;

    // Clear existing map
    if (typeof undraw === 'function') {
      undraw();
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Capture initial memory
    const memBefore = getMemoryUsage();

    // Store original value and set test value
    const originalPoints = document.getElementById('pointsInput');
    const originalValue = originalPoints.value;

    // Calculate points needed for cellCount
    const graphWidth = +document.getElementById('mapWidthInput')?.value || 1000;
    const graphHeight = +document.getElementById('mapHeightInput')?.value || 800;
    const spacing = Math.sqrt((graphWidth * graphHeight) / cellCount);

    // Set the cell count
    originalPoints.dataset.cells = cellCount;

    // Detailed timing breakdown
    const timings = {
      total: 0,
      heightmap: 0,
      voronoi: 0,
      features: 0,
      rivers: 0,
      states: 0,
      rendering: 0
    };

    // Performance observers
    const perfObserver = {
      entries: []
    };

    if (window.PerformanceObserver) {
      const obs = new PerformanceObserver((list) => {
        perfObserver.entries.push(...list.getEntries());
      });
      obs.observe({ entryTypes: ['measure'] });
    }

    console.time('Total Generation');
    const startTime = performance.now();

    try {
      // Generate map
      await generate();

      timings.total = performance.now() - startTime;
      console.timeEnd('Total Generation');

      // Extract timing from performance entries
      perfObserver.entries.forEach(entry => {
        if (entry.name.includes('heightmap')) timings.heightmap += entry.duration;
        if (entry.name.includes('Delaunay') || entry.name.includes('Voronoi')) timings.voronoi += entry.duration;
        if (entry.name.includes('features')) timings.features += entry.duration;
        if (entry.name.includes('rivers') || entry.name.includes('Rivers')) timings.rivers += entry.duration;
        if (entry.name.includes('state') || entry.name.includes('culture')) timings.states += entry.duration;
        if (entry.name.includes('draw') || entry.name.includes('render')) timings.rendering += entry.duration;
      });

      // Measure FPS during zoom operations
      const fpsResults = await measureFPS(3000); // 3 seconds

      // Capture final memory
      const memAfter = getMemoryUsage();
      const memDelta = memAfter - memBefore;

      // Collect SVG metrics
      const svgMetrics = collectSVGMetrics();

      // Restore original value
      originalPoints.value = originalValue;

      return {
        cellCount,
        seed,
        timings,
        fps: fpsResults,
        memory: {
          before: memBefore,
          after: memAfter,
          delta: memDelta
        },
        svg: svgMetrics,
        passed: true,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Generation failed:', error);
      originalPoints.value = originalValue;
      throw error;
    }
  }

  /**
   * Measure FPS during zoom operations
   */
  async function measureFPS(duration = 3000) {
    return new Promise((resolve) => {
      const frames = [];
      let lastTime = performance.now();
      let animationId;
      const startTime = performance.now();

      // Perform zoom operations
      const originalScale = scale;
      let zoomDirection = 1;
      let zoomStep = 0;

      function measureFrame() {
        const currentTime = performance.now();
        const delta = currentTime - lastTime;
        const fps = 1000 / delta;
        frames.push(fps);
        lastTime = currentTime;

        // Simulate zoom in/out
        zoomStep++;
        if (zoomStep % 30 === 0) {
          zoomDirection *= -1;
        }
        scale = originalScale + (zoomDirection * 0.1);
        if (typeof invokeActiveZooming === 'function') {
          invokeActiveZooming();
        }

        if (currentTime - startTime < duration) {
          animationId = requestAnimationFrame(measureFrame);
        } else {
          // Restore original scale
          scale = originalScale;
          if (typeof invokeActiveZooming === 'function') {
            invokeActiveZooming();
          }

          // Calculate statistics
          const avgFPS = frames.reduce((a, b) => a + b, 0) / frames.length;
          const minFPS = Math.min(...frames);
          const maxFPS = Math.max(...frames);
          const p50 = percentile(frames, 50);
          const p95 = percentile(frames, 95);

          resolve({
            avg: avgFPS,
            min: minFPS,
            max: maxFPS,
            p50: p50,
            p95: p95,
            samples: frames.length
          });
        }
      }

      animationId = requestAnimationFrame(measureFrame);
    });
  }

  /**
   * Get current memory usage
   */
  function getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  /**
   * Collect SVG metrics
   */
  function collectSVGMetrics() {
    const svg = document.getElementById('map');
    if (!svg) return {};

    return {
      totalElements: svg.querySelectorAll('*').length,
      paths: svg.querySelectorAll('path').length,
      texts: svg.querySelectorAll('text').length,
      groups: svg.querySelectorAll('g').length,
      use: svg.querySelectorAll('use').length
    };
  }

  /**
   * Display benchmark result
   */
  function displayBenchmarkResult(result, threshold) {
    const { cellCount, timings, fps, memory, svg } = result;

    console.log('─────────────────────────────────────');
    console.log(`✅ Cells: ${cellCount.toLocaleString()}`);
    console.log(`⏱️  Generation Time: ${(timings.total / 1000).toFixed(2)}s`);

    if (timings.heightmap > 0) {
      console.log(`   ├─ Heightmap: ${(timings.heightmap / 1000).toFixed(2)}s`);
    }
    if (timings.voronoi > 0) {
      console.log(`   ├─ Voronoi: ${(timings.voronoi / 1000).toFixed(2)}s`);
    }
    if (timings.rivers > 0) {
      console.log(`   ├─ Rivers: ${(timings.rivers / 1000).toFixed(2)}s`);
    }
    if (timings.rendering > 0) {
      console.log(`   └─ Rendering: ${(timings.rendering / 1000).toFixed(2)}s`);
    }

    console.log(`📊 FPS: avg=${fps.avg.toFixed(1)} min=${fps.min.toFixed(1)} p95=${fps.p95.toFixed(1)}`);

    if (memory.delta > 0) {
      console.log(`💾 Memory: ${memory.delta.toFixed(1)} MB (${memory.after.toFixed(1)} MB total)`);
    }

    console.log(`🎨 SVG Elements: ${svg.totalElements?.toLocaleString() || 'N/A'} (${svg.paths || 0} paths)`);

    // Check against threshold
    const genPass = timings.total <= threshold.maxGenTime;
    const fpsPass = fps.avg >= threshold.minFPS;
    const memPass = memory.after <= threshold.maxMemoryMB;

    console.log('\n📈 Performance Rating:');
    console.log(`   ${genPass ? '✅' : '❌'} Generation: ${(timings.total / 1000).toFixed(1)}s / ${(threshold.maxGenTime / 1000).toFixed(1)}s`);
    console.log(`   ${fpsPass ? '✅' : '❌'} FPS: ${fps.avg.toFixed(1)} / ${threshold.minFPS}`);
    if (memory.after > 0) {
      console.log(`   ${memPass ? '✅' : '❌'} Memory: ${memory.after.toFixed(1)}MB / ${threshold.maxMemoryMB}MB`);
    }
  }

  /**
   * Generate benchmark summary
   */
  function generateBenchmarkSummary(benchmarkResults) {
    console.log('\n\n================================================');
    console.log('📊 BENCHMARK SUMMARY');
    console.log('================================================\n');

    const { tests, hardwareTier } = benchmarkResults;
    const passed = tests.filter(t => t.passed).length;
    const total = tests.length;

    console.log(`Hardware: ${THRESHOLDS[hardwareTier].name}`);
    console.log(`Tests Passed: ${passed}/${total}\n`);

    // Calculate averages
    const validTests = tests.filter(t => t.passed);
    if (validTests.length > 0) {
      const avgGenTime = validTests.reduce((sum, t) => sum + t.timings.total, 0) / validTests.length;
      const avgFPS = validTests.reduce((sum, t) => sum + t.fps.avg, 0) / validTests.length;
      const avgMemory = validTests.reduce((sum, t) => sum + t.memory.delta, 0) / validTests.length;

      console.log('Average Metrics:');
      console.log(`  Generation Time: ${(avgGenTime / 1000).toFixed(2)}s`);
      console.log(`  FPS: ${avgFPS.toFixed(1)}`);
      if (avgMemory > 0) {
        console.log(`  Memory Usage: ${avgMemory.toFixed(1)} MB`);
      }
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    const slowTests = tests.filter(t => t.passed && t.fps.avg < 30);
    if (slowTests.length > 0) {
      console.log(`  ⚠️  Low FPS detected on ${slowTests.length} test(s)`);
      console.log('     → Enable Canvas Hybrid Rendering');
      console.log('     → Enable Level-of-Detail System');
    }

    const memTests = tests.filter(t => t.passed && t.memory.after > 500);
    if (memTests.length > 0) {
      console.log(`  ⚠️  High memory usage on ${memTests.length} test(s)`);
      console.log('     → Enable Memory Compression');
      console.log('     → Use Spatial Partitioning');
    }

    console.log('\n================================================\n');

    return benchmarkResults;
  }

  /**
   * Compare two benchmark runs
   */
  function compareBenchmarks(before, after) {
    console.log('\n📊 BENCHMARK COMPARISON');
    console.log('================================================\n');

    const beforeTests = before.tests.filter(t => t.passed);
    const afterTests = after.tests.filter(t => t.passed);

    if (beforeTests.length === 0 || afterTests.length === 0) {
      console.log('❌ Insufficient data for comparison');
      return;
    }

    // Match tests by cell count
    beforeTests.forEach(beforeTest => {
      const afterTest = afterTests.find(t => t.cellCount === beforeTest.cellCount);
      if (!afterTest) return;

      const cellCount = beforeTest.cellCount;
      console.log(`\n🔍 ${cellCount.toLocaleString()} cells:`);

      // Generation time comparison
      const genImprovement = ((beforeTest.timings.total - afterTest.timings.total) / beforeTest.timings.total * 100);
      console.log(`  Generation: ${(beforeTest.timings.total / 1000).toFixed(2)}s → ${(afterTest.timings.total / 1000).toFixed(2)}s (${genImprovement > 0 ? '+' : ''}${genImprovement.toFixed(1)}%)`);

      // FPS comparison
      const fpsImprovement = ((afterTest.fps.avg - beforeTest.fps.avg) / beforeTest.fps.avg * 100);
      console.log(`  FPS: ${beforeTest.fps.avg.toFixed(1)} → ${afterTest.fps.avg.toFixed(1)} (${fpsImprovement > 0 ? '+' : ''}${fpsImprovement.toFixed(1)}%)`);

      // Memory comparison
      if (beforeTest.memory.delta > 0 && afterTest.memory.delta > 0) {
        const memImprovement = ((beforeTest.memory.delta - afterTest.memory.delta) / beforeTest.memory.delta * 100);
        console.log(`  Memory: ${beforeTest.memory.delta.toFixed(1)}MB → ${afterTest.memory.delta.toFixed(1)}MB (${memImprovement > 0 ? '+' : ''}${memImprovement.toFixed(1)}%)`);
      }
    });

    console.log('\n================================================\n');
  }

  /**
   * Set baseline for comparison
   */
  function setBaseline(benchmarkResults = results.current) {
    results.baseline = benchmarkResults;
    console.log('✅ Baseline set');
    return benchmarkResults;
  }

  /**
   * Export results to JSON
   */
  function exportResults() {
    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fmg-benchmark-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✅ Results exported');
  }

  // Utility functions
  function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (p / 100)) - 1;
    return sorted[index];
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  return {
    runFullBenchmark,
    benchmarkGeneration,
    compareBenchmarks,
    setBaseline,
    exportResults,
    detectHardwareTier,
    getResults: () => results,
    THRESHOLDS
  };
})();

// Make available in console
if (typeof window !== 'undefined') {
  window.benchmark = window.FMGBenchmark;
}

console.log('✅ Benchmark Suite loaded. Use: benchmark.runFullBenchmark()');
