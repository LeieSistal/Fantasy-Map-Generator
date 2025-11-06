# Hooks Integration Recommendations - Quick Reference

## Overview
The Fantasy Map Generator currently has **NO event system or hooks**. All communication between modules happens through direct function calls and global state manipulation. Implementing hooks would dramatically improve extensibility.

## Current Architecture Problems
- ❌ No way for plugins to intercept generation steps
- ❌ No events fired when data changes
- ❌ Tight coupling between modules via global state
- ❌ No standard way to extend rendering
- ❌ Hard to coordinate UI changes across editors
- ❌ No validation/processing points for data mutations

---

## TOP 5 HOOK PRIORITY

### 1. Generation Lifecycle Hooks (CRITICAL)
**Location**: main.js - function generate()
**Hooks to add**:
```javascript
await Hooks.execute('beforeGenerate', options)
await Hooks.execute('afterHeightmapGenerated', grid.cells.h)
await Hooks.execute('afterRiversGenerated', pack.rivers)
await Hooks.execute('afterStatesGenerated', pack.states)
await Hooks.execute('afterGenerationComplete', pack, grid)
```
**Estimated Impact**: 10 new generation extension points

### 2. Rendering Layer Hooks (CRITICAL)
**Location**: modules/ui/layers.js - function drawLayers()
**Hooks to add**:
```javascript
await Hooks.execute('beforeLayerRender', layerName)
drawBiomes() // or whatever
await Hooks.execute('afterLayerRender', layerName)
await Hooks.execute('customLayerRender', pack, grid)
```
**Estimated Impact**: 20+ custom rendering extensions possible

### 3. UI Interaction Hooks (HIGH)
**Location**: modules/ui/editors.js - function clicked()
**Hooks to add**:
```javascript
await Hooks.execute('onElementSelected', elementType, elementId)
// open editor
await Hooks.execute('onElementChanged', elementType, elementId, oldData, newData)
```
**Estimated Impact**: Coordinate editors, validation, dependent UI updates

### 4. Data Persistence Hooks (HIGH)
**Location**: modules/io/save.js, modules/io/load.js
**Hooks to add**:
```javascript
await Hooks.execute('beforeSave')
// ... save process
await Hooks.execute('afterLoad', pack, grid)
```
**Estimated Impact**: Custom save formats, migrations, backups

### 5. Map Modification Hooks (MEDIUM)
**Location**: Throughout editors that modify pack/grid data
**Hooks to add**:
```javascript
await Hooks.execute('onCellHeightChanged', cellId, oldH, newH)
await Hooks.execute('onBurgCreated', burg)
await Hooks.execute('onStateChanged', stateId, oldData, newData)
```
**Estimated Impact**: Cascading updates, derived data, consistency checks

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Create `modules/hooks.js` with EventEmitter class
- [ ] Add global `Hooks` object to main.js
- [ ] Document hook naming conventions

### Week 2: Generation Pipeline
- [ ] Add hooks to generate() main function
- [ ] Add hooks to each of 34 generation steps
- [ ] Test with sample hook implementations

### Week 3: Rendering System
- [ ] Add hooks to drawLayers() function
- [ ] Add hooks to each renderer module
- [ ] Create test custom layer renderer

### Week 4: UI System
- [ ] Add interaction hooks to editors.js
- [ ] Add dialog lifecycle hooks
- [ ] Create sample validation hook

### Week 5: Persistence
- [ ] Add save/load hooks
- [ ] Add export hooks
- [ ] Create custom export format example

### Week 6: Polish & Documentation
- [ ] Hook registry and debugging
- [ ] Hook priority/ordering system
- [ ] Comprehensive examples
- [ ] Plugin development guide

---

## Hook System API

```javascript
// Registration with priority (higher = runs first)
Hooks.register('eventName', callback, priority = 10)

// Async execution with error handling
await Hooks.execute('eventName', arg1, arg2, ...)

// Data transformation hooks
const modified = Hooks.filter('transformEvent', data)

// Unregister
Hooks.unregister('eventName', callback)

// Debug
Hooks.list() // show all registered hooks
Hooks.trace('eventName') // enable tracing for event
```

