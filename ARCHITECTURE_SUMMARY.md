# Fantasy Map Generator - Architecture Quick Summary

## Architecture Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         INDEX.HTML                              │
│                    jQuery UI + D3.js + SVG                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                         MAIN.JS                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Global State (grid, pack, options, seed, etc)          │    │
│  │ Zoom/Pan Handler                                       │    │
│  │ Generate() Pipeline Orchestrator                       │    │
│  │ Load/Save Coordination                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────┬───────────────────────────┬───────────────────────┘
              │                           │
       ┌──────▼────────────┐      ┌───────▼────────────┐
       │  GENERATION       │      │  RENDERING         │
       │  PIPELINE         │      │  SYSTEM            │
       │                   │      │                    │
       │ ┌───────────────┐ │      │ ┌────────────────┐ │
       │ │ Grid Phase    │ │      │ │ Layer Mgmt     │ │
       │ │ - Voronoi     │ │      │ │ (layers.js)    │ │
       │ │ - Heights     │ │      │ │                │ │
       │ │ - Features    │ │      │ │ - drawLayers() │ │
       │ └───────────────┘ │      │ │ - toggles      │ │
       │         │         │      │ │ - presets      │ │
       │ ┌───────▼───────────┐   │ └────────────────┘ │
       │ │ Pack Phase    │ │      │         │         │
       │ │ - Rivers      │ │      │ ┌───────▼──────────┐│
       │ │ - Cultures    │ │      │ │ Renderers        ││
       │ │ - States      │ │      │ │ (modules/        ││
       │ │ - Burgs       │ │      │ │  renderers/*.js) ││
       │ │ - Religions   │ │      │ │                  ││
       │ │ - Provinces   │ │      │ │ - draw-features  ││
       │ │ - Military    │ │      │ │ - draw-borders   ││
       │ │ - Markers     │ │      │ │ - draw-burg-*    ││
       │ └───────┬───────────┘   │ │ - draw-military  ││
       │         │         │      │ │ - draw-rivers    ││
       │ ┌───────▼──────┐        │ │ - draw-temp *    ││
       │ │ Data in      │        │ │ - ... 15+ more   ││
       │ │ pack, grid   │        │ │                  ││
       │ │             │        │ └──────────────────┘│
       │ └───────┬──────┘        │         │         │
       │         │                │   ┌──────▼──────┐│
       │         │                │   │   SVG DOM   ││
       │         │                │   │  (map view) ││
       │         │                │   └─────────────┘│
       └─────────┼────────────────┴────────────────────┘
                 │
       ┌─────────▼─────────────────┐
       │   UI INTERACTION          │
       │   (modules/ui/)           │
       │                           │
       │ ┌────────────────────┐   │
       │ │ editors.js         │   │
       │ │ - clicked()        │   │
       │ │ - addBurg()        │   │
       │ │ - edit functions   │   │
       │ └────────────────────┘   │
       │          │               │
       │ ┌────────▼────────────┐  │
       │ │ Various Editors    │  │
       │ │ - burg-editor      │  │
       │ │ - rivers-editor    │  │
       │ │ - lakes-editor     │  │
       │ │ - ... many more    │  │
       │ └────────────────────┘  │
       │          │               │
       │ ┌────────▼─────────────┐ │
       │ │ Dialog Pattern       │ │
       │ │ (jQuery UI)          │ │
       │ │ Modify global state  │ │
       │ │ Re-render affected   │ │
       │ └──────────────────────┘ │
       └───────────────────────────┘
                 │
       ┌─────────▼──────────────────┐
       │  DATA PERSISTENCE          │
       │  (modules/io/)             │
       │                            │
       │ ┌────────────────────────┐ │
       │ │ save.js                │ │
       │ │ - prepareMapData()     │ │
       │ │ - saveToStorage()      │ │
       │ │ - saveToMachine()      │ │
       │ │ - saveToDropbox()      │ │
       │ │ - initiateAutosave()   │ │
       │ └────────────────────────┘ │
       │                            │
       │ ┌────────────────────────┐ │
       │ │ load.js                │ │
       │ │ - uploadMap()          │ │
       │ │ - parseMap()           │ │
       │ └────────────────────────┘ │
       │                            │
       │ ┌────────────────────────┐ │
       │ │ Storage                │ │
       │ │ - IndexedDB (lastMap)  │ │
       │ │ - localStorage (UI)    │ │
       │ │ - Dropbox (cloud)      │ │
       │ └────────────────────────┘ │
       └────────────────────────────┘
```

---

## Data Flow Diagram

```
START: checkLoadParameters()
  │
  ├─► LOAD FROM URL maplink ──┐
  ├─► LOAD FROM SEED ─────────┤
  ├─► LOAD FROM IndexedDB ────┤
  └─► GENERATE NEW ───────────┼─► generate()
                               │
                    ┌──────────▼─────────────┐
                    │   SET SEED & OPTIONS  │
                    └──────────┬─────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         │                                           │
    ┌────▼─────────────┐              ┌─────────────▼─────┐
    │  GRID GENERATION │              │ GLOBAL STATE      │
    │                  │              │                   │
    │ • generateGrid() │◄─────────────► grid.cells.*      │
    │ • Heights        │              │ grid.points       │
    │ • Features       │              │ grid.features     │
    │ • Temperatures   │              │                   │
    │ • Precipitation  │              │ pack = {}         │
    └────┬─────────────┘              │ (empty initially) │
         │                            └─────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  PACK GENERATION          │
    │                           │
    │ • reGraph() ──────────────► pack.vertices
    │ • Features.markupPack()   │ pack.cells.*
    │ • Rivers.generate()       │ pack.rivers
    │ • Cultures.generate() ────► pack.cultures
    │ • BurgsAndStates.generate() ► pack.burgs
    │ • Routes.generate() ──────► pack.routes
    │ • Religions.generate() ───► pack.religions
    │ • Provinces.generate() ───► pack.provinces
    │ • Military.generate() ────► pack armies/regiments
    │ • Markers.generate() ─────► pack.markers
    │ • Zones.generate() ───────► pack.zones
    └────┬──────────────────────┘
         │
    ┌────▼──────────────────┐
    │  GENERATION COMPLETE  │
    │                       │
    │ showStatistics()      │
    │ mapHistory[]          │
    └────┬──────────────────┘
         │
    ┌────▼───────────────────┐
    │  applyLayersPreset()   │
    └────┬───────────────────┘
         │
    ┌────▼──────────────────┐
    │  drawLayers()         │
    │                       │
    │ drawFeatures() ──────► svg #featurePaths
    │ drawHeightmap() ─────► svg #terrs
    │ drawBiomes() ────────► svg #biomes
    │ drawBorders() ───────► svg #borders
    │ ... 17+ more ────────► SVG #layers
    │                       │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────────┐
    │  RENDERING COMPLETE       │
    │  Map visible in SVG DOM   │
    └────────────────────────────┘
```

---

## Module Communication Pattern

```
┌──────────────────────────────────────────────────────────┐
│                    MAIN.JS (globals)                     │
│  grid, pack, seed, options, mapCoordinates, etc         │
└──────────────────────────────────────────────────────────┘
         ▲                    ▲                   ▲
         │                    │                   │
         │ reads/writes       │ reads/writes      │ reads
         │ global state       │ global state      │ global state
         │                    │                   │
    ┌────┴─────────────┐  ┌────────┴──────┐  ┌───────┴──────────┐
    │ GENERATORS       │  │ RENDERERS    │  │ EDITORS/UI       │
    │ (modules/*.js)   │  │ (modules/    │  │ (modules/ui/)    │
    │                  │  │  renderers/) │  │                  │
    │ • Rivers         │  │              │  │ • clicked()      │
    │ • Cultures       │  │ • draw-*     │  │ • editBurg()     │
    │ • States         │  │   functions  │  │ • various        │
    │ • Burgs          │  │              │  │   editors        │
    │ • Religions      │  │ Each renders │  │ • toggles        │
    │ • Provinces      │  │ a specific   │  │ • dialogs        │
    │ • Military       │  │ layer        │  │                  │
    │ • Routes         │  │              │  │ Modify state ►   │
    │ • Markers        │  │              │  │ Call render      │
    │ • Zones          │  │              │  │                  │
    │                  │  │              │  │                  │
    │ No inter-module  │  │ No inter-    │  │ No inter-module  │
    │ communication    │  │ module       │  │ communication    │
    │ All via globals  │  │ comms        │  │ (except via UI)  │
    └──────────────────┘  └──────────────┘  └──────────────────┘
```

---

## Current Event System (None!)

```
                    Manual Function Calls
                    ↓
    ┌───────────────┴───────────────┐
    │                               │
User clicks element on map          UI button click
    ↓                               ↓
clicked() in editors.js    → toggleHeight() in layers.js
    ↓                               ↓
Identify element type         Check if layer visible
    ↓                               ↓
Call edit function              Call draw function
    ↓                               ↓
editBurg()               →    drawHeightmap()
    ↓                               ↓
Open jQuery UI Dialog       Direct SVG DOM manipulation
    ↓                               ↓
User modifies data          Layer added/removed from SVG
    ↓                               ↓
Save to pack/grid           Visual map updated
    ↓
Manually call re-render
if needed


⚠️  NO HOOKS, NO EVENTS, NO OBSERVERS
⚠️  Direct global state mutation
⚠️  Hard to coordinate between modules
⚠️  Cannot extend without modifying core
```

---

## Proposed Hook Integration

```
                        Hooks System
        ┌───────────────────────────────┬─────────────┐
        │                               │             │
    Generator Hooks          Rendering Hooks    UI Hooks
        │                               │             │
    ┌───▼────────────┐            ┌────▼────────┐  ┌▼──────────────┐
    │ beforeGenerate │            │beforeRender │  │onElementSelect│
    │ afterHeightmap │            │afterRender  │  │onElementEdit  │
    │ afterRivers    │            │customLayer  │  │onElementChange│
    │ afterCultures  │            │             │  │onEditorOpen   │
    │ afterStates    │            │             │  │onEditorSave   │
    │ afterBurgs     │            │             │  │               │
    │ ... (25 total) │            │             │  │               │
    └───┬────────────┘            └────┬────────┘  └┬──────────────┘
        │                               │           │
        │                               │           │
    Plugins can:                 Plugins can:   Plugins can:
    • Validate data              • Add overlays • Validate edits
    • Post-process               • Filter data  • Coordinate UIs
    • Add calculations           • Custom      • Dependent updates
    • Conditional gen            • Styling
    • Derived data
```

---

## Current Issues & Gaps

| Aspect | Current State | Problem | Solution |
|--------|---------------|---------|----------|
| **Event System** | None | Can't intercept operations | Add Hooks system |
| **Module Communication** | Global state | Tight coupling | Hooks for coordination |
| **Extensibility** | None | Must modify core | Plugin system via hooks |
| **Error Handling** | Limited | Generation fails silently | Error hooks + validation |
| **Performance** | Good but static | Can't optimize selectively | Performance hooks |
| **Custom Rendering** | Not possible | Can't add user layers | Custom layer hooks |
| **Data Validation** | None | Bad data corrupts map | Validation hooks |
| **Undo/Redo** | Not in UI (exists internally) | Hard to track changes | State snapshot hooks |

---

## Key Statistics

| Metric | Count |
|--------|-------|
| Total JS Files | 90+ |
| Generator Modules | 12 |
| Renderer Modules | 15+ |
| UI Editor Modules | 30+ |
| Generation Steps | 34 |
| Rendering Layers | 25+ |
| Global State Variables | 15+ |
| Lines of main.js | 1544 |
| Lines of all modules/ | 10000+ |

---

## Most Critical Integration Points for Hooks

### Ranked by Impact × Effort

1. **Generation Lifecycle** (main.js)
   - Impact: 9/10
   - Effort: 2/10
   - Priority: ⭐⭐⭐⭐⭐

2. **Layer Rendering** (modules/ui/layers.js)
   - Impact: 9/10
   - Effort: 3/10
   - Priority: ⭐⭐⭐⭐⭐

3. **Data Persistence** (modules/io/)
   - Impact: 8/10
   - Effort: 4/10
   - Priority: ⭐⭐⭐⭐

4. **UI Interactions** (modules/ui/editors.js)
   - Impact: 7/10
   - Effort: 3/10
   - Priority: ⭐⭐⭐⭐

5. **Entity Modifications** (throughout)
   - Impact: 6/10
   - Effort: 5/10
   - Priority: ⭐⭐⭐

---

## Conclusion

**The Fantasy Map Generator is a well-engineered procedural generation system**, but it lacks:
1. Extensibility hooks
2. Formal event system
3. Plugin architecture

**Implementing hooks would cost ~60 hours of development** but would:
- Unlock third-party plugin development
- Improve code maintainability
- Enable better testing
- Allow users to extend without modifying core

**Recommended first step**: Create `modules/hooks.js` with a simple EventEmitter, then add hooks to the generation pipeline in `main.js`. This alone would provide significant extensibility.

