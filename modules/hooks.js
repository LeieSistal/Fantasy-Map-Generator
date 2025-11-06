/**
 * Hooks System for Fantasy Map Generator
 *
 * Provides a centralized event system that allows plugins and external tools
 * to extend and modify the map generation and editing process.
 *
 * @example
 * // Register a hook
 * Hooks.register('afterGenerate', (pack, grid) => {
 *   console.log('Map generated!', pack, grid);
 * });
 *
 * // Execute hooks
 * await Hooks.execute('afterGenerate', pack, grid);
 */

class HooksSystem {
  constructor() {
    // Map of event names to arrays of {callback, priority, id}
    this.hooks = new Map();
    // Set of events to trace for debugging
    this.tracing = new Set();
    // Counter for generating unique hook IDs
    this.nextId = 1;
    // Enable/disable all hooks
    this.enabled = true;
  }

  /**
   * Register a callback for a specific hook event
   *
   * @param {string} eventName - Name of the event to hook into
   * @param {Function} callback - Function to call when event fires
   * @param {number} priority - Priority (higher runs first, default 10)
   * @returns {number} Hook ID for later unregistration
   *
   * @example
   * const hookId = Hooks.register('beforeGenerate', (options) => {
   *   console.log('About to generate map with options:', options);
   * }, 20); // High priority
   */
  register(eventName, callback, priority = 10) {
    if (typeof eventName !== 'string') {
      throw new Error('Event name must be a string');
    }
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.hooks.has(eventName)) {
      this.hooks.set(eventName, []);
    }

    const id = this.nextId++;
    const hook = { callback, priority, id };

    // Insert hook in priority order (higher priority first)
    const hooks = this.hooks.get(eventName);
    const insertIndex = hooks.findIndex(h => h.priority < priority);
    if (insertIndex === -1) {
      hooks.push(hook);
    } else {
      hooks.splice(insertIndex, 0, hook);
    }

    if (this.tracing.has(eventName)) {
      console.log(`[Hooks] Registered hook #${id} for "${eventName}" with priority ${priority}`);
    }

