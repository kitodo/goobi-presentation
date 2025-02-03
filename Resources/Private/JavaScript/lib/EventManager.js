// @ts-check

import { EventTarget as FakeEventTarget } from 'DlfMediaPlayer/3rd-party/EventTarget';

/**
 * @typedef {{
 *  target: EventTarget | FakeEventTarget<any>;
 *  type: any;
 *  callback: any;
 *  options: any;
 * }} Listener
 */

/**
 * Utility class to handle adding and removing event listeners.
 *
 * This is used to simplify removing all event listeners when disposing an element.
 */
export default class EventManager {
  constructor() {
    /** @private @type {Listener[]} */
    this.listeners_ = [];
  }

  /**
   *
   * @param {() => void} callback
   */
  record(callback) {
    const originalReal = EventTarget.prototype.addEventListener;
    const originalFake = FakeEventTarget.prototype.addEventListener;
    const mgr = this;
    try {
      EventTarget.prototype.addEventListener = /** @type {EventTarget['addEventListener']} */(
        function (type, callback, options) {
          mgr.listeners_.push({ target: this, type, callback, options });
          originalReal.call(this, type, callback, options);
        }
      );
      FakeEventTarget.prototype.addEventListener = /** @type {FakeEventTarget<any>['addEventListener']} */(
        function (type, callback, options) {
          mgr.listeners_.push({ target: this, type, callback, options });
          originalFake.call(this, type, callback, options);
        }
      );
      callback();
    } finally {
      EventTarget.prototype.addEventListener = originalReal;
      FakeEventTarget.prototype.addEventListener = originalFake;
    }
  }

  removeAll() {
    for (const listener of this.listeners_) {
      listener.target.removeEventListener(listener.type, listener.callback, listener.options);
    }
  }
}
