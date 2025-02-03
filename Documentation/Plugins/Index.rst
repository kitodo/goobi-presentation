.. ==================================================
.. FOR YOUR INFORMATION
.. --------------------------------------------------
.. -*- coding: utf-8 -*- with BOM.

.. include:: ../Includes.txt


.. _configuration:

################
Plugin Reference
################

.. contents::
    :local:
    :depth: 3

Kitodo Plugin Reference
=======================

Common Settings
---------------

.. _fluidplugins:

Fluid Template Configuration
----------------------------

As of Kitodo.Presentation 4.0 the Fluid rendering engine is used. The former
marker templates for plugins are not supported anymore.

Now, all HTML markup is done in Fluid. To use different templates, you have
to overload the templates by the common TYPO3 way.

The following TypoScript defines additional paths inside an "example" extension::

   plugin.tx_dlf {
      view {
         templateRootPaths {
            10 = EXT:example/Resources/Private/Plugins/Kitodo/Templates
         }
         partialRootPaths {
            10 = EXT:example/Resources/Private/Plugins/Kitodo/Partials
         }
      }
   }

In this example, you place the customized fluid template into this file::

   EXT:example/Resources/Private/Plugins/Kitodo/Partials/Navigation/Main.html


Audioplayer
-----------

The audioplayer plugin is only active if the selected document has a valid audio filegroup (fileGrpAudio).

Properties
^^^^^^^^^^
:typoscript:`plugin.tx_dlf_audioplayer.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
        Default

 - :Property:
        excludeOther_
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
        1

 - :Property:
       elementId_
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
        tx-dlf-audio


excludeOther
""""""""""""
Show only documents from the selected page.

elementId
"""""""""
ID value of the HTML element for the audio player.

Basket
------

:typoscript:`plugin.tx_dlf_basket.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
        Default

 - :Property:
       pregeneration
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       pdfgenerate
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:

 - :Property:
       pdfdownload
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:

 - :Property:
       pdfprint
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:

 - :Property:
       pdfparams
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       ##docId##,##startpage##,##endpage##,##startx##,##starty##,##endx##,##endy##,##rotation##

 - :Property:
       pdfparamseparator
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       `*`

 - :Property:
       basketGoToButton
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       targetBasket
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:


Calendar
---------

The calendar plugin may be used with newspaper and ephemeras (periodical
published media). The plugin shows itself an overview of all available
years or all issues in a calendar view of a selected year.

You can't place the plugin together with the pageview plugin on one page.
But you can use TypoScript conditions on this page to select the proper
plugin e.g by setting some specific FLUID variables.

This is an example usage of the TypoScript condition ("getDocumentType")::

    [getDocumentType({$config.storagePid}) === 'ephemera' or getDocumentType({$config.storagePid}) === 'newspaper']
    page.10.variables {
        isNewspaper = TEXT
        isNewspaper.value = newspaper_anchor
    }
    [END]

    [getDocumentType({$config.storagePid}) === 'year']
    page.10.variables {
        isNewspaper = TEXT
        isNewspaper.value = newspaper_year
    }
    [END]

    [getDocumentType({$config.storagePid}) === 'issue']
    page.10.variables {
        isNewspaper = TEXT
        isNewspaper.value = newspaper_issue
    }
    [END]

The `{$config.storagePid}` is a TypoScript constant holding the Kitodo.Presentation storage pid.

This way, the FLUID variable "isNewspaper" is set according to the given
value. Inside the FLUID template it's possible to switch to the right plugin
now.

:typoscript:`plugin.tx_dlf_calendar.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
        Default

 - :Property:
       initialDocument
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:

 - :Property:
       showEmptyYears
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       showEmptyMonths
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       1


Collection
----------

The collection plugin shows one collection, all collections or selected collections.

:typoscript:`plugin.tx_dlf_collection.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default
   :Description:
       Description


 - :Property:
       collections
   :Data Type:
       `t3tsref:data-type-list`
   :Default:

 - :Property:
       show_userdefined
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:

 - :Property:
       dont_show_single
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       randomize
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

 - :Property:
       targetFeed
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

Embedded 3D Viewer
-----------

The embedded3dviewer plugin renders an iFrame in which the configured 3D viewer displays the model.

