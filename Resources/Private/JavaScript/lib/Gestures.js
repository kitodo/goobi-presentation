// @ts-check

import EventEmitter from 'events';

/**
 * @typedef {{
 *  x: number;
 *  y: number;
 * }} Position
 *
 * @typedef {'north' | 'east' | 'south' | 'west'} Direction
 *
 * @typedef {{
 *  type: 'tapdown' | 'tapup';
 *  event: PointerEvent;
 *  position: Position;
 *  tapCount: number;
 * }} TapEvent
 *
 * @typedef {{
 *  type: 'hold';
 *  event: PointerEvent;
 *  position: Position;
 *  tapCount: number;
 * }} HoldEvent
 *
 * @typedef {{
 *  type: 'swipe';
 *  event: PointerEvent;
 *  begin: Position;
 *  end: Position;
 *  angle: number;
 *  direction: Direction;
 * }} SwipeEvent
 *
 * @typedef {TapEvent | HoldEvent | SwipeEvent} GestureEvent
 *
 * @typedef {{
 *  date: Date;
 *  positionRel: Position;
 *  positionClientPx: Position;
 *  positionPx: Position;
 * }} Stat
 *
 * @typedef {{
 *  gesture: (event: GestureEvent) => void;
 *  release: () => void;
 * }} Handlers
 *
 * @typedef {{
 *  tapMaxDelay: number;
 *  tapMaxDistance: number;
 *  swipeMinDistance: number;
 *  holdMinDelay: number;
 *  allowGesture: (event: PointerEvent) => boolean;
 * }} Config
 */

/**
 * @extends {TypedEvents<Handlers>}
 */
export default class Gestures {
  /**
   * @param {Partial<Config>} config
   */
  constructor(config = {}) {
    /** @private @type {Config} */
    this.config = {
      tapMaxDelay: 500,
      tapMaxDistance: 20,
      swipeMinDistance: 100,
      holdMinDelay: 200, // TODO: Use something more dynamic, such as difference to double click?
      allowGesture: () => true,
      ...config
    };

    /** @private @type {Record<TapEvent['type'], Stat | null>} */
    this.last = {
      'tapdown': null,
      'tapup': null,
    }
    /** @private @type {ReturnType<setTimeout> | null} */
    this.holdTimeout = null;
    /** @private @type {number} */
    this.tapCount = 0;

    /** @private */
    this.handlers = {
      contextmenu: this.handleContextMenu.bind(this),
      pointerdown: this.handlePointerDown.bind(this),
      pointerup: this.handlePointerUp.bind(this),
      pointercancel: this.handlePointerCancel.bind(this),
      pointerleave: this.handlePointerLeave.bind(this),
    };

    /** @private */
    this.events = new EventEmitter();
  }

  /**
   *
   * @param {GlobalEventHandlers} container
   */
  register(container) {
    container.addEventListener('contextmenu', this.handlers.contextmenu);
    container.addEventListener('pointerdown', this.handlers.pointerdown);
    container.addEventListener('pointerup', this.handlers.pointerup);
    container.addEventListener('pointercancel', this.handlers.pointercancel);
    container.addEventListener('pointerleave', this.handlers.pointerleave);
  }

  /**
   *
   * @param {GlobalEventHandlers} container
   */
  deregister(container) {
    container.removeEventListener('contextmenu', this.handlers.contextmenu);
    container.removeEventListener('pointerdown', this.handlers.pointerdown);
    container.removeEventListener('pointerup', this.handlers.pointerup);
    container.removeEventListener('pointercancel', this.handlers.pointercancel);
    container.removeEventListener('pointerleave', this.handlers.pointerleave);
  }

  /**
   *
   * @template {keyof Handlers} T
   * @param {T} event
   * @param {Handlers[T]} callback
   */
  on(event, callback) {
    this.events.on(event, callback);
  }

  /**
   *
   * @param {MouseEvent} e
   */
  handleContextMenu(e) {
    // Release if non-left mouse button is clicked
    this.release();
  }

  /**
   *
   * @param {PointerEvent} e
   */
  handlePointerDown(e) {
    // Release if non-left mouse button is clicked
    // (or gesture is not allowed for this event)
    if (e.button !== 0 || !this.config.allowGesture(e)) {
      this.release();
      return;
    }

    const cur = this.getStat(e);

    if (this.getContinuation(this.last['tapup'], cur) === 'tap') {
      this.tapCount++;
    } else {
      this.tapCount = 1;
    }

    const tapCount = this.tapCount;

    this.clearHold();

    this.holdTimeout = setTimeout(() => {
      this.events.emit('gesture', /** @type {HoldEvent} */({
        type: 'hold',
        event: e,
        position: cur.positionRel,
        tapCount: tapCount,
      }));
    }, this.config.holdMinDelay);

    this.emitTap('tapdown', e, cur);
  }

