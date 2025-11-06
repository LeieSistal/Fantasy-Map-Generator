# Hooks API Documentation

The Fantasy Map Generator now includes a powerful hooks system that allows external tools and plugins to extend and modify the map generation and editing process.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Available Hooks](#available-hooks)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Overview

The hooks system provides a centralized event-driven architecture that enables:

- **External tool integration**: Connect other applications to the map generator
- **Custom plugins**: Extend functionality without modifying core code
- **Data transformation**: Modify generation parameters and results
- **Custom rendering**: Add new visual layers
- **Workflow automation**: Automate repetitive tasks

---

## Quick Start

### Basic Hook Registration

```javascript
// Register a hook to execute after map generation
Hooks.register('afterGenerationComplete', (pack, grid) => {
  console.log('Map generated!', pack, grid);
  // Your custom logic here
});
```

### Using the Filter System

```javascript
// Modify data as it flows through the system
Hooks.register('filterGenerationOptions', (options) => {
  // Force specific settings
  options.seed = 'my-custom-seed';
  return options;
});

// Apply the filter
let options = { seed: 'random' };
options = Hooks.filter('filterGenerationOptions', options);
```

---

## API Reference

### `Hooks.register(eventName, callback, priority)`

Register a callback function to be executed when a specific event fires.

**Parameters:**
- `eventName` (string): Name of the event to hook into
- `callback` (function): Function to execute when event fires
- `priority` (number, optional): Execution priority (higher = runs first, default: 10)

**Returns:** Hook ID (number) for later unregistration

**Example:**
```javascript
const hookId = Hooks.register('beforeGenerate', (options) => {
  console.log('About to generate map with options:', options);
}, 20); // High priority
```

---

### `Hooks.execute(eventName, ...args)`

Execute all registered hooks for a specific event (async).

**Parameters:**
- `eventName` (string): Name of the event to execute
- `...args` (any): Arguments to pass to hook callbacks

**Returns:** Promise<void>

**Example:**
```javascript
await Hooks.execute('afterGenerationComplete', pack, grid);
```

---

### `Hooks.executeSync(eventName, ...args)`

Execute hooks synchronously (for non-async contexts).

**Parameters:**
- `eventName` (string): Name of the event to execute
- `...args` (any): Arguments to pass to hook callbacks

**Example:**
```javascript
Hooks.executeSync('onDataChange', cellId, newValue);
```

---

### `Hooks.filter(eventName, data, ...args)`

Pass data through registered filter hooks for transformation.

**Parameters:**
- `eventName` (string): Name of the filter event
- `data` (any): Data to be filtered/transformed
- `...args` (any): Additional arguments for hooks

**Returns:** Transformed data

**Example:**
```javascript
let options = { width: 1920, height: 1080 };
options = Hooks.filter('filterGenerationOptions', options);
```

---

### `Hooks.unregister(eventName, hookIdOrCallback)`

Remove a registered hook.

**Parameters:**
- `eventName` (string): Name of the event
- `hookIdOrCallback` (number|function): Hook ID or callback function reference

**Returns:** boolean (true if hook was removed)

**Example:**
```javascript
Hooks.unregister('beforeGenerate', hookId);
// or
Hooks.unregister('beforeGenerate', callbackFunction);
```

---

### `Hooks.trace(eventNames)`

Enable debug tracing for specific events.

**Parameters:**
- `eventNames` (string|string[]): Event name(s) to trace

**Example:**
```javascript
Hooks.trace('beforeGenerate');
Hooks.trace(['beforeGenerate', 'afterGenerate']);
```

---

### Utility Methods

- `Hooks.has(eventName)` - Check if any hooks are registered for an event
- `Hooks.count(eventName)` - Get number of hooks registered for an event
- `Hooks.list()` - List all registered hooks (returns object with counts)
- `Hooks.debug()` - Get detailed information about all hooks
- `Hooks.clear()` - Clear all registered hooks
- `Hooks.clearEvent(eventName)` - Clear hooks for a specific event
- `Hooks.setEnabled(enabled)` - Enable/disable the entire hooks system

---

## Available Hooks

### Generation Lifecycle Hooks

#### `beforeGenerate`
Fires before map generation starts.

**Arguments:**
- `options` (object): Generation options

**Use cases:**
- Modify generation parameters
- Initialize custom data structures
- Log generation start

**Example:**
```javascript
Hooks.register('beforeGenerate', (options) => {
  console.log('Starting generation with seed:', options.seed);
});
```

---

#### `afterHeightmapGenerated`
Fires after the heightmap is generated.

**Arguments:**
- `heightmap` (TypedArray): Array of height values for each cell
- `grid` (object): Grid data structure

**Use cases:**
- Modify terrain heights
- Add custom terrain features
- Analyze heightmap statistics

**Example:**
```javascript
Hooks.register('afterHeightmapGenerated', (heightmap, grid) => {
  // Add a custom mountain range
  heightmap.forEach((h, i) => {
    if (grid.cells.x[i] > 500 && grid.cells.x[i] < 600) {
      heightmap[i] = Math.max(h, 80);
    }
  });
});
```

---

#### `afterFeaturesGenerated`
Fires after geographic features (islands, lakes) are generated.

**Arguments:**
- `features` (array): Array of feature objects
- `pack` (object): Pack data structure

**Use cases:**
- Add custom features
- Modify existing features
- Filter or remove features

---

#### `afterRiversGenerated`
Fires after rivers are generated.

**Arguments:**
- `rivers` (array): Array of river objects
- `pack` (object): Pack data structure

**Use cases:**
- Add custom rivers
- Modify river properties
- Connect river systems

---

#### `afterCulturesGenerated`
Fires after cultures are generated.

**Arguments:**
- `cultures` (array): Array of culture objects
- `pack` (object): Pack data structure

**Use cases:**
- Add custom cultures
- Modify culture properties
- Assign custom naming schemes

---

#### `afterStatesGenerated`
Fires after states/nations are generated.

**Arguments:**
- `states` (array): Array of state objects
- `burgs` (array): Array of settlement objects
- `pack` (object): Pack data structure

**Use cases:**
- Modify state boundaries
- Assign custom state properties
- Create alliances or relationships

---

#### `afterGenerationComplete`
Fires when all generation is complete.

**Arguments:**
- `pack` (object): Complete pack data structure
- `grid` (object): Complete grid data structure

**Use cases:**
- Finalize custom data
- Perform validation
- Trigger external integrations
- Export data to other tools

**Example:**
```javascript
Hooks.register('afterGenerationComplete', (pack, grid) => {
  console.log('Generation complete!');
  console.log('States:', pack.states.length);
  console.log('Burgs:', pack.burgs.length);
  console.log('Rivers:', pack.rivers.length);

  // Send to external API
  fetch('https://my-api.com/maps', {
    method: 'POST',
    body: JSON.stringify({ pack, grid })
  });
});
```

---

### Rendering Hooks

#### `beforeLayersRender`
Fires before any layers are rendered.

**Arguments:**
- `pack` (object): Pack data structure
- `grid` (object): Grid data structure

**Use cases:**
- Prepare custom rendering data
- Clear previous custom elements

---

#### `beforeLayerRender`
Fires before a specific layer is rendered.

**Arguments:**
- `layerName` (string): Name of the layer being rendered

**Use cases:**
- Layer-specific preparations
- Hide/show elements based on layer

---

#### `afterLayerRender`
Fires after a specific layer is rendered.

**Arguments:**
- `layerName` (string): Name of the layer that was rendered

**Use cases:**
- Post-process rendered elements
- Add decorations to layers

---

#### `customLayerRender`
Fires during layer rendering, allowing custom layers to be added.

**Arguments:**
- `pack` (object): Pack data structure
- `grid` (object): Grid data structure

**Use cases:**
- Render custom visualization layers
- Add overlays
- Display custom data

**Example:**
```javascript
Hooks.register('customLayerRender', (pack, grid) => {
  // Add custom layer showing trade routes
  const svg = d3.select('#map');
  const customLayer = svg.append('g')
    .attr('id', 'customTradeRoutes')
    .attr('class', 'layer');

  // Draw custom visualization
  pack.states.forEach(state => {
    // Your custom rendering logic
  });
});
```

---

#### `afterLayersRender`
Fires after all layers are rendered.

**Arguments:**
- `pack` (object): Pack data structure
- `grid` (object): Grid data structure

**Use cases:**
- Final rendering touches
- Performance measurements
- Screenshot triggers

---

### UI Interaction Hooks

#### `onElementClicked`
Fires when a map element is clicked.

**Arguments:**
- `elementType` (string): Type of element (e.g., 'burg', 'river', 'state')
- `elementId` (string): ID of the clicked element
- `element` (DOMElement): The actual DOM element

**Use cases:**
- Custom click handlers
- External tool synchronization
- Analytics tracking

**Example:**
```javascript
Hooks.register('onElementClicked', (elementType, elementId, element) => {
  if (elementType === 'burg') {
    const burgId = parseInt(elementId.replace('burg', ''));
    const burg = pack.burgs[burgId];
    console.log('Clicked burg:', burg.name);

    // Send to external application
    window.parent.postMessage({
      type: 'burg-selected',
      data: burg
    }, '*');
  }
});
```

---

#### `afterEditorOpened`
Fires after an editor dialog is opened.

**Arguments:**
- `elementType` (string): Type of element being edited
- `elementId` (string): ID of the element being edited

**Use cases:**
- Populate custom editor fields
- Sync with external tools
- Track editing activity

---

### Data Persistence Hooks

#### `beforeSave`
Fires before map data is saved.

**Arguments:**
- `method` (string): Save method ('storage', 'machine', 'dropbox')

**Use cases:**
- Add custom data to save
- Validate data before save
- Trigger backups

**Example:**
```javascript
Hooks.register('beforeSave', (method) => {
  console.log('Saving map using method:', method);
  // Add custom data to pack
  pack.customData = {
    myPlugin: {
      version: '1.0.0',
      settings: { /* ... */ }
    }
  };
});
```

---

#### `afterSave`
Fires after map data is saved.

**Arguments:**
- `method` (string): Save method used
- `mapData` (string): Compressed map data
- `filename` (string): Name of the saved file

**Use cases:**
- Upload to external storage
- Create backups
- Update UI

---

#### `beforeLoad`
Fires before map data is loaded.

**Arguments:**
- `data` (array): Raw map data array
- `mapVersion` (string): Version of the map being loaded

**Use cases:**
- Prepare for data migration
- Clear custom data structures
- Initialize plugins

---

#### `afterLoad`
Fires after map data is loaded.

**Arguments:**
- `pack` (object): Loaded pack data
- `grid` (object): Loaded grid data
- `mapVersion` (string): Version of the loaded map

**Use cases:**
- Load custom plugin data
- Migrate old data formats
- Re-initialize custom features

**Example:**
```javascript
Hooks.register('afterLoad', (pack, grid, mapVersion) => {
  // Restore custom plugin data
  if (pack.customData && pack.customData.myPlugin) {
    const settings = pack.customData.myPlugin.settings;
    console.log('Restored plugin settings:', settings);
  }
});
```

---

## Examples

### Example 1: Logging Plugin

```javascript
// Simple logging plugin that tracks all generation events
class LoggingPlugin {
  activate() {
    console.log('[LoggingPlugin] Activated');

    Hooks.register('beforeGenerate', (options) => {
      console.log('[LoggingPlugin] Generation started with seed:', options.seed);
    });

    Hooks.register('afterGenerationComplete', (pack, grid) => {
      console.log('[LoggingPlugin] Generation complete');
      console.log('  - States:', pack.states.length);
      console.log('  - Burgs:', pack.burgs.length);
      console.log('  - Rivers:', pack.rivers.length);
    });

    Hooks.register('beforeSave', (method) => {
      console.log('[LoggingPlugin] Saving via', method);
    });

    Hooks.register('afterLoad', (pack, grid) => {
      console.log('[LoggingPlugin] Map loaded');
    });
  }

  deactivate() {
    Hooks.clearEvent('beforeGenerate');
    Hooks.clearEvent('afterGenerationComplete');
    Hooks.clearEvent('beforeSave');
    Hooks.clearEvent('afterLoad');
    console.log('[LoggingPlugin] Deactivated');
  }
}

const loggingPlugin = new LoggingPlugin();
loggingPlugin.activate();
```

---

### Example 2: Custom Layer Plugin

```javascript
// Plugin that adds a custom visualization layer
class HeatMapPlugin {
  activate() {
    Hooks.register('customLayerRender', (pack, grid) => {
      this.renderHeatMap(pack, grid);
    });
  }

  renderHeatMap(pack, grid) {
    const svg = d3.select('#map');

    // Remove existing heat map layer
    svg.select('#heatMapLayer').remove();

    // Create new layer
    const layer = svg.append('g')
      .attr('id', 'heatMapLayer')
      .attr('class', 'layer');

    // Render heat map based on population density
    pack.cells.i.forEach(i => {
      const population = pack.cells.pop[i];
      if (population > 0) {
        const opacity = Math.min(population / 100, 1);
        layer.append('circle')
          .attr('cx', pack.cells.p[i][0])
          .attr('cy', pack.cells.p[i][1])
          .attr('r', 5)
          .attr('fill', 'red')
          .attr('opacity', opacity);
      }
    });
  }

  deactivate() {
    d3.select('#heatMapLayer').remove();
    Hooks.clearEvent('customLayerRender');
  }
}

const heatMapPlugin = new HeatMapPlugin();
heatMapPlugin.activate();
```

---

### Example 3: External Tool Integration

```javascript
// Plugin that syncs map data with an external application
class ExternalSyncPlugin {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  activate() {
    // Sync on generation complete
    Hooks.register('afterGenerationComplete', async (pack, grid) => {
      await this.syncToExternal({ pack, grid, event: 'generation' });
    });

    // Sync on element click
    Hooks.register('onElementClicked', async (elementType, elementId) => {
      await this.syncToExternal({
        event: 'click',
        elementType,
        elementId
      });
    });

    // Load custom data on map load
    Hooks.register('afterLoad', async (pack, grid) => {
      if (pack.customData && pack.customData.externalSync) {
        console.log('Loaded external sync data:', pack.customData.externalSync);
      }
    });

    // Save custom data
    Hooks.register('beforeSave', (method) => {
      pack.customData = pack.customData || {};
      pack.customData.externalSync = {
        lastSyncTime: Date.now(),
        apiUrl: this.apiUrl
      };
    });
  }

  async syncToExternal(data) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log('[ExternalSync] Synced to external API');
      }
    } catch (error) {
      console.error('[ExternalSync] Sync failed:', error);
    }
  }
}

const syncPlugin = new ExternalSyncPlugin('https://my-api.com/fmg-sync');
syncPlugin.activate();
```

---

### Example 4: Data Modification Plugin

```javascript
// Plugin that modifies generation to always create coastal capitals
class CoastalCapitalsPlugin {
  activate() {
    Hooks.register('afterStatesGenerated', (states, burgs, pack) => {
      states.forEach(state => {
        if (!state.i) return; // Skip neutral state

        const capital = burgs[state.capital];
        if (!capital) return;

        // Find nearest coastal cell
        const capitalCell = capital.cell;
        const nearestCoastal = this.findNearestCoastalCell(capitalCell, pack);

        if (nearestCoastal && nearestCoastal !== capitalCell) {
          console.log(`Moving capital of ${state.name} to coast`);
          capital.cell = nearestCoastal;
          capital.x = pack.cells.p[nearestCoastal][0];
          capital.y = pack.cells.p[nearestCoastal][1];
        }
      });
    });
  }

  findNearestCoastalCell(cellId, pack) {
    // Implementation to find nearest coastal cell
    // This is a simplified version
    const queue = [cellId];
    const visited = new Set([cellId]);

    while (queue.length > 0) {
      const current = queue.shift();

      // Check if coastal (has both land and water neighbors)
      const neighbors = pack.cells.c[current];
      const hasWater = neighbors.some(n => pack.cells.h[n] < 20);
      const hasLand = neighbors.some(n => pack.cells.h[n] >= 20);

      if (hasWater && hasLand && pack.cells.h[current] >= 20) {
        return current;
      }

      // Add unvisited neighbors to queue
      neighbors.forEach(n => {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      });
    }

    return cellId; // Return original if no coastal cell found
  }
}

const coastalPlugin = new CoastalCapitalsPlugin();
coastalPlugin.activate();
```

---

## Best Practices

### 1. Use Appropriate Priorities

Hooks with higher priority values execute first. Use this to ensure proper ordering:

```javascript
// Execute first (high priority)
Hooks.register('beforeGenerate', setupData, 100);

// Execute second (normal priority)
Hooks.register('beforeGenerate', processData, 10);

// Execute last (low priority)
Hooks.register('beforeGenerate', finalizeData, 1);
```

---

### 2. Handle Errors Gracefully

Always wrap your hook callbacks in try-catch blocks:

```javascript
Hooks.register('afterGenerationComplete', (pack, grid) => {
  try {
    // Your code here
    complexOperation(pack);
  } catch (error) {
    console.error('[MyPlugin] Error in hook:', error);
    // Don't let your plugin break the entire application
  }
});
```

---

### 3. Clean Up on Deactivation

Provide a way to deactivate your plugin:

```javascript
class MyPlugin {
  activate() {
    this.hookId1 = Hooks.register('beforeGenerate', this.onBeforeGenerate.bind(this));
    this.hookId2 = Hooks.register('afterGenerate', this.onAfterGenerate.bind(this));
  }

  deactivate() {
    Hooks.unregister('beforeGenerate', this.hookId1);
    Hooks.unregister('afterGenerate', this.hookId2);
    // Clean up any custom data or UI elements
    this.cleanup();
  }
}
```

---

### 4. Avoid Blocking Operations

Hooks can use async/await, so use them for long-running operations:

```javascript
Hooks.register('afterGenerationComplete', async (pack, grid) => {
  // Good: async operation doesn't block
  await fetch('https://api.example.com/save', {
    method: 'POST',
    body: JSON.stringify(pack)
  });
});
```

---

### 5. Document Your Hooks

If creating a plugin for others to use, document which hooks you use:

```javascript
/**
 * My Custom Plugin
 *
 * Hooks used:
 * - beforeGenerate: Initializes custom data structures
 * - afterGenerationComplete: Processes and exports data
 * - customLayerRender: Renders custom visualization
 *
 * @example
 * const plugin = new MyPlugin();
 * plugin.activate();
 */
class MyPlugin {
  // ...
}
```

---

### 6. Use Namespacing for Custom Data

When adding custom data to pack or grid, use namespacing:

```javascript
Hooks.register('beforeSave', () => {
  // Good: namespaced
  pack.customData = pack.customData || {};
  pack.customData.myPlugin = { /* data */ };

  // Bad: might conflict with other plugins
  pack.myPluginData = { /* data */ };
});
```

---

### 7. Enable Tracing for Debugging

Use trace mode to debug your hooks:

```javascript
// Enable tracing for specific events
Hooks.trace(['beforeGenerate', 'afterGenerationComplete']);

// Your plugin code
myPlugin.activate();

// Disable tracing when done
Hooks.untrace(['beforeGenerate', 'afterGenerationComplete']);
```

---

## Support

For issues, questions, or feature requests related to the hooks system:

- GitHub Issues: [Fantasy-Map-Generator Issues](https://github.com/Azgaar/Fantasy-Map-Generator/issues)
- Discord: Join the FMG community

---

## Contributing

If you create useful plugins or find new use cases for hooks, please consider:

- Sharing your plugin with the community
- Contributing documentation improvements
- Requesting new hook points in areas that need them

---

## Version History

- **v1.0.0** (2025): Initial hooks system implementation
  - Core hooks API
  - Generation lifecycle hooks
  - Rendering hooks
  - UI interaction hooks
  - Persistence hooks