:typoscript:`plugin.tx_dlf_embedded3dviewer.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Description:
       Description

 - :Property:
        document
   :Data Type:
        :ref:`t3tsref:data-type-string`
   :Description:
        The URL of the XML document which contains the model.

 - :Property:
       model
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Description:
        The URL of the 3D model.

 - :Property:
       viewer
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Description:
      Override the default viewer from the extension configuration (see :ref:`Embedded 3D Viewer Configuration`) with a supported viewer (from the "dlf_3d_viewers" directory).


Feeds
-----

The feeds plugin renders a RSS 2.0 feed of last updated documents of all or a specific collection.

The following steps are necessary to activate the plugin:

a. Create a new page "Feed" with slug "feed".
b. Create an extension template on this page and include the TypoScript template of the feeds plugin.
c. Place the "Kitodo Feeds" plugin on it and configure it for your needs.

The TypoScript part is necessary to switch the page rendering to a different page object.

:typoscript:`plugin.tx_dlf_feeds.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
       collections
   :Data Type:
       `t3tsref:data-type-list`
   :Default:

 - :Property:
       excludeOtherCollections
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       library
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:

 - :Property:
       limit
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       50

 - :Property:
        prependSuperiorTitle
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

 - :Property:
       title
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:

 - :Property:
       description
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:


List View
---------

:typoscript:`plugin.tx_dlf_listview.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
       limit
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       25

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

 - :Property:
        getTitle
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       basketButton
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       targetBasket
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:


Metadata
--------

:typoscript:`plugin.tx_dlf_metadata.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
        excludeOther_
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
       1

 - :Property:
        linkTitle
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
       1

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

 - :Property:
        getTitle
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
       1

 - :Property:
        showFull
   :Data Type:
        :ref:`t3tsref:data-type-boolean`
   :Default:
       1

 - :Property:
       rootline
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       0

 - :Property:
       separator
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       `#`

Navigation
----------

:typoscript:`plugin.tx_dlf_navigation.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
       features
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
      By default all features are activated. The selection is stored as comma separated list.

       doublePage,pageFirst,pageBack,pageStepBack,pageSelect,pageForward,pageStepForward,pageLast,litView,zoom,rotation,measureForward,measureBack

 - :Property:
       pageStep
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       5

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:


OAI-PMH
-------

:typoscript:`plugin.tx_dlf_oaipmh.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
       library
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:

 - :Property:
       limit
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       5

 - :Property:
       expired
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       1800

 - :Property:
       show_userdefined
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       stylesheet
   :Data Type:
       :ref:`t3tsref:data-type-resource`
   :Default:
       0


Page Grid
---------

:typoscript:`plugin.tx_dlf_pagegrid.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
       paginate.itemsPerPage
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       24

 - :Property:
       placeholder
   :Data Type:
       :ref:`t3tsref:data-type-resource`
   :Default:
       Navigation.tmpl

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

Page View
---------

:typoscript:`plugin.tx_dlf_pageview.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
       excludeOther_
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       1

 - :Property:
       features
   :Data Type:
       `t3tsref:data-type-list`
   :Default:
       1

 - :Property:
       elementId_
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx-dlf-map

 - :Property:
       progressElementId
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx-dlf-page-progress

 - :Property:
       crop
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       useInternalProxy
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       magnifier
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       basketButton
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       targetBasket
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

Search
------

:typoscript:`plugin.tx_dlf_search.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default
   :Description:
       Description

 - :Property:
       fulltext
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:

 - :Property:
       fulltextPreselect
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       datesearch
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       solrcore
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:

 - :Property:
       limit
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       50000

 - :Property:
       extendedSlotCount
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       0

 - :Property:
       extendedFields
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       0

 - :Property:
       searchIn
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:

 - :Property:
       collections
   :Data Type:
       `t3tsref:data-type-list`
   :Default:

 - :Property:
       facets
   :Data Type:
       `t3tsref:data-type-list`
   :Default:

 - :Property:
       limitFacets
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:
       15

 - :Property:
       resetFacets
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:

 - :Property:
       sortingFacets
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:

 - :Property:
       suggest
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       1

 - :Property:
       showSingleResult
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

 - :Property:
       targetPidPageView
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

Statistics
----------

:typoscript:`plugin.tx_dlf_statistics.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default

 - :Property:
       collections
   :Data Type:
       `t3tsref:data-type-list`
   :Default:

 - :Property:
       description
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:


Table Of Contents
-----------------

