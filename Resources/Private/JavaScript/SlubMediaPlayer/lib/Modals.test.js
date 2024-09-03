/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import EventManager from 'lib/EventManager';
import Modals from 'SlubMediaPlayer/lib/Modals';
import SimpleModal from 'SlubMediaPlayer/lib/SimpleModal';

describe('Modals', () => {
  test('basic', async () => {
    const modals = Modals(new EventManager(), {
      first: new SimpleModal(document.body, {}),
      second: new SimpleModal(document.body, {}),
    });

    expect(modals.hasOpen()).toBe(false);

    // Open first modal
    modals.first.open();
    await modals.update();
    expect(modals.first.isOpen).toBe(true);
    expect(modals.second.isOpen).toBe(false);
    expect(modals.hasOpen()).toBe(true);

    // Open first modal again (should stay open)
    modals.first.open();
    await modals.update();
    expect(modals.first.isOpen).toBe(true);
    expect(modals.second.isOpen).toBe(false);
    expect(modals.hasOpen()).toBe(true);

    // Open second modal
    modals.second.open();
    await modals.update();
    expect(modals.first.isOpen).toBe(true);
    expect(modals.second.isOpen).toBe(true);
    expect(modals.hasOpen()).toBe(true);

    // Close all
    modals.closeAll();
    await modals.update();
    expect(modals.first.isOpen).toBe(false);
    expect(modals.second.isOpen).toBe(false);
    expect(modals.hasOpen()).toBe(false);
  });
});
