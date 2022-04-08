========
Features
========

.. contents::
   :local:

Scope:

*  Learn about the features on a semi-technical level.
*  Learn about MPEG-DASH/HLS specifics for the player.

General
=======

The media player plugin is based upon `Shaka Player <https://github.com/shaka-project/shaka-player>`__.

Supported Formats
-----------------

For adaptive bitrates, media content may be provided using either MPEG-DASH manifests or Apple HLS playlists (or both). While MPEG-DASH can nowadays be used in most browsers (via Media Source Extensions), HLS is still required for some iOS devices.

As a fallback or when adaptive bitrate streaming is not necessary, you may also supply a raw media file (such as MP3). What codecs can be used generally depends on the user's browser.

For more details on supported formats, see https://github.com/shaka-project/shaka-player.

Player Modes
============

The player supports two display modes:

*  In *video* mode, the playback controls are shown as an overlay.

*  In *audio* mode, the player consists of a control bar.

By default, the mode is auto-selected based on the media source.
It is, however, possible to adjust the mode; see the :ref:`guide for integrators <playermode>` for details.

The set of available controls and keyboard shortcuts is determined depending on source, browser and mode.

Seeking
=======

The player supports sub-second seeking. When the video has constant frame rate and information about the frame rate is available to the player (DASH or HLS), this is used to simulate frame-accurate seeking and display the current frame count. Whether or not this is precise depends on the media encoding and the browser.

To seek to the exact position of a thumbnail, hold the :kbd:`Shift` key. This currently assumes that the frame is in between the thumbnail time range, as produced by ffmpeg's fps filter.

.. note::

   Time codes are generated as follows:

   *  An hour part is included only if necessary (the video lasts at least one hour).
   *  The frame count is included if the frame rate is available.
   *  If there is no hour part, but a frame part, an "f" is appended to avoid ambiguity.

Trick Play
==========

In the player, when keeping the right arrow key pressed, media is fast-forwarded in four times the original speed.
The reverse is also possible depending on browser support.
To avoid wasting bandwidth, a so-called `trick track` in lower frame rates may be provided.

In DASH, add an adaptation set that includes the following marker:

.. code-block:: xml

   <EssentialProperty schemeIdUri="http://dashif.org/guidelines/trickmode" value="ID_HERE"/>

Replace ``ID_HERE`` by the id of the normal-speed representation.

For HLS, trick play is not supported (https://github.com/shaka-project/shaka-player/issues/742).

Multiple Video Tracks
=====================

The player supports multiple video tracks when encoded in DASH or HLS. Each track uses its own set of qualities and thumbnails. Tracks can be switched in the overflow menu.

Multitrack is not supported natively by Shaka Player, so there are some specifics of how to encode them in the manifest.

MPEG-DASH
---------

Add a separate ``<AdaptationSet>`` for each video track. In order to uniquely identify the track, the adaptation set must contain a special role ascription:

.. code-block:: xml

   <Role schemeIdUri="urn:mpeg:dash:role:2011" value="dlf:key=TRACK_ID_HERE"/>

When adding a thumbnail adaptation set, it must contain the same role ascription to match it with the video track.

Other roles may be used:

*  ``dlf:label=TEXT``: Specify TEXT as a label that is shown to the user. If no label is given, the track ID is shown instead.
*  ``dlf:label_XX=TEXT``: Localized label, where ``XX`` is replaced by the two-letter ISO code of the langauge.

- Using ``prefix#group`` to match streams to video tracks
- WIP/TODO: Using ``<Label>`` and ``dlf:label`` role to set label of video track. (multiple languages?)

HLS
---

Similarly to MPEG-DASH, set the roles in the ``CHARACTERISTICS`` attribute of the video media and the thumbnail streams.

Thumbnail Preview
=================

When the manifest contains an image track, the player loads it for the thumbnail preview. The image files are grids of thumbnails.

The player supports using multiple image tracks in varying qualities. This can be used to quickly show a lower-resolution thumbnail and switch to a higher-resolution thumbnail when available.

MPEG-DASH
---------

.. code-block:: xml

   <AdaptationSet mimeType="image/jpeg" contentType="image">
     <Representation bandwidth="2500" id="thumbnails_80x45" width="1600" height="900">
       <SegmentTemplate media="https://www.example.com/$RepresentationID$/tile_$Number$.jpg" duration="400" startNumber="1"/>
       <EssentialProperty schemeIdUri="http://dashif.org/thumbnail_tile" value="20x20"/>
     </Representation>
     <Representation bandwidth="5000" id="thumbnails_160x90" width="1601" height="900">
       <SegmentTemplate media="https://www.example.com/$RepresentationID$/tile_$Number$.jpg" duration="100" startNumber="1"/>
       <EssentialProperty schemeIdUri="http://dashif.org/thumbnail_tile" value="10x10"/>
     </Representation>
   </AdaptationSet>

.. important::

   Because of how Shaka Player handles image tracks, they must be discriminated by either width, codec or MIME type.
   To use multiple image tracks, you may thus need to offset the width of some of them (in the example, 1600 vs 1601).

Screenshot Download
===================

*  PNG or JPEG
*  Embed metadata
*  Overlay metadata
*  Directly from video

Bookmarking
===========

*  Bookmark with timecode
*  Share link (e.g. via email or Twitter)
*  Generate QR code of URL
