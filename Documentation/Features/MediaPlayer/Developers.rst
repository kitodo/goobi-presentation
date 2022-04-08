==============
For Developers
==============

.. contents::
   :local:
   :depth: 2

Code Organization
=================

This is a broad outline of the directory and class structure to aid getting acquainted with the code.
To learn more about individual classes or methods, have a look at their doc-comments.

lib
---

The ``lib/`` folder contains functionality that either is used throughout or isn't strictly related to the player.

Notably, ``class Environment`` encapsulates quasi-global state such as the set of language strings.
An instance of this is constructed at startup and passed down to where it is needed (in variables named ``env``).

DlfMediaPlayer
--------------

``class DlfMediaPlayer`` is the core player. It integrates `Shaka Player <https://github.com/shaka-project/shaka-player>`__, loads and plays media, and provides a UI.

``class ShakaFrontend`` encapsulates the visible part of the player UI. It is based upon Shaka Player UI, configuring it and replacing, for example, the seek bar with a custom one (``FlatSeekBar``).

SlubMediaPlayer
---------------

``class SlubMediaPlayer`` derives from ``DlfMediaPlayer`` to customize and extend it, and to integrate it into the the *Digital Collections* page view.
Currently, its tasks are:

*  Read the initial timecode from the URL and pass it to ``DlfMediaPlayer``.
*  Integrate with the table of contents and page select (jump to chapter markers, highlight current chapter).
*  React to keyboard events, using actions defined in ``DlfMediaPlayer``.
*  Add help, screenshot and bookmark modal.

Consideration/TODO: It may make sense to move some of this functionality into ``DlfMediaPlayer``.

Aspects
=======

Localization
------------

The player can be localized via TYPO3/XLIFF language files.

*  There is a separate language file for the media player related translation strings.
   The file to be used is configured in the TypoScript setting ``playerTranslations.baseFile`` of the player plugin, which defaults to ``locallang_media.xlf``.

*  Translation strings use the `ICU MessageFormat <https://unicode-org.github.io/icu/userguide/format_parse/>`__ syntax,
   which in particular supports pluralization, enumerations (via ``select``), number formatting (e.g., percentages), and named placeholders.
   On the client, the strings are processed using the `Intl MessageFormat <https://www.npmjs.com/package/intl-messageformat>`__ library from FormatJS.

   (Consideration/TODO: Pre-process translation strings into JavaScript functions to dispense of the library and reduce bundle size.)

*  The translations are collected and serialized into a JSON string in the ``MediaPlayerConfigViewHelper``.
   The result array also contains the two-letter ISO code, which is passed to Shaka Player's UI.

*  To access translation in the application, ``Environment`` is used:

   * ``Environment::setLang()`` is called at startup to store the translations.
   * ``Environment::t()`` translates a message key.

Keybindings
-----------

The keyboard shortcuts are registered in the top-level component to allow fine control of which component receives them.
Existing keybindings (e.g., from Shaka Player) are disabled or overridden as far as possible.

The available keybindings are listed in ``keybindings.json``:

*  The result object is an array of ``type Keybinding``, which is defined and documented in ``SlubMediaPlayer/types.d.ts``.
*  Keys are bound to an *action*, which are defined in ``DlfMediaPlayer::getActions()`` and extended in ``SlubMediaPlayer::getActions()``.
*  Event handlers are registered in ``SlubMediaPlayer::configureFrontend()``.

DOM Handling
------------

Generally speaking, DOM construction and manipulation is done in a "vanilla" way,
though with some utilities to make this less tedious.

``lib/util.js`` defines a utility function ``e()`` for constructing DOM elements and trees.

Tooling
=======

Overview
--------

*  Webpack 5 is used for building.
   Configuration file: ``/Build/webpack.config.js``.
*  Jest is used for unit tests.
   Configuration is embedded in ``/Build/package.json``.
*  TypeScript-flavored JSDoc and the TypeScript compiler are used for static typing.
   Configuration file: ``/jsconfig.json``
*  ESLint (``eslint-plugin-compat``) and Babel (via Webpack) are used to check and improve browser compatibility.

Command Reference
-----------------

Install
~~~~~~~

.. code-block:: shell

   cd Build/

   # Install/Use Node
   nvm install
   nvm use

   # Install dependencies
   npm ci

Build
~~~~~

.. code-block:: shell

   # Build in watch/development mode
   npm run watch
   # Build in production mode
   npm run build

Validate
~~~~~~~~

.. code-block:: shell

   # Check static types
   npm run typecheck
   # (Alternative) Watch mode
   npm run tsc-watch

   # Run unit tests
   npm test
   # (Alternative) Watch mode
   npm test -- --watch
   # With coverage report
   npm test -- --coverage
   xdg-open coverage/lcov-report/index.html

   # Check browser compatibility
   # - in source files:
   npm run compat
   # - in built files:
   npm run compat-build
