// @ts-check

import EventEmitter from 'events';

/**
 * @template {object} State
 */
export default class Component extends EventEmitter {
  /**
   *
   * @param {State} state
   */
  constructor(state) {
    super();

    /**
     * @protected
     * @type {State}
     */
    this.state = state;

    /**
     * @private
     * @type {((prevState: State) => Partial<State>)[]}
     */
    this.pendingStateUpdates = [];

    /**
     * @private
     * @type {ReturnType<setTimeout> | null}
     */
    this.renderTimeout = null;

    /**
     * @private
     * @type {Promise<void>}
     */
    this.renderPromise = Promise.resolve();
  }

  /**
   *
   * @param {Partial<State> | ((prevState: State) => Partial<State>)} state
   */
  setState(state = {}) {
    const stateFn = typeof state === 'function' ? state : (() => state);
    this.pendingStateUpdates.push(stateFn);

    // Postpone updates so that multiple synchronous calls to `setState` don't
    // lead to multiple renderings.
    if (!this.renderTimeout) {
      this.renderPromise = new Promise((resolve) => {
        this.renderTimeout = setTimeout(() => {
          const newState = this.squashStateUpdates();
          this.render(newState);
          this.state = newState;
          this.renderTimeout = null;
          this.renderPromise = Promise.resolve();
          this.emit('updated', newState);
          resolve();
        });
      });
    }
  }

  /**
   * Returns a promise of any pending rerender being completed. (If no rerender
   * is pending, the returned promise is already resolved.)
   *
   * @returns {Promise<void>}
   */
  update() {
    return this.renderPromise;
  }

  /**
   * @private
   * @returns {State}
   */
  squashStateUpdates() {
    const newState = Object.assign({}, this.state);
    for (const updateState of this.pendingStateUpdates) {
      Object.assign(newState, updateState(newState));
    }
    this.pendingStateUpdates = [];
    return newState;
  }

  /**
   * Rerenders the component based on new state.
   *
   * `this.state` still refers to the old state during execution of this method,
   * which you may use to detect state changes.
   *
   * @abstract
   * @protected
   * @param {State} state The updated state
   */
  render(state) {
    //
  }
}
