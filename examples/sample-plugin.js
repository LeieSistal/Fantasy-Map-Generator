/**
 * Sample Plugin for Fantasy Map Generator
 *
 * This plugin demonstrates how to use the Hooks system to extend
 * the Fantasy Map Generator with custom functionality.
 *
 * Load this plugin by adding it to index.html:
 * <script src="examples/sample-plugin.js"></script>
 */

(function () {
  'use strict';

  /**
   * Sample Plugin Class
   *
   * This plugin demonstrates:
   * - Listening to generation events
   * - Modifying generated data
   * - Adding custom rendering
   * - Saving/loading custom data
   * - Interacting with UI events
   */
  class SamplePlugin {
    constructor() {
      this.name = 'Sample Plugin';
      this.version = '1.0.0';
      this.hookIds = [];
      this.customData = {
        generationCount: 0,
        lastGeneratedSeed: null
      };
    }

    /**
     * Activate the plugin
     */
    activate() {
      console.log(`[${this.name}] Activating v${this.version}`);

      this.registerGenerationHooks();
      this.registerRenderingHooks();
      this.registerPersistenceHooks();
      this.registerUIHooks();

      console.log(`[${this.name}] Activated`);
    }

    /**
     * Register hooks for generation events
     */
    registerGenerationHooks() {
      // Hook: Before generation starts
      this.hookIds.push(
        Hooks.register('beforeGenerate', (options) => {
          console.log(`[${this.name}] Map generation starting...`);
          console.log('  Seed:', options?.seed || seed);
          this.customData.generationCount++;
        }, 10)
      );

      // Hook: After heightmap is generated
      this.hookIds.push(
        Hooks.register('afterHeightmapGenerated', (heightmap, grid) => {
          console.log(`[${this.name}] Heightmap generated with ${heightmap.length} cells`);

          // Example: Calculate and log heightmap statistics
          const landCells = Array.from(heightmap).filter(h => h >= 20).length;
          const waterCells = heightmap.length - landCells;
          const avgHeight = Array.from(heightmap).reduce((a, b) => a + b, 0) / heightmap.length;

          console.log('  Land cells:', landCells);
          console.log('  Water cells:', waterCells);
          console.log('  Average height:', avgHeight.toFixed(2));
        })
      );

      // Hook: After cultures are generated
      this.hookIds.push(
        Hooks.register('afterCulturesGenerated', (cultures, pack) => {
          console.log(`[${this.name}] Cultures generated:`, cultures.length);

          // Example: Add custom property to each culture
          cultures.forEach(culture => {
            if (culture.i) { // Skip removed cultures
              culture.customTradePower = Math.random() * 100;
            }
          });
        })
      );

      // Hook: After states are generated
      this.hookIds.push(
        Hooks.register('afterStatesGenerated', (states, burgs, pack) => {
          console.log(`[${this.name}] States generated:`, states.length);

          // Example: Log capital cities
          states.forEach(state => {
            if (state.i && state.capital) {
              const capital = burgs[state.capital];
              console.log(`  ${state.name} capital: ${capital?.name || 'Unknown'}`);
            }
          });
        })
      );

      // Hook: After generation complete
      this.hookIds.push(
        Hooks.register('afterGenerationComplete', (pack, grid) => {
          console.log(`[${this.name}] Generation complete!`);
          console.log('  Total generations:', this.customData.generationCount);

          this.customData.lastGeneratedSeed = seed;

          // Example: Calculate and store statistics
          const stats = this.calculateMapStatistics(pack, grid);
          console.log('  Map statistics:', stats);

          // Store statistics in pack for saving
          pack.customData = pack.customData || {};
          pack.customData.samplePlugin = {
            ...this.customData,
            stats
          };
        })
      );
    }

    /**
     * Register hooks for rendering events
     */
    registerRenderingHooks() {
      // Hook: Before layers render
      this.hookIds.push(
        Hooks.register('beforeLayersRender', (pack, grid) => {
          console.log(`[${this.name}] Rendering layers...`);
        })
      );

      // Hook: Custom layer rendering
      this.hookIds.push(
        Hooks.register('customLayerRender', (pack, grid) => {
          // Example: Render a custom layer showing trade routes
          this.renderCustomLayer(pack, grid);
        })
      );

      // Hook: After layers render
      this.hookIds.push(
        Hooks.register('afterLayersRender', (pack, grid) => {
          console.log(`[${this.name}] Layers rendered`);
        })
      );
    }

    /**
     * Register hooks for save/load events
     */
    registerPersistenceHooks() {
      // Hook: Before save
      this.hookIds.push(
        Hooks.register('beforeSave', (method) => {
          console.log(`[${this.name}] Saving map via ${method}`);

          // Add custom data to pack before saving
          pack.customData = pack.customData || {};
          pack.customData.samplePlugin = this.customData;
        })
      );

      // Hook: After save
      this.hookIds.push(
        Hooks.register('afterSave', (method, mapData, filename) => {
          console.log(`[${this.name}] Map saved: ${filename}`);
        })
      );

      // Hook: Before load
      this.hookIds.push(
        Hooks.register('beforeLoad', (data, mapVersion) => {
          console.log(`[${this.name}] Loading map version ${mapVersion}`);
          // Reset custom data before load
          this.customData = {
            generationCount: 0,
            lastGeneratedSeed: null
          };
        })
      );

      // Hook: After load
      this.hookIds.push(
        Hooks.register('afterLoad', (pack, grid, mapVersion) => {
          console.log(`[${this.name}] Map loaded`);

          // Restore custom data from pack
          if (pack.customData && pack.customData.samplePlugin) {
            this.customData = pack.customData.samplePlugin;
            console.log('  Restored plugin data:', this.customData);
          }
        })
      );
    }

    /**
     * Register hooks for UI interaction events
     */
    registerUIHooks() {
      // Hook: Element clicked
      this.hookIds.push(
        Hooks.register('onElementClicked', (elementType, elementId, element) => {
          if (elementType) {
            console.log(`[${this.name}] Clicked ${elementType}:`, elementId);

            // Example: Show custom information for burgs
            if (elementType === 'burg' && elementId) {
              const burgId = parseInt(elementId.replace('burg', ''));
              const burg = pack.burgs[burgId];
              if (burg) {
                console.log('  Burg details:', {
                  name: burg.name,
                  population: burg.population,
                  culture: pack.cultures[burg.culture]?.name
                });
              }
            }
          }
        })
      );

      // Hook: Editor opened
      this.hookIds.push(
        Hooks.register('afterEditorOpened', (elementType, elementId) => {
          console.log(`[${this.name}] Editor opened for ${elementType}:`, elementId);
        })
      );
    }

    /**
     * Calculate statistics about the generated map
     */
    calculateMapStatistics(pack, grid) {
      return {
        states: pack.states.filter(s => s.i).length,
        burgs: pack.burgs.filter(b => b.i).length,
        cultures: pack.cultures.filter(c => c.i).length,
        religions: pack.religions.filter(r => r.i).length,
        rivers: pack.rivers.filter(r => r.i).length,
        provinces: pack.provinces.filter(p => p.i).length,
        totalPopulation: pack.burgs.reduce((sum, b) => sum + (b.population || 0), 0),
        landCells: grid.cells.h.filter(h => h >= 20).length,
        waterCells: grid.cells.h.filter(h => h < 20).length
      };
    }

    /**
     * Render a custom visualization layer
     */
    renderCustomLayer(pack, grid) {
      // Get or create SVG element
      const svg = d3.select('#map');

      // Remove existing custom layer
      svg.select('#samplePluginLayer').remove();

      // Create new layer group
      const customLayer = svg.insert('g', '#ruler')
        .attr('id', 'samplePluginLayer')
        .attr('class', 'layer');

      // Example: Draw circles at each burg location
      if (pack.burgs) {
        pack.burgs.forEach(burg => {
          if (burg.i && burg.x && burg.y) {
            // Color based on population (example)
            const population = burg.population || 0;
            const color = population > 50 ? 'red' : population > 20 ? 'orange' : 'yellow';

            customLayer.append('circle')
              .attr('cx', burg.x)
              .attr('cy', burg.y)
              .attr('r', 3)
              .attr('fill', color)
              .attr('opacity', 0.5)
              .attr('class', 'samplePluginMarker');
          }
        });
      }

      console.log(`[${this.name}] Custom layer rendered`);
    }

    /**
     * Deactivate the plugin
     */
    deactivate() {
      console.log(`[${this.name}] Deactivating...`);

      // Unregister all hooks
      this.hookIds.forEach(id => {
        // Note: We need to store event names to properly unregister
        // This is a simplified version
      });

      // Clear custom layer
      d3.select('#samplePluginLayer').remove();

      console.log(`[${this.name}] Deactivated`);
    }
  }

  // Create and activate plugin instance
  window.SamplePlugin = new SamplePlugin();
  window.SamplePlugin.activate();

  // Expose global controls
  window.activateSamplePlugin = () => window.SamplePlugin.activate();
  window.deactivateSamplePlugin = () => window.SamplePlugin.deactivate();

  console.log('Sample Plugin loaded. Use activateSamplePlugin() or deactivateSamplePlugin() in console.');
})();
