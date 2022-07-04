// @ts-check

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import Markers from './Markers';

describe('Markers', () => {
  test('basic', () => {
    const m = new Markers();

    const cbAdd = jest.fn();
    m.addEventListener('add', cbAdd);

    const cbRemove = jest.fn();
    m.addEventListener('remove', cbRemove);

    const s1 = m.add({
      startTime: 10,
    });
    expect(cbAdd.mock.lastCall?.[0]).toMatchObject({
      detail: {
        segments: [
          {
            startTime: 10,
            // endTime: undefined, // TODO
          },
        ]
      },
    });
    const s2 = m.add({
      startTime: 10,
      endTime: 20,
    });
    expect(m.getSegments()).toMatchObject([
      {
        startTime: 10,
        // endTime: undefined,
      },
      {
        startTime: 10,
        endTime: 20,
      },
    ]);
    m.update({
      id: s2.id,
      startTime: undefined,
      endTime: 40,
    });
    expect(m.getSegments()).toMatchObject([
      {
        startTime: 10,
        // endTime: undefined,
      },
      {
        startTime: 10,
        endTime: 40,
      },
    ]);
    m.removeById(s1.id);
    expect(cbRemove.mock.lastCall?.[0]).toMatchObject({
      detail: {
        segments: [
          {
            startTime: 10,
            // endTime: undefined,
          },
        ],
      },
    })
  });
});
