=============
Waveform View
=============

.. contents::
   :local:
   :depth: 2

Overview
========

The waveform component is based on a toolkit provided by BBC.
It can be used, for example, to set points and segments that can be processed or exported.

*  `peaks.js: JavaScript UI component for interacting with audio waveforms <https://github.com/bbc/peaks.js/>`__
*  `waveform-data.js: Audio Waveform Data Manipulation API – resample, offset and segment waveform data in JavaScript <https://github.com/bbc/waveform-data.js>`__
*  `audiowaveform: C++ program to generate waveform data <https://github.com/bbc/audiowaveform>`__

METS
====

For information on how to link preprocessed audio waveform data, see :ref:`the section on METS <mets_waveform>`.

Integration
===========

A custom ``<dlf-waveform>`` tag is exposed that can be used in the HTML template.

.. code-block:: html

   <dlf-waveform
      id="tx-dlf-media-waveform"
      forPlayer="tx-dlf-media"
      src="https://www.example.com/waveform.dat"
      type="application/vnd.kitodo.audiowaveform"
   ></dlf-waveform>

Other attributes:

*  Use ``hidden`` to control whether or not the waveform is visible.

Frontend
========

An instance of Peaks.js fulfills multiple functions:

*  Model for point and segment data
*  Controller and view to render waveform and points/segments into a given DOM element

An instance of BBC's ``WaveformData`` is used as a model of the waveform data and passed to Peaks.js for rendering.

We have the following class structure:

*  ``Markers`` is the model for a collection of points and segments.
   An instance of this is created in ``DlfMediaPlayer``.
   Actions to add markers via keybindings also are registered in the player.

*  Custom components that serve as view of the player's markers:

   *  ``WaveForm`` renders a waveform by integrating and customizing Peaks.js.
      A major part also is to adapt Peaks to ``Markers``.
      (We don't use the internal model of Peaks.js directly. This allows to set markers when Peaks is not, or not yet, initialized, e.g., if a waveform is not available or not shown yet.)

   *  ``MarkerTable`` lists all segments and allows to further interact with them, e.g. to edit labels or export the list.

.. _audiowaveform:

Backend
=======

To avoid loading the full audio file before waveform data can be displayed,
the audio is preprocessed using `audiowaveform`.

For installation or build instructions, see https://github.com/bbc/audiowaveform.

Sample call:

.. code-block:: shell

   # 8 bit, 1024 samples/pixel
   # (at 44800 Hz, this correponds to a maximum resolution of 43.75 pixels/second)
   audiowaveform -i input.mp3 -o output.dat -b 8 -z 1024