---

## Example Plugin Architecture

Once hooks are in place, plugins would look like:

```javascript
// my-plugin.js
class MyPlugin {
  activate() {
    // Add custom state calculation after cultures generated
    Hooks.register('afterCulturesGenerated', (cultures) => {
      cultures.forEach(c => {
        c.myCustomField = Math.random()
      })
    }, 5)
    
    // Add custom rendering layer
    Hooks.register('customLayerRender', (pack, grid) => {
      // Draw custom visualization
      viewbox.append('g').attr('id', 'customLayer')
      // ... render code
    })
    
    // Add custom export format
    Hooks.register('beforeExport', (format) => {
      if (format === 'myformat') {
        // Handle custom export
      }
    })
  }
}

const plugin = new MyPlugin()
plugin.activate()
```

---

## Files That Will Need Changes

### Core Files (Required)
- [x] main.js - Add hook calls to generate()
- [x] modules/ui/layers.js - Add hook calls to drawLayers()
- [x] modules/ui/editors.js - Add hook calls to clicked()
- [x] modules/io/save.js - Add before/after save hooks
- [x] modules/io/load.js - Add before/after load hooks

### Generator Files (Add hooks to each)
- [x] modules/features.js
- [x] modules/river-generator.js
- [x] modules/cultures-generator.js
- [x] modules/burgs-and-states.js
- [x] modules/religions-generator.js
- [x] modules/provinces-generator.js
- [x] modules/military-generator.js
- [x] modules/markers-generator.js

### Renderer Files (Add before/after hooks)
- [x] modules/renderers/draw-features.js
- [x] modules/renderers/draw-heightmap.js
- [x] modules/renderers/draw-borders.js
- [x] modules/renderers/draw-burg-icons.js
- [x] modules/renderers/draw-burg-labels.js
- [x] modules/renderers/draw-state-labels.js
- [x] modules/renderers/draw-relief-icons.js
- [x] modules/renderers/draw-military.js
- [x] modules/renderers/draw-temperature.js
- [x] modules/renderers/draw-markers.js
- And 10+ more

### New Files (Infrastructure)
- [ ] modules/hooks.js - Hook system implementation
- [ ] docs/HOOKS_GUIDE.md - Plugin development guide
- [ ] examples/sample-plugin.js - Example plugin

---

## Expected Benefits

### For Core Development
- Easier feature additions without coupling
- Better testability
- Clearer module interfaces
- Ability to disable features

### For Plugin Developers
- Standard extension points
- No core code modification needed
- Priority-based hook ordering
- Easy enable/disable

### For Users
- Third-party plugins and mods
- Custom generation rules
- Custom rendering
- Custom data formats

---

## Estimated Effort

| Phase | Effort | Value | Risk |
|-------|--------|-------|------|
| Foundation (hooks.js) | 8h | High | Low |
| Generation hooks | 16h | High | Low |
| Rendering hooks | 12h | High | Medium |
| UI hooks | 8h | Medium | Low |
| Persistence hooks | 6h | High | Low |
| Testing & docs | 10h | Medium | Low |
| **TOTAL** | **60h** | **High** | **Low** |

**Timeline**: 2-3 sprints with 1-2 developers

---

## Next Steps

1. Review this analysis document: `/ARCHITECTURE_ANALYSIS.md`
2. Decide on hook system implementation (async, priority, etc.)
3. Create `modules/hooks.js` with core EventEmitter
4. Add hooks to `generate()` function first
5. Test with sample plugin
6. Roll out to all modules iteratively

---

## Questions to Answer

1. **Async vs Sync**: Should hook callbacks be async? (Recommended: Yes)
2. **Priority System**: Should hooks have priority ordering? (Recommended: Yes)
3. **Cancelable**: Should hooks be able to cancel/prevent actions? (Recommended: For some hooks only)
4. **Scoping**: Should hooks be module-scoped or global? (Recommended: Global with namespacing)
5. **Hook Data**: Should hooks receive copies or references? (Recommended: References for perf)

