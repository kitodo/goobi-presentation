// @ts-check

import { setTimeout } from 'timers/promises';

/**
 * @typedef {'mouse' | 'pen' | 'touch'} PointerType
 *
 * @typedef {{
 *  delay: number;
 * }} Options
 */

/**
 * The API is oriented at Puppeteer.
 */
export class PointerMock {
  /**
   * @param {PointerType} pointerType
   * @param {EventTarget} target
   */
  constructor(pointerType, target) {
    /** @private */
    this.position = {
      clientX: 0,
      clientY: 0,
    }
    /** @private */
    this.pointerType = pointerType;
    /** @private */
    this.target = target;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @param {Partial<Pick<Options, 'delay'>>} options
   */
  async click(clientX, clientY, options = {}) {
    this.move(clientX, clientY);
    this.down();
    await setTimeout(options.delay ?? 0);
    this.up();
  }

  async down() {
    this.dispatch('pointerdown');
  }

  async up() {
    this.dispatch('pointerup');

    if (this.pointerType !== 'mouse') {
      this.dispatch('pointerleave');
    }
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   */
  async move(clientX, clientY) {
    this.position = { clientX, clientY };
  }

  /**
   *
   * @private
   * @param {string} name
   */
  dispatch(name) {
    const event = new MouseEventMock(name, this.position.clientX, this.position.clientY);
    this.target.dispatchEvent(event);
  }
}

export class MouseEventMock extends MouseEvent {
  /**
   *
   * @param {string} type
   * @param {number} clientX
   * @param {number} clientY
   */
  constructor(type, clientX, clientY) {
    super(type);

    this._clientX = clientX;
    this._clientY = clientY;
  }

  /**
   * @override
   */
  get clientX() {
    return this._clientX;
  }

  /**
   * @override
   */
  get clientY() {
    return this._clientY;
  }
}
