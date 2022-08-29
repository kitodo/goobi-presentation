===========
Client-Side
===========

Document Plugin
===============

There is a new ``Document`` plugin that provides client-side access to the loaded document.
A separate plugin is used for a couple of reasons:

*  It will allow to make the client-side features opt-in.
*  It will be the natural place to put API endpoints if needed.
*  There doesn't seem to be another natural place to put client-side features anyways.
   (For instance, the PageView plugin may not be active in media documents.)

Document Descriptor
===================

The method ``Doc::toArray()`` collects all information used by the frontend into a JSON-serializable array.
See the type ``dlf.PageObject`` for an outline of its structure.

Page Change
===========

When an element such as a navigation button wants to change the page, the ``tx-dlf-stateChanged`` event is fired.

*  ``docController.eventTarget`` tells which element the event is dispatched on. The event is of type ``dlf.StateChangeEvent``.
*  The detail object contains the following properties:

   *  ``page``: Number of new page

Metadata
========

To dynamically show the metadata sections of the current page:

*  At initial load, only the active metadata sections are rendered (as before).
   Then, a request is sent to fetch all rendered metadata sections, and the metadata list is replaced.
   For this to work, a ``targetPidMetadata`` must be configured.
   This procedure is used to reduce because rendering all metadata sections can take some while for large documents.
*  The attribute ``data-dlf-section`` names the ID of the logical section.
   Sections that to not belong to the current page are hidden.
*  For each page, the document objects lists the sections that the page belongs to.
*  On page change, this information is used to show/hide the sections depending on whether or not the page belongs to it.

Rootline configuration is considered.

Various
=======

*  Events

   *  ``tx-dlf-stateChanged``
   *  ``tx-dlf-documentLoaded``

*  Properties

   *  ``data-page-link``
   *  ``data-file-groups``
   *  ``data-metadata-list``
   *  ``data-dlf-section``
   *  ``data-text``
   *  ``data-toc-item``
   *  ``data-toc-expand-always``
   *  ``data-toc-link``
   *  ``data-document-id``
   *  ``data-page``

*  Data CSS classes

   *  ``dlf-mimetype-label``
   *  ``page-step-back``
   *  ``page-back``
   *  ``page-first``
   *  ``page-step-forward``
   *  ``page-forward``
   *  ``page-last``
   *  ``page-select``

*  Display CSS classes

   *  ``shown-if-single``
   *  ``shown-if-double``

Code
====

*  ``TODO(client-side)``

Migration
=========

- Add page for prerendering metadata
- Add document plugin to page view
- Set `showFull = 1` in table of contents
- Template adjustments
