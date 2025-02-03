=========
Equalizer
=========

.. contents::
   :local:
   :depth: 2

Features
========

*  Interface to change equalizer parameters and preview frequency/phase response
*  Presets (predefined via Typoscript, user-defined in Local Storage)
*  Modes:

   *  Graphic/band equalizer (via peaking filters)
   *  RIAA equalizer (combining lowcut, lowshelf and highshelf filters)

.. _eq_configuration:

Configuration
=============

The configuration options are passed to the Equalizer in the default Fluid template.

.. code-block:: typoscript

   equalizer {
     // Whether or not the equalizer control is shown
     enabled = 1

     // Key of the preset that should be selected by default
     default = 3-band

     // Presets that are available to the user as dropdown
     presets {
       // "band-iso" defines an ISO graphic/band equalizer. Starting at 1000 Hz,
       // bands are added by stepping up and down by the specified number of octaves
       3-band {
         // Used translation key: control.sound_tools.equalizer.preset.group.graphic
         group = graphic
         mode = band-iso
         label = 3-Band
         // One decade = log2(10) octaves
         octaveStep = 3.32
       }

       // It is also possible to specify bands manually via "mode = band".
       // The following preset is (virtually) equivalent to the previous.
       3-band-manual {
         group = graphic
         mode = band
         label = 3-Band
         bands {
           0 {
             frequency = 100
             octaves = 3.32
             gain = 0
           }

           1 {
             frequency = 1000
             octaves = 3.32
             gain = 0
           }

           2 {
             frequency = 10000
             octaves = 3.32
             gain = 0
           }
         }
       }

       // In "mode = riaa", the time constants of a RIAA-style EQ can be specified.
       // Parameters that are not needed may be omitted (in particular, deepBaseRolloff).
       riaa-iec {
         group = riaa
         mode = riaa
         label = Enhanced RIAA / IEC
         params {
           trebleCut = 75
           baseBoost = 318
           baseBoostRolloff = 3180
           deepBaseRolloff = 7950
         }
       }
     }
   }

Developers
==========

Testing
-------

For testing that the equalizer produces a correct frequency response, check the "Equalizer Test" page (`<https://localhost:9000/equalizer.html>`_) hosted in :ref:`Webpack Dev Server <webpack_dev_server>`, which plays sine waves at constant amplitudes and renders the FFT.

Class Overview
--------------

*  ``EqualizerPlugin``: Player plugin to set up the equalizer and connect it to an instance of ``DlfMediaPlayer``.

   *  ``EqualizerView``: User interface for display and manipulation of EQ parameters and presets of an ``Equalizer``.
   *  ``Equalizer``: Top-level class for actual equalization. Connects to an ``AudioContext``, adds an FFT node that is used to test the frequency response, loads presets, and delegates to implementations of specific modes/filtersets (``BandEq`` and ``RiaaEq``).
