// @ts-check

import shaka from 'shaka-player/dist/shaka-player.ui';

export function createShakaPlayer() {
  const video = document.createElement('video');
  const container = document.createElement('div');
  container.append(video);

  const player = new shaka.Player();
  // Use attach method instead of passing video directly shaka-player v5
  player.attach(video);

  const ui = new shaka.ui.Overlay(player, container, video);
  const controls = ui.getControls();

  if (controls === null) {
    throw new Error("ui.getControls() === null");
  }

  return {
    container,
    video,
    player,
    ui,
    controls,
  };
}
