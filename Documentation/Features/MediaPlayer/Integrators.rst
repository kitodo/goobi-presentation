===============
For Integrators
===============

Embedding the Player
====================

The media player is implemented as a custom HTML element ``<dlf-media>``.

Basic
-----

Generally speaking, syntax is oriented at the native ``<video>`` tag.
Here is a simple example:

.. code-block:: html

   <dlf-media poster="https://www.example.com/poster.jpg" start="10">
     <source src="https://www.example.com/manifest.mpd" type="application/dash+xml">
     <source src="https://www.example.com/playlist.m3u8" type="application/x-mpegurl">
     <source src="https://www.example.com/static.mp4" type="video/mp4">
   </dlf-media>

As with native videos, the sources are tried in order, and the first one that is supported is played. The MIME type must always be given. The poster image, if given, is shown until playback is first started.

Chapter Markers
---------------

To add chapter markers, use the ``<dlf-chapter>`` tag:

.. code-block:: html

   <dlf-media>
     <!-- snip: sources -->

     <dlf-chapter timecode="0" title="First"></dlf-chapter>
     <dlf-chapter timecode="23.5" title="Second"></dlf-chapter>
   </dlf-media>

The timecode is given in seconds. Fractional numbers are possible.

.. _playermode:

Player Mode
-----------

There are two attributes to control player mode:

*  ``mode``: Either ``audio`` or ``video`` to use a fixed mode, or ``auto`` (default) to auto-determine the mode based on media content.
*  ``mode-fallback``: When setting ``mode="auto"``, this is the initial mode used until the media type is determined.
   To avoid flicker due to mode switching, it is best if the fallback mode already matches the media type.

.. code-block:: html

   <dlf-media mode="auto" mode-fallback="video">
     <!-- snip -->
   </dlf-media>

Control Elements
----------------

To add control elements to the player, use the ``<dlf-media-controls>`` tag.

.. code-block:: html

   <dlf-media-controls>
     <!-- Use a predefined button via "data-type" -->
     <button data-type="volume"></button>
     <button data-type="mute"></button>
     <button data-type="fullscreen"></button>
     <!--
       Define a custom button:
       * data-t-title: Translation key of tooltip
       * data-action: Key for onclick action
     -->
     <button
      class="material-icons-round sxnd-help-button"
      data-t-title="control.help.tooltip"
      data-action="modal.help.open"
     >
       info_outline
     </button>
   </dlf-media-controls>

More
----

*  ``end``
*  ``config``
*  ``fullscreen-element``

``<slub-media>``
================

When using ``<slub-media>`` instead of ``<dlf-media>``, some additional features and options are available.

Metadata
--------

Video metadata may be provided in the ``<dlf-meta>`` tag. This is used, for example, to imprint the video title on screenshots.

.. code-block:: html

   <slub-media>
     <!-- snip: sources -->

     <dlf-meta key="title" value="Schattensucher"></dlf-meta>
   </slub-media>

Surrounding Element
-------------------

To make sure that modals are sized and positioned appropriately even in audio mode, the ID of an element containing the media may be provided.
It is also used when switching to full screen.

.. code-block:: html

   <div id="tx-dlf-view" class="tx-dlf-view">
     <slub-media fullscreen-element="tx-dlf-view">
       <!-- snip -->
     </slub-media>
   </div>

Styling the Player
==================

The player can be styled using CSS variables, here shown in Less syntax.

.. code-block:: scss

   .dlf-shaka {
     &[data-mode="audio"] {
       --controls-color: #2a2b2c;

       --volume-base-color: rgba(0, 0, 0, 0.4);
       --volume-level-color: rgba(0, 0, 0, 0.8);

       .dlf-media-flat-seek-bar {
         --base-color: rgba(0, 0, 0, 0.3);
         --buffered-color: rgba(0, 0, 0, 0.54);
         --played-color: #2a2b2c;
       }

       .dlf-media-chapter-marker {
         background-color: #abc;
       }
     }
   }

Extending the Player
====================

If you would like to extend the player, you may inherit from it and define a custom element.

.. code-block:: javascript

   class MyMediaPlayer extends DlfMediaPlayer {
     constructor() {
       super();
     }

     connectedCallback() {
       super.connectedCallback();
     }
   }

   customElements.define('my-media', MyMediaPlayer);

For styling, use the Less function ``dlf-media-base``:

.. code-block:: scss

   my-media {
     .dlf-media-base();
   }

The new element ``<my-media>`` may then be used just as ``<dlf-media>``, plus any additional attributes or child elements that you query within ``MyMediaPlayer``.

This is done in ``SlubMediaPlayer`` to define an extended ``<slub-media>`` element.