    return id;
  }

  /**
   * Unregister a hook by ID or by callback reference
   *
   * @param {string} eventName - Name of the event
   * @param {number|Function} hookIdOrCallback - Hook ID or callback function
   * @returns {boolean} True if hook was found and removed
   *
   * @example
   * Hooks.unregister('beforeGenerate', hookId);
   * // or
   * Hooks.unregister('beforeGenerate', callbackFunction);
   */
  unregister(eventName, hookIdOrCallback) {
    if (!this.hooks.has(eventName)) {
      return false;
    }

    const hooks = this.hooks.get(eventName);
    const isId = typeof hookIdOrCallback === 'number';
    const index = hooks.findIndex(h =>
      isId ? h.id === hookIdOrCallback : h.callback === hookIdOrCallback
    );

    if (index !== -1) {
      hooks.splice(index, 1);
      if (this.tracing.has(eventName)) {
        console.log(`[Hooks] Unregistered hook for "${eventName}"`);
      }
      return true;
    }

    return false;
  }

  /**
   * Execute all registered hooks for an event (async)
   *
   * @param {string} eventName - Name of the event to execute
   * @param {...any} args - Arguments to pass to hook callbacks
   * @returns {Promise<void>}
   *
   * @example
   * await Hooks.execute('afterGenerate', pack, grid);
   */
  async execute(eventName, ...args) {
    if (!this.enabled) return;

    if (!this.hooks.has(eventName)) {
      if (this.tracing.has(eventName)) {
        console.log(`[Hooks] No hooks registered for "${eventName}"`);
      }
      return;
    }

    const hooks = this.hooks.get(eventName);

    if (this.tracing.has(eventName)) {
      console.log(`[Hooks] Executing ${hooks.length} hook(s) for "${eventName}"`, args);
    }

    for (const hook of hooks) {
      try {
        const startTime = this.tracing.has(eventName) ? performance.now() : 0;

        // Support both sync and async callbacks
        await hook.callback(...args);

        if (this.tracing.has(eventName)) {
          const duration = (performance.now() - startTime).toFixed(2);
          console.log(`[Hooks] Hook #${hook.id} completed in ${duration}ms`);
        }
      } catch (error) {
        console.error(`[Hooks] Error in hook for "${eventName}":`, error);
        // Continue executing other hooks even if one fails
      }
    }
  }

  /**
   * Execute hooks synchronously (for non-async contexts)
   * Note: Async hook callbacks will not be awaited
   *
   * @param {string} eventName - Name of the event to execute
   * @param {...any} args - Arguments to pass to hook callbacks
   */
  executeSync(eventName, ...args) {
    if (!this.enabled) return;

    if (!this.hooks.has(eventName)) {
      return;
    }

    const hooks = this.hooks.get(eventName);

    for (const hook of hooks) {
      try {
        hook.callback(...args);
      } catch (error) {
        console.error(`[Hooks] Error in hook for "${eventName}":`, error);
      }
    }
  }

  /**
   * Filter data through registered hooks (synchronous transformation)
   * Each hook can modify and return the data
   *
   * @param {string} eventName - Name of the filter event
   * @param {any} data - Data to filter
   * @param {...any} args - Additional arguments for hooks
   * @returns {any} Filtered data
   *
   * @example
   * let options = { width: 1920, height: 1080 };
   * options = Hooks.filter('filterGenerationOptions', options);
   */
  filter(eventName, data, ...args) {
    if (!this.enabled) return data;

    if (!this.hooks.has(eventName)) {
      return data;
    }

    const hooks = this.hooks.get(eventName);
    let result = data;

    if (this.tracing.has(eventName)) {
      console.log(`[Hooks] Filtering through ${hooks.length} hook(s) for "${eventName}"`);
    }

    for (const hook of hooks) {
      try {
        const filtered = hook.callback(result, ...args);
        if (filtered !== undefined) {
          result = filtered;
        }
      } catch (error) {
        console.error(`[Hooks] Error in filter hook for "${eventName}":`, error);
      }
    }

    return result;
  }

  /**
   * Check if any hooks are registered for an event
   *
   * @param {string} eventName - Name of the event
   * @returns {boolean} True if at least one hook is registered
   */
  has(eventName) {
    return this.hooks.has(eventName) && this.hooks.get(eventName).length > 0;
  }

  /**
   * Get the number of hooks registered for an event
   *
   * @param {string} eventName - Name of the event
   * @returns {number} Number of registered hooks
   */
  count(eventName) {
    return this.hooks.has(eventName) ? this.hooks.get(eventName).length : 0;
  }

  /**
   * List all registered hooks (for debugging)
   *
   * @returns {Object} Map of event names to hook counts
   */
  list() {
    const result = {};
    for (const [eventName, hooks] of this.hooks.entries()) {
      result[eventName] = hooks.length;
    }
    return result;
  }

  /**
   * Get detailed information about all hooks
   *
   * @returns {Object} Detailed hook information
   */
  debug() {
    const result = {};
    for (const [eventName, hooks] of this.hooks.entries()) {
      result[eventName] = hooks.map(h => ({
        id: h.id,
        priority: h.priority,
        callback: h.callback.name || 'anonymous'
      }));
    }
    return result;
  }

  /**
   * Enable tracing for specific events (logs execution to console)
   *
   * @param {string|string[]} eventNames - Event name(s) to trace
   *
   * @example
   * Hooks.trace('beforeGenerate');
   * Hooks.trace(['beforeGenerate', 'afterGenerate']);
   */
  trace(eventNames) {
    const events = Array.isArray(eventNames) ? eventNames : [eventNames];
    events.forEach(name => {
      this.tracing.add(name);
      console.log(`[Hooks] Tracing enabled for "${name}"`);
    });
  }

  /**
   * Disable tracing for specific events
   *
   * @param {string|string[]} eventNames - Event name(s) to untrace
   */
  untrace(eventNames) {
    const events = Array.isArray(eventNames) ? eventNames : [eventNames];
    events.forEach(name => {
      this.tracing.delete(name);
      console.log(`[Hooks] Tracing disabled for "${name}"`);
    });
  }

  /**
   * Clear all registered hooks
   */
  clear() {
    this.hooks.clear();
    console.log('[Hooks] All hooks cleared');
  }

  /**
   * Clear hooks for a specific event
   *
   * @param {string} eventName - Name of the event to clear
   */
  clearEvent(eventName) {
    if (this.hooks.has(eventName)) {
      this.hooks.delete(eventName);
      console.log(`[Hooks] Cleared all hooks for "${eventName}"`);
    }
  }

  /**
   * Enable or disable the entire hooks system
   *
   * @param {boolean} enabled - Whether hooks should be enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[Hooks] Hooks system ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create global Hooks instance
const Hooks = new HooksSystem();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Hooks, HooksSystem };
}
