// @ts-check

export { default as Chapters } from './Chapters';
export { ControlPanelButton, FullScreenButton, OverflowMenuButton } from './controls';
export { action } from './lib/action';
export { default as buildTimeString, timeStringFromTemplate } from './lib/buildTimeString';
export { default as DlfMediaPlayer } from './DlfMediaPlayer';

import DlfMediaPlayer from './DlfMediaPlayer';
window.DlfMediaPlayer = DlfMediaPlayer;
