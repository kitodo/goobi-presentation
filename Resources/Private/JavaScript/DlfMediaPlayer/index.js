// @ts-check

export { default as Chapters } from './Chapters';
export { ControlPanelButton, FullScreenButton, OverflowMenuButton } from './controls';
export { action } from './lib/action';
export { default as buildTimeString, getTimeStringPlaceholders } from './lib/buildTimeString';
export { default as DlfMediaPlayer } from './DlfMediaPlayer';
export { default as DlfMediaPlugin } from './DlfMediaPlugin';

import DlfMediaPlayer from './DlfMediaPlayer';
window.DlfMediaPlayer = DlfMediaPlayer;
