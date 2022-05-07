// @ts-check

export { default as Chapters } from './Chapters';
export { WaveForm } from './components/waveform';
export { ControlPanelButton, FullScreenButton, OverflowMenuButton } from './controls';
export { default as Markers } from './Markers';
export { action } from './lib/action';
export { default as buildTimeString, getTimeStringPlaceholders } from './lib/buildTimeString';
export { default as DlfMediaPlayer } from './DlfMediaPlayer';
export { default as DlfMediaPlugin } from './DlfMediaPlugin';

import DlfMediaPlayer from './DlfMediaPlayer';
window.DlfMediaPlayer = DlfMediaPlayer;

import './components/waveform';
