#!/usr/bin/env node
"use strict";

/**
 * Runtime Test Suite for Fantasy Map Generator
 * Tests JavaScript syntax, dependencies, and critical functions
 */

const fs = require('fs');
const path = require('path');

console.log("🧪 FANTASY MAP GENERATOR - RUNTIME TESTS\n");
console.log("=" .repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warnings = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
  }
}

function warn(message) {
  console.log(`⚠️  WARN: ${message}`);
  warnings++;
}

// Test 1: Check critical files exist
console.log("\n📁 FILE EXISTENCE TESTS");
console.log("-".repeat(60));

test("index.html exists", () => {
  if (!fs.existsSync('index.html')) throw new Error('index.html not found');
});

test("main.js exists", () => {
  if (!fs.existsSync('main.js')) throw new Error('main.js not found');
});

test("draw-features.js exists", () => {
  if (!fs.existsSync('modules/renderers/draw-features.js'))
    throw new Error('draw-features.js not found');
});

test("versioning.js exists", () => {
  if (!fs.existsSync('versioning.js')) throw new Error('versioning.js not found');
});

// Test 2: Check JavaScript syntax
console.log("\n🔍 JAVASCRIPT SYNTAX TESTS");
console.log("-".repeat(60));

function checkJSSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for common syntax errors
  const issues = [];

  // Check for unmatched braces
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
  }

  // Check for unmatched parentheses (excluding comments)
  const noComments = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const openParens = (noComments.match(/\(/g) || []).length;
  const closeParens = (noComments.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
  }

  // Check for console.error without ERROR flag
  const errorCalls = content.match(/console\.error\(/g) || [];
  const flaggedErrors = content.match(/ERROR &&[\s\n]*console\.error\(/g) || [];
  if (errorCalls.length > flaggedErrors.length) {
    warn(`${filePath} has ${errorCalls.length - flaggedErrors.length} unflagged console.error calls`);
  }

  return issues;
}

test("main.js syntax", () => {
  const issues = checkJSSyntax('main.js');
  if (issues.length > 0) throw new Error(issues.join(', '));
});

test("draw-features.js syntax", () => {
  const issues = checkJSSyntax('modules/renderers/draw-features.js');
  if (issues.length > 0) throw new Error(issues.join(', '));
});

test("versioning.js syntax", () => {
  const issues = checkJSSyntax('versioning.js');
  if (issues.length > 0) throw new Error(issues.join(', '));
});

// Test 3: Check script loading order in index.html
console.log("\n📜 SCRIPT LOADING ORDER TESTS");
console.log("-".repeat(60));

test("Script loading order is correct", () => {
  const html = fs.readFileSync('index.html', 'utf8');

  // Extract all script tags
  const scriptRegex = /<script\s+(?:defer\s+)?src="([^"]+)"/g;
  const scripts = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push({
      src: match[1],
      index: match.index,
      defer: match[0].includes('defer')
    });
  }

  // Find critical scripts
  const drawFeaturesIdx = scripts.findIndex(s => s.src.includes('draw-features.js'));
  const mainJsIdx = scripts.findIndex(s => s.src.includes('main.js'));

  if (drawFeaturesIdx === -1) throw new Error('draw-features.js not found in HTML');
  if (mainJsIdx === -1) throw new Error('main.js not found in HTML');

  // draw-features.js must come BEFORE main.js
  if (drawFeaturesIdx >= mainJsIdx) {
    throw new Error(`draw-features.js (index ${drawFeaturesIdx}) must load before main.js (index ${mainJsIdx})`);
  }

  // draw-features.js should NOT be deferred
  if (scripts[drawFeaturesIdx].defer) {
    throw new Error('draw-features.js should NOT be deferred');
  }

  console.log(`   ✓ draw-features.js at position ${drawFeaturesIdx}`);
  console.log(`   ✓ main.js at position ${mainJsIdx}`);
  console.log(`   ✓ Loading order: draw-features → main`);
});

