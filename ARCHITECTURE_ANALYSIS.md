# Fantasy Map Generator - Comprehensive Architecture Analysis

## 1. APPLICATION ENTRY POINTS & INITIALIZATION

### Main Entry Point: `/main.js`
- **Purpose**: Application bootstrap, global state initialization, and high-level orchestration
- **Key Initialization Flow**:
  1. D3 and SVG layer setup (lines 48-142)
  2. Global event listeners and zoom behavior (lines 176-194)
  3. DOMContentLoaded event handler (line 240) → `checkLoadParameters()`
  4. Map loading/generation decision (lines 277-319)
  5. On-load generation via `generateMapOnLoad()` (lines 321-390)

### Critical Functions:
- `checkLoadParameters()`: Determines load source (URL maplink, seed, IndexedDB, or random)
- `generateMapOnLoad()`: Orchestrates style application → map generation → layer rendering
- `generate()`: Main generation pipeline (lines 742-887)
- `hideLoading()` / `showLoading()`: UI state management

---

## 2. CORE DATA STRUCTURES

### Primary Global Objects:
```javascript
grid = {
  cells: {
    i: Array,          // cell indices
    p: Array,          // cell positions [x, y]
    c: Array,          // cell neighbors
    h: TypedArray,     // heights
    t: TypedArray,     // type (ocean/land/coast)
    f: TypedArray,     // feature IDs
    temp: TypedArray,  // temperature
    prec: TypedArray   // precipitation
  },
  points: Array,       // voronoi points
  features: Array,     // feature definitions
  spacing: Number,
  cellsX, cellsY: Number,
  boundary: Array,
  cellsDesired: Number
}

pack = {
  cells: {
    // ... all grid.cells properties plus:
    p: Array,          // packed cell positions
    s: TypedArray,     // suitability
    pop: TypedArray,   // population
    biome: TypedArray,
    burg: TypedArray,
    culture: TypedArray,
    state: TypedArray,
    religion: TypedArray,
    province: TypedArray,
    r: TypedArray,     // rivers
    fl: TypedArray,    // water flux
    conf: TypedArray,  // confluences
    haven: TypedArray, // water haven cells
    harbor: TypedArray,// harbor count
    g: TypedArray,     // grid cell reference
  },
  vertices: { p, c, v }, // voronoi vertices
  features: Array,
  cultures: Array,
  states: Array,
  burgs: Array,
  religions: Array,
  provinces: Array,
  rivers: Array,
  routes: Array,
  markers: Array,
  zones: Array
}

// UI State
svg: d3.selection        // SVG root
viewbox: d3.selection    // Main viewbox for zoom
layers: {
  ocean, lakes, landmass, texture, terrs, biomes, cells,
  gridOverlay, coordinates, rivers, terrain, relig, cults,
  regions, statesBody, statesHalo, borders, routes, temperature,
  coastline, ice, population, labels, icons, armies, markers, fogging
}

// Options & Configuration
seed: String
options: { winds, temperatureEquator, etc }
mapCoordinates: { latN, latS, lonE, lonW, latT, lonT }
mapHistory: Array
customization: Number (0=normal, 1=editing)
```

---

## 3. GENERATION PIPELINE

### Sequential Generation Steps (main.js:742-810):
```
1. generate() starts
2. setSeed() → Math.random = aleaPRNG(seed)
3. applyGraphSize()
4. randomizeOptions()
5. generateGrid() or use precreated
6. HeightmapGenerator.generate() → grid.cells.h
7. Features.markupGrid() → mark oceans/lakes/islands
8. addLakesInDeepDepressions()
9. openNearSeaLakes()
10. OceanLayers()
11. defineMapSize()
12. calculateMapCoordinates()
13. calculateTemperatures() → grid.cells.temp
14. generatePrecipitation() → grid.cells.prec
15. reGraph() → pack (Voronoi from grid)
16. Features.markupPack() → pack features
17. createDefaultRuler()
18. Rivers.generate() → pack.cells.r, pack.rivers
19. Biomes.define() → pack.cells.biome
20. rankCells() → pack.cells.s (suitability), pack.cells.pop
21. Cultures.generate() → pack.cultures, pack.cells.culture
22. Cultures.expand()
23. BurgsAndStates.generate() → pack.burgs, pack.states
24. Routes.generate() → pack.routes
25. Religions.generate() → pack.religions, pack.cells.religion
26. BurgsAndStates.defineStateForms()
27. Provinces.generate() → pack.provinces, pack.cells.province
28. Provinces.getPoles()
29. BurgsAndStates.defineBurgFeatures()
30. Rivers.specify()
31. Features.specify()
32. Military.generate() → pack armies/regiments
33. Markers.generate() → pack.markers
34. Zones.generate() → pack.zones
```

