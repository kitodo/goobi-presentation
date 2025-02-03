// @ts-check

import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';

import SlubMediaPlayer from 'SlubMediaPlayer/SlubMediaPlayer';
window.SlubMediaPlayer = SlubMediaPlayer;

import 'SlubMediaPlayer/components/marker-table';
import 'SlubMediaPlayer/components/equalizer/EqualizerPlugin';
