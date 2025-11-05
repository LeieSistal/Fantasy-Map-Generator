#!/usr/bin/env node
"use strict";

/**
 * Dependency Analysis for Fantasy Map Generator
 * Analyzes script dependencies and potential runtime issues
 */

const fs = require('fs');

console.log("🔗 DEPENDENCY ANALYSIS\n");
console.log("=".repeat(60));

// Parse index.html to get script loading order
const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script\s+(?:defer\s+)?src="([^"]+\.js)(?:\?v=[^"]+)?"/g;

const scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  const fullMatch = match[0];
  scripts.push({
    src: match[1],
    index: scripts.length,
    defer: fullMatch.includes('defer'),
    position: fullMatch.includes('defer') ? 'deferred' : 'sync'
  });
}

console.log(`\n📚 Total Scripts: ${scripts.length}`);
console.log(`   Synchronous: ${scripts.filter(s => !s.defer).length}`);
console.log(`   Deferred: ${scripts.filter(s => s.defer).length}`);

// Analyze critical script dependencies
console.log("\n🎯 CRITICAL SCRIPTS ANALYSIS");
console.log("-".repeat(60));

const criticalScripts = [
  { name: 'd3.min.js', required: [] },
  { name: 'jquery-3.1.1.min.js', required: [] },
  { name: 'versioning.js', required: [] },
  { name: 'draw-features.js', required: ['d3.min.js', 'simplify.js', 'polylabel.min.js'] },
  { name: 'main.js', required: ['d3.min.js', 'draw-features.js', 'versioning.js'] }
];

let dependencyIssues = 0;

criticalScripts.forEach(critical => {
  const scriptInfo = scripts.find(s => s.src.includes(critical.name));

  if (!scriptInfo) {
    console.log(`❌ ${critical.name}: NOT FOUND in HTML`);
    dependencyIssues++;
    return;
  }

  console.log(`\n📄 ${critical.name} (position ${scriptInfo.index}, ${scriptInfo.position})`);

  // Check if dependencies are loaded before this script
  critical.required.forEach(dep => {
    const depScript = scripts.find(s => s.src.includes(dep));

    if (!depScript) {
      console.log(`   ❌ Missing dependency: ${dep}`);
      dependencyIssues++;
    } else if (depScript.index > scriptInfo.index) {
      console.log(`   ❌ WRONG ORDER: ${dep} loads AFTER ${critical.name}`);
      console.log(`      ${dep} at position ${depScript.index}`);
      console.log(`      ${critical.name} at position ${scriptInfo.index}`);
      dependencyIssues++;
    } else {
      console.log(`   ✅ ${dep} (position ${depScript.index})`);
    }
  });
});

// Analyze function dependencies in main.js and draw-features.js
console.log("\n\n🔍 FUNCTION DEPENDENCY ANALYSIS");
console.log("-".repeat(60));

const mainJs = fs.readFileSync('main.js', 'utf8');
const drawFeaturesJs = fs.readFileSync('modules/renderers/draw-features.js', 'utf8');

// Check if main.js calls drawFeatures
const drawFeaturesCallsInMain = (mainJs.match(/\bdrawFeatures\s*\(/g) || []).length;
console.log(`\n📞 drawFeatures() calls in main.js: ${drawFeaturesCallsInMain}`);

if (drawFeaturesCallsInMain > 0) {
  console.log("   ✅ main.js uses drawFeatures() - dependency is correct");
} else {
  console.log("   ℹ️  drawFeatures() not directly called in main.js");
}

// Check for critical globals used in draw-features.js
const globalsInDrawFeatures = {
  'd3': (drawFeaturesJs.match(/\bd3\./g) || []).length,
  'pack': (drawFeaturesJs.match(/\bpack\./g) || []).length,
  'simplify': (drawFeaturesJs.match(/\bsimplify\s*\(/g) || []).length,
  'clipPoly': (drawFeaturesJs.match(/\bclipPoly\s*\(/g) || []).length,
  'defs': (drawFeaturesJs.match(/\bdefs\./g) || []).length,
  'coastline': (drawFeaturesJs.match(/\bcoastline\./g) || []).length,
  'lakes': (drawFeaturesJs.match(/\blakes\./g) || []).length
};

console.log("\n📊 Global dependencies in draw-features.js:");
Object.entries(globalsInDrawFeatures).forEach(([name, count]) => {
  if (count > 0) {
    console.log(`   ${name}: ${count} references`);
  }
});

// Check if these globals are defined in main.js
console.log("\n🌐 Global definitions in main.js:");
const globalsDefinedInMain = {
  'd3': mainJs.includes('d3 =') || mainJs.includes('svg = d3.select'),
  'pack': mainJs.includes('pack =') || mainJs.includes('let pack'),
  'defs': mainJs.includes('defs =') || mainJs.includes('let defs'),
  'coastline': mainJs.includes('coastline =') || mainJs.includes('let coastline'),
  'lakes': mainJs.includes('lakes =') || mainJs.includes('let lakes')
};

Object.entries(globalsDefinedInMain).forEach(([name, defined]) => {
  if (globalsInDrawFeatures[name] > 0) {
    if (defined) {
      console.log(`   ✅ ${name} is defined in main.js`);
    } else {
      console.log(`   ⚠️  ${name} might not be defined in main.js`);
    }
  }
});

// Check for potential runtime errors
console.log("\n\n⚠️  POTENTIAL RUNTIME ISSUES");
console.log("-".repeat(60));

let potentialIssues = 0;

// Check for undefined checks
const undefinedChecks = (drawFeaturesJs.match(/=== undefined|!== undefined/g) || []).length;
console.log(`\n🔍 Undefined checks in draw-features.js: ${undefinedChecks}`);
if (undefinedChecks > 0) {
  console.log("   ℹ️  Code has defensive undefined checks - good practice");
}

// Check for ERROR flags
const errorFlags = (drawFeaturesJs.match(/ERROR &&/g) || []).length;
console.log(`\n🚨 ERROR-flagged console calls: ${errorFlags}`);
if (errorFlags > 0) {
  console.log("   ℹ️  Errors are conditionally logged (can be disabled)");
}

// Check for try-catch blocks
const tryCatchBlocks = (drawFeaturesJs.match(/\btry\s*\{/g) || []).length;
console.log(`\n🛡️  Try-catch blocks in draw-features.js: ${tryCatchBlocks}`);
if (tryCatchBlocks === 0) {
  console.log("   ⚠️  No error handling - runtime errors could crash rendering");
  potentialIssues++;
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 DEPENDENCY ANALYSIS SUMMARY");
console.log("=".repeat(60));
console.log(`Dependency Issues:     ${dependencyIssues}`);
console.log(`Potential Problems:    ${potentialIssues}`);
console.log("");

if (dependencyIssues > 0) {
  console.log("❌ CRITICAL: Dependency issues detected!");
  process.exit(1);
} else if (potentialIssues > 0) {
  console.log("⚠️  Some potential issues detected");
  process.exit(0);
} else {
  console.log("✅ All dependencies look good!");
  process.exit(0);
}
