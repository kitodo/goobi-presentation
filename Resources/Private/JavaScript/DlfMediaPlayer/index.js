// @ts-check

export { ControlPanelButton, FullScreenButton, OverflowMenuButton } from 'DlfMediaPlayer/controls';
export { default as buildTimeString, getTimeStringPlaceholders } from 'DlfMediaPlayer/lib/buildTimeString';
export { default as Chapters } from 'DlfMediaPlayer/Chapters';
export { default as Markers } from 'DlfMediaPlayer/Markers';
export { default as DlfMediaPlayer } from 'DlfMediaPlayer/DlfMediaPlayer';
export { default as DlfMediaPlugin } from 'DlfMediaPlayer/DlfMediaPlugin';
export { action } from 'DlfMediaPlayer/lib/action';
export { WaveForm } from 'DlfMediaPlayer/components/waveform';

import DlfMediaPlayer from 'DlfMediaPlayer/DlfMediaPlayer';
window.DlfMediaPlayer = DlfMediaPlayer;

import 'DlfMediaPlayer/components/waveform';