:typoscript:`plugin.tx_dlf_tableofcontents.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default
   :Description:
       Description

 - :Property:
       excludeOther_
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       1

 - :Property:
       basketButton
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
       0

 - :Property:
       targetBasket
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

 - :Property:
       targetPid
   :Data Type:
       `t3tsref:data-type-page-id`
   :Default:

 - :Property:
       titleReplacement
   :Data Type:
       `t3tsref:data-type-list`
   :Default:
   :Description:
       List containing types for which title should be replaced
       when the label is empty. The defined fields are used for
       replacement. Example data:
            0 {
                type = issue
                fields = type,year
            }
            1 {
                type = volume
                fields = type,volume
            }

Toolbox
-------


:typoscript:`plugin.tx_dlf_toolbox.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default
   :Values:
       Values

 - :Property:
       tools
   :Data Type:
       `t3tsref:data-type-list`
   :Default:
   :Values:
       * tx_dlf_annotationtool
       * tx_dlf_fulltexttool
       * tx_dlf_imagedownloadtool
       * tx_dlf_imagemanipulationtool
       * tx_dlf_pdfdownloadtool
       * tx_dlf_fulltextdownloadtool
       * tx_dlf_searchindocumenttool

 - :Property:
       solrcore
   :Data Type:
       :ref:`t3tsref:data-type-integer`
   :Default:

 - :Property:
       fileGrpsImageDownload
   :Data Type:
       `t3tsref:data-type-list`
   :Default:
       MIN,DEFAULT,MAX

Fulltext Tool
^^^^^^^^^^^^^
This plugin adds an activation link for fulltext to the toolbox. If no fulltext is available for the current page, a span-tag is rendered instead.

The default behavior is to show the fulltext after click on the toggle link. There is a TypoScript configuration to show the fulltext initially.

:typoscript:`plugin.tx_dlf_fulltexttool.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default
   :Values:
       Values

 - :Property:
       activateFullTextInitially
   :Data Type:
       :ref:`t3tsref:data-type-boolean`
   :Default:
        0
   :Values:
        0: show fulltext after click on toggle link

        1: show fulltext on document load

 - :Property:
       fullTextScrollElement
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
        html, body


The fulltext is fetched and rendered by JavaScript into the `<div id="tx-dlf-fulltextselection">` of the pageview plugin.

**Please note**: To allow JavaScript fetching the fulltext, the `CORS headers <https://en.wikipedia.org/wiki/Cross-origin_resource_sharing>`_ must be configured appropriate on the providing webserver.

Model download tool
^^^^^^^^^^^^^

This tool makes it possible to extract the model URL from the METS file or use the provided model parameter to provide a download URL.

:typoscript:`plugin.tx_dlf_modeldownloadtool.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Values:
       Values

 - :Property:
       fileGrpsModelDownload
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Values:
        DEFAULT - single filegroup

        MIN,DEFAULT,MAX - comma separated list of filegroups


Viewer selection tool
^^^^^^^^^^^^^

This tool can display a selection list of configured 3D viewers (from the "dlf_3d_viewers" directory see :ref:`Embedded 3D Viewer Setup`) that support the current model.

The model URL is extracted from the METS file or taken from the provided model parameter. The extension of the model is extracted from this URL and compared with the supported model formats specified in the respective viewer configuration.

:typoscript:`plugin.tx_dlf_viewerselectiontool.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Values:
       Values

 - :Property:
       fileGrpsModelDownload
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Values:
        DEFAULT - single filegroup

        MIN,DEFAULT,MAX - comma separated list of filegroups

Search in Document Tool
^^^^^^^^^^^^^^^^^^^^^^^
This plugin adds an possibility to search all appearances of the phrase in currently displayed document

:typoscript:`plugin.tx_dlf_searchindocumenttool.`

.. t3-field-list-table::
 :header-rows: 1

 - :Property:
       Property
   :Data Type:
       Data type
   :Default:
       Default
   :Values:
       Values

 - :Property:
       searchUrl
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:

 - :Property:
       documentIdUrlSchema
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
        empty
   :Values:
        https://host.de/items/*id*/record - example value

 - :Property:
       idInputName
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx_dlf[id]

 - :Property:
       queryInputName
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx_dlf[query]

 - :Property:
       startInputName
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx_dlf[start]

 - :Property:
       pageInputName
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx_dlf[page]

 - :Property:
       highlightWordInputName
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx_dlf[highlight_word]

 - :Property:
       encryptedInputName
   :Data Type:
       :ref:`t3tsref:data-type-string`
   :Default:
       tx_dlf[encrypted]
