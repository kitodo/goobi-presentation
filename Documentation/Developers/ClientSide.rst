===========
Client-Side
===========

Document Descriptor
===================

The method ``Doc::toArray()`` collects all information used by the frontend into a JSON-serializable array.
See the type ``dlf.PageObject`` for an outline of its structure.

Page Change
===========

When an element such as a navigation button wants to change the page, the ``tx-dlf-pageChanged`` event is fired.

*  The event is dispatched on ``document.body`` and is of type ``dlf.PageChangeEvent``.
*  The detail object contains the following properties:

   *  ``page``: Number of new page

Metadata
========

To dynamically show the metadata sections of the current page:

*  At initial load, all metadata sections are rendered into the HTML markup.
   The attribute ``data-dlf-section`` names the ID of the logical section.
   Sections that to not belong to the initial page are hidden.
*  For each page, the document objects lists the sections that the page belongs to.
*  On page change, this information is used to show/hide the sections depending on whether or not the page belongs to it.

Rootline configuration is considered.

Various
=======

*  Events

   *  ``tx-dlf-pageChanged``
   *  ``tx-dlf-configChanged``

*  Properties

   *  ``data-page-link``
   *  ``data-file-groups``
   *  ``data-dlf-section``
   *  ``data-text``

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
