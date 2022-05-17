/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import Modals from './Modals';
import SimpleModal from './SimpleModal';

describe('Modals', () => {
  test('basic', async () => {
    const modals = Modals({
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