Each step modifies global state (`grid`, `pack`) that subsequent steps depend on.

---

## 4. RENDERING SYSTEM

### Layer Rendering (modules/ui/layers.js):

**Main Entry Point**: `drawLayers()` - Conditionally calls 20+ drawing functions

```javascript
function drawLayers() {
  drawFeatures()          // Base terrain
  if (layerIsOn("toggleTexture")) drawTexture()
  if (layerIsOn("toggleHeight")) drawHeightmap()
  if (layerIsOn("toggleBiomes")) drawBiomes()
  // ... 20+ more conditional draws
}
```

**Drawing Functions Pattern** (modules/renderers/):
- `draw-features.js`: Base landmass and coastline
- `draw-heightmap.js`: Elevation visualization
- `draw-borders.js`: State and province boundaries
- `draw-burg-icons.js`: City/town markers
- `draw-burg-labels.js`: City names
- `draw-military.js`: Troop positions
- `draw-temperature.js`: Climate visualization
- And ~20 more specialized renderers

**Rendering Characteristics**:
- SVG-based with D3.js
- Direct DOM manipulation
- Layer stacking via SVG group hierarchy
- Conditional rendering based on `layerIsOn()` checks
- Heavy use of D3 selections and data joins

---

## 5. MODULE STRUCTURE & PATTERNS

### Module Types:

**A. Generator Modules** (Window-scoped, IIFE pattern)
```javascript
window.Rivers = (function() {
  const generate = function() { /* ... */ }
  const specify = function() { /* ... */ }
  return { generate, specify }
})()
```
Location: `/modules/*.js`
Examples: Cultures, BurgsAndStates, Routes, Religions, Provinces, Rivers, Military, Markers, Zones

**B. UI Modules** (Window-scoped, variable/function definitions)
```javascript
// modules/ui/layers.js
let presets = {}
function drawLayers() { /* ... */ }
function toggleHeight(event) { /* ... */ }
```
Location: `/modules/ui/*.js`
Examples: layers, editors, options, various editors (burg, rivers, lakes, etc.)

**C. Renderer Modules** (Window-scoped functions)
```javascript
// modules/renderers/draw-features.js
function drawFeatures() { /* ... */ }
```
Location: `/modules/renderers/`

**D. I/O Modules** (Save/Load/Export/Cloud)
Location: `/modules/io/`

**E. Dynamic Modules** (Dynamically imported)
Location: `/modules/dynamic/`

**F. Config Modules**
Location: `/config/`

---

## 6. UI INTERACTION PATTERNS

### Click Event Handling (modules/ui/editors.js):
```javascript
function clicked() {
  // Traverses DOM hierarchy to identify click target
  // Dispatches to appropriate editor:
  if (grand.id === "emblems") editEmblem()
  else if (parent.id === "rivers") editRiver(el.id)
  else if (grand.id === "routes") editRoute(el.id)
  // ... more patterns
}
```

### Dialog Pattern (jQuery UI):
```javascript
// Opens modal dialog for editing
$("#burgEditor").dialog({
  resizable: true,
  title: "Edit Burg",
  width: "32em",
  buttons: {
    Save: function() { /* save changes */ },
    Close: function() { $(this).dialog("close") }
  }
})
```

