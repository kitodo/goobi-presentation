/**
 * @jest-environment jsdom
 */

// @ts-check

import { describe, expect, test } from '@jest/globals';
import Environment from '../../lib/Environment';
import { action } from '../lib/action';
import ControlPanelButton from './ControlPanelButton';
import { createShakaPlayer } from './test-util';

describe('ControlPanelButton', () => {
  const shk = createShakaPlayer();
  const env = new Environment();

  test('basic', () => {
    let clicked = 0;
    const buttonContainer = document.createElement('div');
    const button = new ControlPanelButton(buttonContainer, shk.controls, env, {
      material_icon: 'info',
      title: "Do it now",
      onClickAction: action({
        execute: () => {
          clicked++;
        },
      }),
    });
    const domButton = buttonContainer.querySelector('button');
    expect(domButton?.ariaLabel).toBe("Do it now");
    domButton?.click();
    expect(clicked).toBe(1);
  });

  test('allows to omit title', () => {
    const buttonContainer = document.createElement('div');
    const button = new ControlPanelButton(buttonContainer, shk.controls, env);
    const domButton = buttonContainer.querySelector('button');
    expect(domButton?.ariaLabel).toBe("");
  });
});
