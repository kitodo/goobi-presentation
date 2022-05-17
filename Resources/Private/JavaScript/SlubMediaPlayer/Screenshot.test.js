/**
 * @jest-environment jsdom
 */

// @ts-check

import { beforeEach, expect, test } from '@jest/globals';
import Environment from '../lib/Environment';
import { fillMetadata } from './lib/metadata';
import ScreenshotModal from './modals/ScreenshotModal';
import { drawScreenshot } from './Screenshot';

beforeEach(() => {
  // TODO: Reset JSDOM in a more robust way
  document.body.innerHTML = '';
});

function getEnvironment() {
  const env = new Environment();
  env.setLang({
    locale: 'en_US',
    twoLetterIsoCode: 'en',
    phrases: {
      'key.generic': "{key}",
      'key.unto': " to ",
      'modal.screenshot.title': "Screenshot",
      'modal.screenshot.configuration': "Show Metadata",
      'modal.screenshot.download-image': "Download Image",
      'modal.screenshot.metadata': "Metadata",
      'modal.screenshot.metadata-overlay': "Overlay on image",
      'modal.screenshot.file-format': "File Format",
      'modal.screenshot.snap-tip': "Tip: Snap via {keybinding}",
    },
  });
  return env;
}

function getTestMetadataArray() {
  return {
    title: ["Test Video"],
    year: ["1912"],
  };
}

test('can open screenshot overlay', async () => {
  const overlay = () => document.querySelector('.screenshot-modal');

  // not opened yet
  expect(overlay()).toBeNull();

  // opened; exact tags are in snapshot
  const modal = new ScreenshotModal(document.body, getEnvironment(), {
    keybindings: [
      {
        keys: ["s"],
        action: "modal.screenshot.snap",
        kind: "other",
        order: 0
      },
    ],
    screnshotCaptions: [],
    constants: {},
  });
  modal.setVideo(new VideoMock(1920, 1080));
  modal.setMetadata(getTestMetadataArray());
  modal.open();
  await modal.update();
  expect(overlay()).toMatchSnapshot();
});

class VideoMock extends HTMLVideoElement {
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    super();

    this._mockWidth = width;
    this._mockHeight = height;
  }

  /** @override */
  get width() {
    return this._mockWidth;
  }

  /** @override */
  get videoWidth() {
    return this._mockWidth;
  }

  /** @override */
  get height() {
    return this._mockHeight;
  }

  /** @override */
  get videoHeight() {
    return this._mockHeight;
  }
}

customElements.define('video-mock', VideoMock, { extends: 'video' });

test('can draw to canvas', () => {
  const metadata = getTestMetadataArray();

  /**
   * @param {number} videoWidth
   * @param {number} videoHeight
   * @param {number} minWidth
   */
  const snapshotWithSize = (videoWidth, videoHeight, minWidth = 0) => {
    const video = new VideoMock(videoWidth, videoHeight);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error();
    }

    drawScreenshot(context, video, {
      captions: [
        { v: 'top', h: 'left', text: "top left" },
        { v: 'top', h: 'right', text: "top right" },
        { v: 'bottom', h: 'left', text: "bottom left" },
        { v: 'bottom', h: 'right', text: fillMetadata("{title} / {year}", metadata) },
      ],
      minWidth,
    });

    // @ts-ignore TODO: Why wouldn't it recognize "__getEvents"?
    const events = context.__getEvents();
    expect(events).toMatchSnapshot();

    expect(canvas.width).toBeGreaterThanOrEqual(minWidth);
    expect(canvas.width / canvas.height).toBeCloseTo(videoWidth / videoHeight);
  };

  snapshotWithSize(1920, 1080);
  snapshotWithSize(960, 540);
  snapshotWithSize(320, 180, /* minWidth= */ 480);
});