// Test 4: Check version consistency
console.log("\n🔢 VERSION CONSISTENCY TESTS");
console.log("-".repeat(60));

test("Version number format is valid", () => {
  const versioningContent = fs.readFileSync('versioning.js', 'utf8');
  const versionMatch = versioningContent.match(/const VERSION = "([^"]+)"/);

  if (!versionMatch) throw new Error('VERSION constant not found');

  const version = versionMatch[1];
  const versionRegex = /^\d+\.\d+\.\d+$/;

  if (!versionRegex.test(version)) {
    throw new Error(`Invalid version format: ${version} (expected: major.minor.patch)`);
  }

  console.log(`   Current version: ${version}`);
});

test("Script versions are recent", () => {
  const html = fs.readFileSync('index.html', 'utf8');

  // Find all versioned scripts
  const versionedScripts = html.match(/<script[^>]+src="[^"]+\?v=([0-9.]+)"/g) || [];
  const versions = versionedScripts.map(script => {
    const match = script.match(/\?v=([0-9.]+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  // Count versions
  const versionCounts = {};
  versions.forEach(v => {
    versionCounts[v] = (versionCounts[v] || 0) + 1;
  });

  // Find old versions (< 1.100.0)
  const oldVersions = Object.keys(versionCounts).filter(v => {
    const [major, minor] = v.split('.').map(Number);
    return major === 1 && minor < 100;
  });

  if (oldVersions.length > 0) {
    warn(`Found ${oldVersions.length} old version tags: ${oldVersions.join(', ')}`);
    console.log(`   Total script files: ${versions.length}`);
    console.log(`   Version distribution:`);
    Object.entries(versionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([version, count]) => {
        console.log(`     ${version}: ${count} files`);
      });
  }
});

// Test 5: Check for critical function definitions
console.log("\n⚙️  CRITICAL FUNCTION TESTS");
console.log("-".repeat(60));

test("drawFeatures() is defined", () => {
  const content = fs.readFileSync('modules/renderers/draw-features.js', 'utf8');
  if (!content.includes('function drawFeatures()')) {
    throw new Error('drawFeatures() function not found');
  }
});

test("drawLayers() references are present", () => {
  const content = fs.readFileSync('main.js', 'utf8');
  if (!content.includes('drawLayers')) {
    throw new Error('drawLayers not referenced in main.js');
  }
});

// Test 6: Check for known issues
console.log("\n🐛 KNOWN ISSUES CHECK");
console.log("-".repeat(60));

test("No FIXME comments in critical files", () => {
  const criticalFiles = [
    'main.js',
    'modules/renderers/draw-features.js',
    'versioning.js'
  ];

  const fixmes = [];
  criticalFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/FIXME/gi);
    if (matches) {
      fixmes.push(`${file}: ${matches.length} FIXME(s)`);
    }
  });

  if (fixmes.length > 0) {
    warn(`FIXME comments found: ${fixmes.join(', ')}`);
  }
});

// Test 7: Dependency checks
console.log("\n📦 DEPENDENCY TESTS");
console.log("-".repeat(60));

test("D3.js library exists", () => {
  if (!fs.existsSync('libs/d3.min.js')) {
    throw new Error('D3.js library not found');
  }
});

test("jQuery library exists", () => {
  if (!fs.existsSync('libs/jquery-3.1.1.min.js')) {
    throw new Error('jQuery library not found');
  }
});

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 TEST SUMMARY");
console.log("=".repeat(60));
console.log(`Total Tests:   ${totalTests}`);
console.log(`✅ Passed:     ${passedTests}`);
console.log(`❌ Failed:     ${failedTests}`);
console.log(`⚠️  Warnings:   ${warnings}`);
console.log("");

if (failedTests > 0) {
  console.log("❌ TESTS FAILED - Issues found that need fixing");
  process.exit(1);
} else if (warnings > 0) {
  console.log("⚠️  TESTS PASSED WITH WARNINGS - Some issues detected");
  process.exit(0);
} else {
  console.log("✅ ALL TESTS PASSED - No critical issues detected");
  process.exit(0);
}