  /**
   *
   * @param {PointerEvent} e
   */
  handlePointerUp(e) {
    if (e.button !== 0 || !this.config.allowGesture(e)) {
      return;
    }

    const cur = this.getStat(e);

    this.clearHold();

    const cont = this.getContinuation(this.last['tapdown'], cur);
    if (cont === 'tap') {
      this.emitTap('tapup', e, cur);
    } else if (this.tapCount === 1 && cont === 'swipe') {
      // The cast should be appropriate because swipe can only be detected
      // when last tapdown is set
      const begin = /** @type {Stat} */ (this.last['tapdown']);
      const end = cur;

      // atan2 takes y coordinate counter-clockwise
      const angle = Math.atan2(
        begin.positionPx.y - end.positionPx.y,
        end.positionPx.x - begin.positionPx.x
      );
      const angleDegAbs = Math.abs(angle / Math.PI * 180);

      /** @type {Direction} */
      let direction;
      if (angleDegAbs < 45) {
        direction = 'east';
      } else if (angleDegAbs < 135) {
        direction = angle > 0 ? 'north' : 'south';
      } else {
        direction = 'west';
      }

      this.events.emit('gesture', /** @type {SwipeEvent} */({
        type: 'swipe',
        event: e,
        begin: begin.positionRel,
        end: end.positionRel,
        angle,
        direction,
      }));

      this.reset();
    } else {
      this.release();
    }
  }

  /**
   *
   * @param {PointerEvent} e
   */
  handlePointerCancel(e) {
    this.release();
  }

  /**
   *
   * @param {PointerEvent} e
   */
  handlePointerLeave(e) {
    const { tapdown, tapup } = this.last;

    if (tapdown === null || (tapup !== null && tapdown.date > tapup.date)) {
      this.release();
    }
  }

  /**
   * @private
   * @param {TapEvent['type']} type
   * @param {PointerEvent} event
   * @param {Stat} stat
   */
  emitTap(type, event, stat) {
    this.events.emit('gesture', /** @type {TapEvent} */({
      type,
      event,
      position: stat.positionRel,
      tapCount: this.tapCount,
    }));

    this.last[type] = stat;
  }

  /**
   * @private
   */
  release() {
    const isActive = this.isActive;
    this.reset();
    if (isActive) {
      this.events.emit('release');
    }
  }

  /**
   * @private
   */
  reset() {
    this.tapCount = 0;
    this.clearHold();
    this.last = {
      'tapdown': null,
      'tapup': null,
    };
  }

  /**
   * @private
   */
  get isActive() {
    return this.tapCount !== 0 || this.last.tapdown !== null || this.last.tapup !== null;
  }

  /**
   * @private
   * @param {MouseEvent} e
   * @returns {Stat}
   */
  getStat(e) {
    const bounding = /** @type {HTMLElement} */(e.target).getBoundingClientRect();

    const positionClientPx = {
      x: e.clientX,
      y: e.clientY,
    };

    const positionPx = {
      x: e.screenX || positionClientPx.x,
      y: e.screenY || positionClientPx.y,
    };

    const positionRel = {
      x: (positionClientPx.x - bounding.left) / bounding.width,
      y: (positionClientPx.y - bounding.top) / bounding.height,
    };

    return {
      date: new Date(),
      positionClientPx,
      positionPx,
      positionRel,
    };
  }

  /**
   *
   * @param {Stat | null} last
   * @param {Stat} current
   */
  getContinuation(last, current) {
    if (last === null) {
      return 'tap';
    }

    if (current.date.valueOf() - last.date.valueOf() > this.config.tapMaxDelay) {
      return 'cancel';
    }

    const distanceSq = (
      (current.positionPx.x - last.positionPx.x) ** 2
      + (current.positionPx.y - last.positionPx.y) ** 2
    );

    if (distanceSq <= this.config.tapMaxDistance ** 2) {
      return 'tap';
    }

    if (distanceSq >= this.config.swipeMinDistance ** 2) {
      return 'swipe';
    }

    return 'cancel';
  }

  /**
   * @private
   */
  clearHold() {
    if (this.holdTimeout !== null) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }
  }
}
