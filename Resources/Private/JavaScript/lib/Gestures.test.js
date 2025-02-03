/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import { setTimeout } from 'timers/promises';

import { e } from 'lib/util';
import { PointerMock } from 'lib/testing/PointerMock';
import Gestures from 'lib/Gestures';

/**
 * @typedef {{
 *  events: any[];
 *  g: Gestures;
 * }} GesturesObj
 */

/**
 * @param {GlobalEventHandlers} container
 * @returns {(config?: Partial<import('lib/Gestures').Config>) => GesturesObj}
 */
function gestureFactory(container) {
  return (config = {}) => {
    /** @type {GesturesObj} */
    const result = {
      events: [],
      g: new Gestures(config),
    };

    result.g.register(container);

    for (const type of /** @type {const} */(['gesture', 'release'])) {
      result.g.on(type, (/** @type {any} */ event) => {
        result.events.push({
          type: type === 'gesture' ? event.type : type,
          ...event
        });
      })
    }

    return result;
  };
}

function makeContainer() {
  const result = e('div', {});
  result.getBoundingClientRect = () => /** @type {any} */({
    x: 10,
    y: 10,
    width: 1000,
    height: 1000,
    left: 10,
    top: 10,
    bottom: 1100,
    right: 1100,
  });
  return result;
}

for (const pointerType of /** @type {const} */(['mouse', 'touch'])) {
  describe(`[${pointerType}] click gestures`, () => {
    const container = makeContainer();
    const gestures = gestureFactory(container);

    const pointer = new PointerMock(pointerType, container);

    test('detects click position', async () => {
      const g = gestures();

      await pointer.click(760, 510);

      expect(g.events).toMatchObject([
        { type: 'tapdown', position: { x: 0.75, y: 0.5 } },
        { type: 'tapup', position: { x: 0.75, y: 0.5 } },
      ]);
    });

    test('detects down/release when click delay is high', async () => {
      const g = gestures({ tapMaxDelay: 50 });

      await pointer.click(0, 0, { delay: 100 });

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'release' },
      ]);
    });

    test('detects click when moving mouse only a little', async () => {
      const g = gestures({ tapMaxDistance: 50 });

      await pointer.move(760, 100);
      await pointer.down();
      await pointer.move(760, 125);
      await pointer.up();

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'tapup', tapCount: 1 },
      ]);
    });

    test('detects double click', async () => {
      const g = gestures({ tapMaxDelay: 100 });

      // NOTE: This also tests that the tapDelay is considered across down/up
      await pointer.click(0, 0, { delay: 50 });
      await setTimeout(75);
      await pointer.click(0, 0, { delay: 50 });

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'tapup', tapCount: 1 },
        { type: 'tapdown', tapCount: 2 },
        { type: 'tapup', tapCount: 2 },
      ]);
    });

    test('detects two single clicks when delay is too high', async () => {
      const g = gestures({ tapMaxDelay: 50 });

      await pointer.click(0, 0, { delay: 25 });
      await setTimeout(100);
      await pointer.click(0, 0, { delay: 25 });

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'tapup', tapCount: 1 },
        { type: 'tapdown', tapCount: 1 },
        { type: 'tapup', tapCount: 1 },
      ]);
    });

    test('detects hold with tapCount = 1', async () => {
      const g = gestures({ tapMaxDelay: 50, holdMinDelay: 50 });

      await pointer.down()
      await setTimeout(100);
      await pointer.up();

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 }, // TODO?
        { type: 'hold', tapCount: 1 },
        { type: 'release' },
      ]);
    });

    test('detects hold with tapCount = 2', async () => {
      const g = gestures({ tapMaxDelay: 50, holdMinDelay: 50 });

      await pointer.click(0, 0, { delay: 25 });
      await setTimeout(25);
      await pointer.down()
      await setTimeout(100);
      await pointer.up();

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'tapup', tapCount: 1 },
        { type: 'tapdown', tapCount: 2 }, // TODO?
        { type: 'hold', tapCount: 2 },
        { type: 'release' },
      ]);
    });
  });

  describe(`[${pointerType}] swipe gestures`, () => {
    const container = makeContainer();
    const gestures = gestureFactory(container);

    const pointer = new PointerMock(pointerType, container);

    // TODO: No swipe after click

    test('detects east swipe', async () => {
      const g = gestures({ tapMaxDistance: 50 });

      await pointer.move(260, 10);
      await pointer.down();
      await setTimeout(50);
      await pointer.move(510, 10);
      await pointer.up();

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        {
          type: 'swipe',
          begin: { x: 0.25, y: 0 },
          end: { x: 0.5, y: 0 },
          direction: 'east',
        },
      ]);
    });

    test('detects west swipe', async () => {
      const g = gestures({ tapMaxDistance: 50 });

      await pointer.move(510, 10);
      await pointer.down();
      await setTimeout(50);
      await pointer.move(260, 10);
      await pointer.up();

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'swipe', direction: 'west' },
      ]);
    });

    test('detects north swipe', async () => {
      const g = gestures({ tapMaxDistance: 50 });

      await pointer.move(260, 260);
      await pointer.down();
      await setTimeout(50);
      await pointer.move(260, 10);
      await pointer.up();

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'swipe', direction: 'north' },
      ]);
    });

    test('detects south swipe', async () => {
      const g = gestures({ tapMaxDistance: 50 });

      await pointer.move(260, 10);
      await pointer.down();
      await setTimeout(50);
      await pointer.move(260, 260);
      await pointer.up();

      expect(g.events).toMatchObject([
        { type: 'tapdown', tapCount: 1 },
        { type: 'swipe', direction: 'south' },
      ]);
    });
  });
}