### Tool Mode System:
- `customization` variable tracks edit mode (0=normal, 1=editing)
- Various tools can be activated: heightmap editor, coastline editor, relief editor
- Mode prevents certain operations (e.g., save during edit)

---

## 7. LAYER MANAGEMENT SYSTEM

### Preset System (modules/ui/layers.js):
```javascript
presets = {
  political: ["toggleBorders", "toggleBurgIcons", ...],
  cultural: ["toggleBorders", "toggleCultures", ...],
  // ... 10+ presets
}

function applyLayersPreset() {
  const preset = localStorage.getItem("preset") || layersPreset.value
  document.querySelectorAll("#mapLayers > li").forEach(el => {
    const shouldBeOn = layers.includes(el.id)
    // toggle class 'buttonoff' to show/hide
  })
}
```

### Layer Toggle Pattern:
- Each layer has corresponding button in `#mapLayers`
- Function name follows pattern: `toggle{LayerName}`
- Functions check visibility and manage rendering
- State stored in localStorage for persistence

---

## 8. STATE PERSISTENCE

### Save/Load System (modules/io/save.js & load.js):

**Save Format**: Pipe-delimited multiline text
```
[0] params: VERSION|license|date|seed|width|height|mapId
[1] settings: ~25 configuration values
[2] coords: JSON of mapCoordinates
[3] biomes: color|habitability|names
[4] notes: JSON of notes array
[5] serializedSVG: Full SVG markup
[6] gridGeneral: JSON of grid structure
[7-31] Cell arrays (heights, precipitation, features, etc.)
[32-37] Pack data (features, cultures, states, burgs, etc.)
```

**Storage Methods**:
- Browser IndexedDB (automatic, with key "lastMap")
- Machine download (as .map file)
- Dropbox cloud sync (via Cloud.providers.dropbox)
- URL parameters (for integration with MFCG)

### Autosave System:
- 5-minute default interval
- Checks customization state before saving
- Persists to IndexedDB only

---

## 9. EXISTING EXTENSIBILITY PATTERNS

### Current Event System:
- **NO formal event emitter** or pub/sub pattern exists
- D3-based event listeners on DOM elements only
- Direct function calls rather than event dispatching
- No hook or callback system

### Data Mutation Patterns:
```javascript
// Direct manipulation of data structures
cells.h[i] = value
pack.burgs.push(newBurg)
states[i].name = newName

// After mutation, re-render affected layers:
if (layerIsOn("toggleBorders")) drawBorders()
```

### Module Communication:
- Primarily via global state (grid, pack, options)
- Cross-module references: Features calls Rivers, Routes, etc.
- No explicit dependency injection

---

## 10. PERFORMANCE OPTIMIZATIONS

### Current Optimizations:
- `layerRenderState`: Tracks rendered vs pending layers
- Viewport culling: `isElementInViewport()` for zoom-dependent rendering
- Debounced zoom handler: 50ms debounce
- Lazy D3 line generation: `d3.line().curve()`
- Typed arrays: Uint8Array, Uint16Array for cell data
- FlatQueue for priority queues

### Performance Monitoring:
```javascript
window.FMGPerformance = {
  measure(),
  logMetrics(),
  startFPSMonitor(),
  compareOptimization(label, fn)
}
```

---

## 11. KEY FILES & THEIR RESPONSIBILITIES

