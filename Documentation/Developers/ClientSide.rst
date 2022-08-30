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

Control Flow and Events
=======================

*  The ``Document`` plugin creates an instance of the ``Controller`` class (see ``Controller.js``) and dispatches the event ``tx-dlf-documentLoaded``.

*  Plugins that would like to interact with the document object listen to ``tx-dlf-documentLoaded``, and get the ``Controller`` instance from the event detail.

   .. code-block:: javascript

      window.addEventListener('tx-dlf-documentLoaded', (e) => {
          this.docController = e.detail.docController;
      });

*  Whenever a plugin would like to *change* the view state (currently, to change the page or to toggle doublepage mode), it should call the ``Controller::changeState`` or ``Controller::changePage`` method.
   This dispatches the event ``tx-dlf-stateChanged``, which is of type ``dlf.StateChangeEvent`` (see ``types.d.ts``).

   .. code-block:: javascript

      this.docController.changePage(1);

*  If a plugin would like to react to changes of the view state, it may listen to the ``tx-dlf-stateChanged`` event.
   The ``Controller::eventTarget`` tells on which element the event listener should be registered.

   .. code-block:: javascript

      this.docController.eventTarget.addEventListener('tx-dlf-stateChanged', (e) => {
          if (e.detail.page !== undefined) {
              console.log(`Switched to page ${e.detail.page}`);
          }
      });

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

URLs and Slugs
==============

For dynamic link generation on the client, a URL template is generated in ``DocumentController::getUrlTemplate()``.
The template contains placeholders for the relevant parameters, which are then replaced by the current values in ``Controller::makePageUrl()``.
The generated URL does not include a ``cHash``.

This solution is intended to avoid generating all possible URL variants on the backend while still supporting slugs.

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

*  See ``types.d.ts`` for JavaScript type declarations
*  ``TODO(client-side)``: TODOs related to client-side features

Migration
=========

- Add page for prerendering metadata
- Add document plugin to page view
- Set ``showFull = 1`` in table of contents
- Template adjustments
