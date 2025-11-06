# Plugin Examples

This directory contains example plugins that demonstrate how to use the Hooks system to extend the Fantasy Map Generator.

## Loading a Plugin

To load a plugin, add it to `index.html`:

```html
<!-- Add before the closing </body> tag -->
<script src="examples/sample-plugin.js"></script>
```

Or load it dynamically in the browser console:

```javascript
const script = document.createElement('script');
script.src = 'examples/sample-plugin.js';
document.body.appendChild(script);
```

## Available Examples

### sample-plugin.js

A comprehensive example plugin that demonstrates:

- Listening to generation lifecycle events
- Modifying generated data (adding custom properties)
- Adding custom rendering layers
- Saving and loading custom plugin data
- Responding to UI interaction events
- Calculating and displaying statistics

**Usage:**
1. Add `<script src="examples/sample-plugin.js"></script>` to `index.html`
2. Generate a map
3. Check the browser console for plugin output
4. The plugin will automatically add custom markers to burgs

**Console Commands:**
- `activateSamplePlugin()` - Activate the plugin
- `deactivateSamplePlugin()` - Deactivate the plugin

## Creating Your Own Plugin

### Basic Template

```javascript
(function () {
  'use strict';

  class MyCustomPlugin {
    constructor() {
      this.name = 'My Custom Plugin';
      this.version = '1.0.0';
    }

    activate() {
      console.log(`[${this.name}] Activating...`);

      // Register your hooks here
      Hooks.register('afterGenerationComplete', (pack, grid) => {
        console.log('Map generated!', pack, grid);
        // Your custom logic here
      });

      console.log(`[${this.name}] Activated`);
    }

    deactivate() {
      // Clean up your hooks and custom elements
      console.log(`[${this.name}] Deactivated`);
    }
  }

  // Initialize plugin
  window.MyCustomPlugin = new MyCustomPlugin();
  window.MyCustomPlugin.activate();
})();
```

### External Tool Integration Example

```javascript
// Plugin that syncs with an external application via postMessage
class ExternalToolPlugin {
  activate() {
    // Send data when map is generated
    Hooks.register('afterGenerationComplete', (pack, grid) => {
      window.parent.postMessage({
        type: 'map-generated',
        data: {
          seed: seed,
          states: pack.states.length,
          burgs: pack.burgs.length
        }
      }, '*');
    });

    // Listen for commands from external tool
    window.addEventListener('message', (event) => {
      if (event.data.type === 'modify-map') {
        // Handle external commands
        this.handleExternalCommand(event.data);
      }
    });

    // Send element data when clicked
    Hooks.register('onElementClicked', (elementType, elementId) => {
      if (elementType === 'burg') {
        const burgId = parseInt(elementId.replace('burg', ''));
        const burg = pack.burgs[burgId];

        window.parent.postMessage({
          type: 'element-selected',
          elementType: 'burg',
          data: burg
        }, '*');
      }
    });
  }

  handleExternalCommand(data) {
    // Process commands from external tool
    console.log('External command:', data);
  }
}

const externalPlugin = new ExternalToolPlugin();
externalPlugin.activate();
```

### REST API Integration Example

```javascript
// Plugin that syncs map data with a REST API
class APIIntegrationPlugin {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  activate() {
    // Upload map data after generation
    Hooks.register('afterGenerationComplete', async (pack, grid) => {
      try {
        await fetch(`${this.apiUrl}/maps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seed: seed,
            pack: this.serializePackData(pack),
            grid: this.serializeGridData(grid)
          })
        });
        console.log('Map uploaded to API');
      } catch (error) {
        console.error('Failed to upload map:', error);
      }
    });

    // Save custom API metadata
    Hooks.register('beforeSave', (method) => {
      pack.customData = pack.customData || {};
      pack.customData.apiSync = {
        apiUrl: this.apiUrl,
        lastSync: Date.now()
      };
    });
  }

  serializePackData(pack) {
    // Return simplified pack data for API
    return {
      states: pack.states.filter(s => s.i).map(s => ({
        id: s.i,
        name: s.name,
        capital: s.capital
      })),
      burgs: pack.burgs.filter(b => b.i).map(b => ({
        id: b.i,
        name: b.name,
        population: b.population
      }))
    };
  }

  serializeGridData(grid) {
    // Return simplified grid data for API
    return {
      width: grid.cellsX,
      height: grid.cellsY,
      cellCount: grid.cells.i.length
    };
  }
}

const apiPlugin = new APIIntegrationPlugin('https://my-api.com/fmg');
apiPlugin.activate();
```

## Tips for Plugin Development

1. **Use the browser console** - The Hooks system logs all events when tracing is enabled:
   ```javascript
   Hooks.trace(['beforeGenerate', 'afterGenerationComplete']);
   ```

2. **Check what hooks are available**:
   ```javascript
   Hooks.list(); // List all registered hooks
   Hooks.debug(); // Get detailed hook information
   ```

3. **Test with different maps** - Generate multiple maps to ensure your plugin works correctly

4. **Handle errors gracefully** - Wrap your code in try-catch blocks to prevent breaking the generator

5. **Clean up resources** - Implement a proper `deactivate()` method that removes hooks and custom elements

6. **Document your plugin** - Add comments explaining what your plugin does and how to use it

## Getting Help

- **Hooks API Documentation**: See `/HOOKS_API.md` for complete API reference
- **GitHub Issues**: Report bugs or request features
- **Community Discord**: Get help from other developers

## Contributing

Have a useful plugin? Consider contributing it to this directory!

1. Create your plugin file in `examples/`
2. Document it in this README
3. Submit a pull request
