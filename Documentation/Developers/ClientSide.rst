===========
Client-Side
===========

Document Descriptor
===================

The method ``Doc::toArray()`` collects all information used by the frontend into a JSON-serializable array.
See the type ``dlf.PageObject`` for an outline of its structure.

*  For each page, there is an entry with the following keys:

   *  ``url``: URL of the image
   *  ``mimetype``: MIME type of the image.

Page Change
===========

When an element such as a navigation button wants to change the page, the ``tx-dlf-pageChanged`` event is fired.

*  The event is dispatched on ``document.body`` and is of type ``dlf.PageChangeEvent``.
*  The detail object contains the following properties:

   *  ``page``: Number of new page
