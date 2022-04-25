<?php

/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

if (!defined('TYPO3')) {
    die('Access denied.');
}

$excludeList = 'layout,select_key,pages,recursive';
$addList = 'pi_flexform';

$flexFormsPathPrefix = 'FILE:EXT:dlf/Configuration/FlexForms/';
$iconsDirectory = 'EXT:dlf/Resources/Public/Icons/';
$pluginsLabel = 'EXT:dlf/Resources/Private/Language/locallang_be.xlf:plugins.';

// Plugin "annotation".
\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Annotation',
    $pluginsLabel . 'annotation.title',
);

// Plugin "audioplayer".
$plugin = 'dlf_audioplayer';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'AudioPlayer.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'AudioPlayer',
    $pluginsLabel . 'audioplayer.title',
    $iconsDirectory . 'tx-dlf-audioplayer.svg'
);

// Plugin "basket".
$plugin = 'dlf_basket';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Basket.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Basket',
    $pluginsLabel . 'basket.title',
    $iconsDirectory . 'tx-dlf-basket.svg'
);

// Plugin "calendar".
$plugin = 'dlf_calendar';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Calendar.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Calendar',
    $pluginsLabel . 'calendar.title',
    $iconsDirectory . 'tx-dlf-calendar.svg'
);

// Plugin "collection".
$plugin = 'dlf_collection';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Collection.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Collection',
    $pluginsLabel . 'collection.title',
    $iconsDirectory . 'tx-dlf-collection.svg'
);

// Plugin "embedded3dviewer".
$plugin = 'dlf_embedded3dviewer';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    'dlf_embedded3dviewer',
    $flexFormsPathPrefix . 'Embedded3dViewer.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Embedded3dViewer',
    $pluginsLabel . 'embedded3dviewer.title',
    $iconsDirectory . 'tx-dlf-embedded3dviewer.svg'
);

// Plugin "feeds".
$plugin = 'dlf_feeds';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Feeds.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Feeds',
    $pluginsLabel . 'feeds.title',
    $iconsDirectory . 'tx-dlf-feeds.svg'
);

// Plugin "listview".
$plugin = 'dlf_listview';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'ListView.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'ListView',
    $pluginsLabel . 'listview.title',
    $iconsDirectory . 'tx-dlf-listview.svg'
);

// Plugin "mediaplayer".
$plugin = 'dlf_mediaplayer';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'MediaPlayer.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'MediaPlayer',
    $pluginsLabel . 'mediaplayer.title',
    $iconsDirectory . 'tx-dlf-mediaplayer.svg'
);

// Plugin "metadata".
$plugin = 'dlf_metadata';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Metadata.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Metadata',
    $pluginsLabel . 'metadata.title',
    $iconsDirectory . 'tx-dlf-metadata.svg'
);

// Plugin "navigation".
$plugin = 'dlf_navigation';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Navigation.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Navigation',
    $pluginsLabel . 'navigation.title',
    $iconsDirectory . 'tx-dlf-navigation.svg'
);

// Plugin "oaipmh".
$plugin = 'dlf_oaipmh';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'OaiPmh.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'OaiPmh',
    $pluginsLabel . 'oaipmh.title',
    $iconsDirectory . 'tx-dlf-oaipmh.svg'
);

// Plugin "pagegrid".
$plugin = 'dlf_pagegrid';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;
\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'PageGrid.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'PageGrid',
    $pluginsLabel . 'pagegrid.title',
    $iconsDirectory . 'tx-dlf-pagegrid.svg'
);

// Plugin "pageview".
$plugin = 'dlf_pageview';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;
\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'PageView.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'PageView',
    $pluginsLabel . 'plugins.pageview.title',
    $iconsDirectory . 'tx-dlf-pageview.svg'
);

// Plugin "search".
$plugin = 'dlf_search';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Search.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Search',
    $pluginsLabel . 'search.title',
    $iconsDirectory . 'tx-dlf-search.svg'
);

// Plugin "statistics".
$plugin = 'dlf_statistics';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Statistics.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Statistics',
    $pluginsLabel . 'statistics.title',
    $iconsDirectory . 'tx-dlf-statistics.svg'
);

// Plugin "tableofcontents".
$plugin = 'dlf_tableofcontents';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;

\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'TableOfContents.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'TableOfContents',
    $pluginsLabel . 'tableofcontents.title',
    $iconsDirectory . 'tx-dlf-tableofcontents.svg'
);

// Plugin "toolbox".
$plugin = 'dlf_toolbox';

$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$plugin] = $excludeList;
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$plugin] = $addList;
\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
    $plugin,
    $flexFormsPathPrefix . 'Toolbox.xml'
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
    'Dlf',
    'Toolbox',
    $pluginsLabel . 'toolbox.title',
    $iconsDirectory . 'tx-dlf-toolbox.svg'
);