| File | Purpose | Key Functions |
|------|---------|---|
| main.js | Application bootstrap & orchestration | generate(), generateMapOnLoad(), drawLayers() |
| modules/features.js | Land/water feature detection | markupGrid(), markupPack(), specify() |
| modules/river-generator.js | River system generation | generate(), specify() |
| modules/cultures-generator.js | Culture placement & expansion | generate(), expand() |
| modules/burgs-and-states.js | City & state creation | generate(), specifyBurgs(), defineBurgFeatures() |
| modules/ui/layers.js | Layer visibility & rendering | drawLayers(), toggle*(), applyLayersPreset() |
| modules/ui/editors.js | Common editor utilities | clicked(), addBurg(), moveBurg() |
| modules/io/save.js | Map serialization & storage | saveMap(), prepareMapData(), saveToStorage() |
| modules/io/load.js | Map deserialization | uploadMap(), parseMap() |
| modules/renderers/*.js | Layer visualization | draw*() functions for each visual aspect |

---

## 12. ISSUES & TECHNICAL DEBT

### Known Issues (from recent commits):
- Script loading order issues (layers.js fallback mechanism added)
- Rendering bugs with only water visible
- Cache versioning problems
- Module dependency ordering unclear

### Design Issues:
- Global namespace pollution (no module system)
- Tight coupling between generation and rendering
- No clear separation of concerns
- Direct DOM manipulation instead of reactive system
- Limited error handling in generation pipeline
- **NO EVENT SYSTEM** - making it hard to coordinate modules

---

# RECOMMENDED HOOKS FOR EXTENSIBILITY

## Category 1: Generation Lifecycle Hooks ⭐⭐⭐ CRITICAL

```javascript
// Before generation starts
onBeforeGenerate(options)

// After map generated, before rendering
onGenerationComplete(pack, grid)

// After rendering complete
onRenderingComplete()

// After each major generation step
onHeightmapGenerated(heights)
onCulturesGenerated(cultures)
onStatesGenerated(states)
onRiversGenerated(rivers)
onBurgsGenerated(burgs)
// ... etc for all 25 generation steps
```

**Benefits**: Plugins can modify generation parameters, apply post-gen processing, validate data

---

## Category 2: Rendering Hooks ⭐⭐⭐ VERY HIGH PRIORITY

```javascript
// Before/after each layer type renders
onBeforeLayerRender(layerName)   // e.g., 'toggleBiomes'
onAfterLayerRender(layerName)
onLayerVisibilityChanged(layerName, isVisible)

// Before rendering specific entities
onBeforeBurgsRender(burgs)
onBeforeRiversRender(rivers)
onBeforeBordersRender(states, provinces)
onBeforeLabelsRender(labels)

// Custom layer insertion point
onCustomLayerRender(pack, grid)  // User-defined rendering
```

**Benefits**: Custom visualizations, supplementary overlays, custom layer types, filtering

---

## Category 3: UI/Interaction Hooks ⭐⭐ HIGH PRIORITY

```javascript
// Element selection/editing
onElementSelected(elementType, elementId)
onElementEditing(elementType, elementId)
onElementChanged(elementType, elementId, oldData, newData)
onElementDeleted(elementType, elementId)

// Dialog lifecycle
onEditorOpened(editorName, elementId)
onEditorClosed(editorName, elementId, wasSaved)
onBeforeSave(editorName, changedData)
onAfterSave(editorName, savedData)

// Tool mode changes
onToolModeChanged(oldMode, newMode)
onLayerToggled(layerName, isNowVisible)
```

**Benefits**: Custom editors, validation, dependent updates, state synchronization

---

## Category 4: Data Persistence Hooks ⭐⭐ HIGH PRIORITY

```javascript
// Save/Load events
onBeforeSave()
onAfterSave(method)  // method: 'machine', 'storage', 'dropbox'

onBeforeLoad(mapData)
onAfterLoad(pack, grid)

// Export events
onBeforeExport(format)  // format: 'json', 'svg', 'png'
onAfterExport()
```

**Benefits**: Custom export formats, data validation, migration scripts, backup hooks

---

## Category 5: Map Modification Hooks ⭐ MEDIUM PRIORITY

```javascript
// Cell modifications
onCellHeightChanged(cellId, oldHeight, newHeight)
onCellTypeChanged(cellId, oldType, newType)
onCellBiomeChanged(cellId, oldBiome, newBiome)

// Entity creation/deletion
onBurgCreated(burg)
onBurgDeleted(burgId)
onRiverCreated(river)
onRiverDeleted(riverId)

// Relationship changes
onBurgStateChanged(burgId, oldState, newState)
onCellCultureChanged(cellId, oldCulture, newCulture)
onBordersChanged()
onRoutesChanged()
```

**Benefits**: Derived data updates, cascade operations, consistency checks

---

## Category 6: Utility/Configuration Hooks ⭐ LOWER PRIORITY

```javascript
// Options/configuration
onOptionsChanged(oldOptions, newOptions)
onTemplateSelected(templateName)
onSeedChanged(oldSeed, newSeed)

// Zoom/view
onZoomChanged(oldScale, newScale)
onPanChanged(x, y)
onViewportChanged()

// Error handling
onGenerationError(error, stage)
onRenderingError(error, layerName)
onValidationError(error, context)
```

---

# HOOK IMPLEMENTATION STRATEGY

## Phase 1: Core Infrastructure (Required First)
1. Create `modules/hooks.js` module with event system
2. Implement hook registration/deregistration
3. Add async hook support with error handling
4. Create debugging/logging utilities

## Phase 2: Generation Pipeline (High Value)
1. Insert hooks into `generate()` function
2. Add hooks to each major generator module
3. Implement hook chaining

## Phase 3: Rendering System (High Value)
1. Inject hooks into `drawLayers()` function
2. Add per-layer hooks in each renderer
3. Create hook context with render data

## Phase 4: UI System (Medium Value)
1. Add interaction hooks to editor system
2. Create selection hooks in clicked() function
3. Dialog lifecycle hooks in jQuery UI integration

## Phase 5: Data Persistence (High Value)
1. Save/load hooks in IO modules
2. Export hooks for custom formats
3. Version migration hooks

---

# SUGGESTED HOOK ARCHITECTURE

```javascript
// Create single hook system
const Hooks = {
  hooks: {},
  
  register(name, callback, priority = 10) {
    if (!this.hooks[name]) this.hooks[name] = []
    this.hooks[name].push({callback, priority})
    this.hooks[name].sort((a, b) => b.priority - a.priority)
  },
  
  unregister(name, callback) {
    if (!this.hooks[name]) return
    const index = this.hooks[name].findIndex(h => h.callback === callback)
    if (index !== -1) this.hooks[name].splice(index, 1)
  },
  
  async execute(name, ...args) {
    if (!this.hooks[name]) return
    for (const {callback} of this.hooks[name]) {
      try {
        await callback(...args)
      } catch(e) {
        console.error(`Hook ${name} failed:`, e)
      }
    }
  },
  
  filter(name, value) {
    // For hooks that transform data
    let result = value
    for (const {callback} of this.hooks[name] || []) {
      result = callback(result)
    }
    return result
  }
}

// Usage in generation:
async function generate(options) {
  await Hooks.execute('beforeGenerate', options)
  // ... generation code
  await Hooks.execute('afterGenerate', pack, grid)
}

// User registration:
Hooks.register('afterGenerate', async (pack, grid) => {
  console.log('Map generated!', pack.states.length, 'states')
}, 5)
```

---

# SUMMARY

The Fantasy Map Generator is a sophisticated procedural map generation tool with:

1. **Sequential Generation Pipeline**: 34 discrete generation steps that build upon each other
2. **No Existing Event System**: Making it difficult for plugins/extensions to coordinate
3. **Global State Architecture**: All data stored in window-scoped globals (grid, pack, options)
4. **Direct DOM Rendering**: SVG-based with D3.js, no reactive system
5. **Module-per-Feature**: IIFE pattern for generators, simple functions for UI
6. **Strong Performance Focus**: Typed arrays, viewport culling, debouncing

**Hooks would be most valuable in**:
1. **Generation lifecycle** - to modify generation parameters or post-process
2. **Rendering system** - to add custom visualizations
3. **UI interactions** - to coordinate between editors
4. **Data persistence** - to support custom formats
5. **Map modifications** - to maintain consistency and derived data

Implementing a comprehensive hook system would unlock third-party plugin development and make the codebase more maintainable.

