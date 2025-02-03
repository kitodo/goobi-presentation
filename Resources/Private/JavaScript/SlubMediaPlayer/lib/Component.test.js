// @ts-check

import { describe, expect, jest, test } from '@jest/globals';
import Component from 'SlubMediaPlayer/lib/Component';

describe('Component', () => {
  test('basic', async () => {
    /** @type {State[]} */
    const renderStates = [];

    const updateCallback = jest.fn();

    /**
     * @typedef {{ n: number; s: string; }} State
     */

    /**
     * @extends {Component<State>}
     */
    class C extends Component {
      /**
       * @override
       * @param {State} state
       */
      render(state) {
        renderStates.push(state);
      }
    }

    const c = new C({
      n: 0,
      s: "",
    });

    c.on('updated', updateCallback);

    // Updates are squashed
    c.setState({ n: 1 });
    c.setState({ n: 2 });
    await c.update();
    expect(renderStates).toEqual([{ n: 2, s: "" }]);
    expect(updateCallback).toHaveBeenCalledTimes(1);
    expect(updateCallback).toHaveBeenCalledWith(renderStates[0]);
    renderStates.length = 0;

    // Empty update
    await c.update();
    expect(renderStates).toEqual([]);
  });
});
