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
// Define constants.
if (!defined('LOG_SEVERITY_OK')) {
    define('LOG_SEVERITY_OK', -1);
}
if (!defined('LOG_SEVERITY_INFO')) {
    define('LOG_SEVERITY_INFO', 0);
}
if (!defined('LOG_SEVERITY_NOTICE')) {
    define('LOG_SEVERITY_NOTICE', 1);
}
if (!defined('LOG_SEVERITY_WARNING')) {
    define('LOG_SEVERITY_WARNING', 2);
}
if (!defined('LOG_SEVERITY_ERROR')) {
    define('LOG_SEVERITY_ERROR', 3);
}

// Register plugin icons.
$iconArray = [
    'tx-dlf-audioplayer' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-audioplayer.svg',
    'tx-dlf-basket' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-basket.svg',
    'tx-dlf-calendar' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-calendar.svg',
    'tx-dlf-collection' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-collection.svg',
    'tx-dlf-feeds' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-feeds.svg',
    'tx-dlf-listview' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-listview.svg',
    'tx-dlf-metadata' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-metadata.svg',
    'tx-dlf-navigation' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-navigation.svg',
    'tx-dlf-oaipmh' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-oaipmh.svg',
    'tx-dlf-pagegrid' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-pagegrid.svg',
    'tx-dlf-pageview' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-pageview.svg',
    'tx-dlf-search' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-search.svg',
    'tx-dlf-statistics' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-statistics.svg',
    'tx-dlf-tableofcontents' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-tableofcontents.svg',
    'tx-dlf-toolbox' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-toolbox.svg',
    'tx-dlf-embedded3dviewer' => 'EXT:dlf/Resources/Public/Icons/tx-dlf-embedded3dviewer.svg',
];
$iconRegistry = \TYPO3\CMS\Core\Utility\GeneralUtility::makeInstance(
    \TYPO3\CMS\Core\Imaging\IconRegistry::class
);
foreach ($iconArray as $key => $value) {
    $iconRegistry->registerIcon(
        $key,
        \TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider::class,
        ['source' => $value]
    );
}
// Register plugins as content elements.
\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPageTSConfig(
    '<INCLUDE_TYPOSCRIPT: source="FILE:EXT:dlf/Configuration/TsConfig/ContentElements.tsconfig">'
);
$_EXTKEY = 'dlf';
// Register tools for toolbox plugin.
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'] = [];
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_scoretool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.scoretool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_fulltexttool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.fulltexttool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_annotationtool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.annotationtool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_fulltextdownloadtool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.fulltextdownloadtool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_imagedownloadtool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.imagedownloadtool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_imagemanipulationtool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.imagemanipulationtool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_modeldownloadtool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.modeldownloadtool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_pdfdownloadtool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.pdfdownloadtool';
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Plugin/Toolbox.php']['tools'][\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::getCN($_EXTKEY) . '_searchindocumenttool'] = 'LLL:EXT:dlf/Resources/Private/Language/locallang_labels.xlf:tx_dlf_toolbox.searchindocumenttool';
// Register hooks.
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['t3lib/class.t3lib_tcemain.php']['processDatamapClass'][] = \Kitodo\Dlf\Hooks\DataHandler::class;
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['t3lib/class.t3lib_tcemain.php']['processCmdmapClass'][] = \Kitodo\Dlf\Hooks\DataHandler::class;
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['dlf/Classes/Common/MetsDocument.php']['hookClass'][] = \Kitodo\Dlf\Hooks\KitodoProductionHacks::class;
// Register scheduler tasks
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['scheduler']['tasks'][\Kitodo\Dlf\Task\IndexTask::class] = [
    'extension' => $_EXTKEY,
    'title' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:indexTask.title',
    'description' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:indexTask.description',
    'additionalFields' => \Kitodo\Dlf\Task\IndexAdditionalFieldProvider::class,
];
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['scheduler']['tasks'][\Kitodo\Dlf\Task\ReindexTask::class] = [
    'extension' => $_EXTKEY,
    'title' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:reindexTask.title',
    'description' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:reindexTask.description',
    'additionalFields' => \Kitodo\Dlf\Task\ReindexAdditionalFieldProvider::class,
];
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['scheduler']['tasks'][\Kitodo\Dlf\Task\HarvestTask::class] = [
    'extension' => $_EXTKEY,
    'title' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:harvestTask.title',
    'description' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:harvestTask.description',
    'additionalFields' => \Kitodo\Dlf\Task\HarvestAdditionalFieldProvider::class,
];
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['scheduler']['tasks'][\Kitodo\Dlf\Task\DeleteTask::class] = [
    'extension' => $_EXTKEY,
    'title' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:deleteTask.title',
    'description' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:deleteTask.description',
    'additionalFields' => \Kitodo\Dlf\Task\DeleteAdditionalFieldProvider::class,
];
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['scheduler']['tasks'][\Kitodo\Dlf\Task\OptimizeTask::class] = [
    'extension' => $_EXTKEY,
    'title' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:optimizeTask.title',
    'description' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:optimizeTask.description',
    'additionalFields' => \Kitodo\Dlf\Task\OptimizeAdditionalFieldProvider::class,
];
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['scheduler']['tasks'][\Kitodo\Dlf\Task\SuggestBuildTask::class] = [
    'extension' => $_EXTKEY,
    'title' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:suggestBuildTask.title',
    'description' => 'LLL:EXT:dlf/Resources/Private/Language/locallang_tasks.xlf:suggestBuildTask.description',
    'additionalFields' => \Kitodo\Dlf\Task\SuggestBuildAdditionalFieldProvider::class,
];
// Register AJAX eID handlers.
if ($GLOBALS['TYPO3_CONF_VARS']['EXTENSIONS']['dlf']['general']['enableInternalProxy'] ?? false) {
    $GLOBALS['TYPO3_CONF_VARS']['FE']['eID_include']['tx_dlf_pageview_proxy'] = \Kitodo\Dlf\Eid\PageViewProxy::class . '::main';
}
// Use Caching Framework for Solr queries
$GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_solr'] ??= [];

if (!isset($GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_solr']['backend'])) {
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_solr']['backend'] = 'TYPO3\\CMS\\Core\\Cache\\Backend\\FileBackend';
}
if (!isset($GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_solr']['options']['defaultLifeTime'])) {
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_solr']['options']['defaultLifeTime'] = 86400; // 86400 seconds = 1 day
}
// Use Caching Framework for XML file caching
$GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_doc'] ??= [];

if (!isset($GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_doc']['backend'])) {
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_doc']['backend'] = 'TYPO3\\CMS\\Core\\Cache\\Backend\\FileBackend';
}
if (!isset($GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_doc']['options']['defaultLifeTime'])) {
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_doc']['options']['defaultLifeTime'] = 86400; // 86400 seconds = 1 day
}
// Use Caching Framework for PageGrid $entryArray caching
$GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_pagegrid'] ??= [];

if (!isset($GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_pagegrid']['backend'])) {
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_pagegrid']['backend'] = 'TYPO3\\CMS\\Core\\Cache\\Backend\\FileBackend';
}
if (!isset($GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_pagegrid']['options']['defaultLifeTime'])) {
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['tx_dlf_pagegrid']['options']['defaultLifeTime'] = 86400; // 86400 seconds = 1 day
}
// Add new renderType for TCA fields.
$GLOBALS['TYPO3_CONF_VARS']['SYS']['formEngine']['nodeRegistry'][] = [
    'nodeName' => 'editInProductionWarning',
    'priority' => 30,
    'class' => \Kitodo\Dlf\Hooks\Form\FieldInformation\EditInProductionWarning::class
];
$GLOBALS['TYPO3_CONF_VARS']['SYS']['formEngine']['nodeRegistry'][] = [
    'nodeName' => 'solrCoreStatus',
    'priority' => 30,
    'class' => \Kitodo\Dlf\Hooks\Form\FieldInformation\SolrCoreStatus::class
];


// Add migration wizards
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['ext/install']['update'][\Kitodo\Dlf\Updates\MigrateSettings::class]
    = \Kitodo\Dlf\Updates\MigrateSettings::class;
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['ext/install']['update'][\Kitodo\Dlf\Updates\FileLocationUpdater::class]
    = \Kitodo\Dlf\Updates\FileLocationUpdater::class;
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['ext/install']['update'][\Kitodo\Dlf\Updates\UpdateSolrSchema::class]
= \Kitodo\Dlf\Updates\UpdateSolrSchema::class;

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Search',
    [
        \Kitodo\Dlf\Controller\SearchController::class => 'main, search'
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\SearchController::class => 'main, search'
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Feeds',
    [
        \Kitodo\Dlf\Controller\FeedsController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\FeedsController::class => 'main',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Statistics',
    [
        \Kitodo\Dlf\Controller\StatisticsController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\StatisticsController::class => '',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'TableOfContents',
    [
        \Kitodo\Dlf\Controller\TableOfContentsController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\TableOfContentsController::class => '',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'PageGrid',
    [
        \Kitodo\Dlf\Controller\PageGridController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\PageGridController::class => '',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Navigation',
    [
        \Kitodo\Dlf\Controller\NavigationController::class => 'main, pageSelect',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\NavigationController::class => 'pageSelect',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'AudioPlayer',
    [
        \Kitodo\Dlf\Controller\AudioPlayerController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\AudioPlayerController::class => '',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Calendar',
    [
        \Kitodo\Dlf\Controller\CalendarController::class => 'main, years, calendar',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\CalendarController::class => '',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'PageView',
    [
        \Kitodo\Dlf\Controller\PageViewController::class => 'main, addDocument',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\PageViewController::class => 'addDocument',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Basket',
    [
        \Kitodo\Dlf\Controller\BasketController::class => 'main, add, basket',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\BasketController::class => 'main, add, basket',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Toolbox',
    [
        \Kitodo\Dlf\Controller\ToolboxController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\ToolboxController::class => '',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'OaiPmh',
    [
        \Kitodo\Dlf\Controller\OaiPmhController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\OaiPmhController::class => 'main',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'ListView',
    [
        \Kitodo\Dlf\Controller\ListViewController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\ListViewController::class => 'main',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Collection',
    [
        \Kitodo\Dlf\Controller\CollectionController::class => 'list, show, showSorted'
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\CollectionController::class => 'showSorted',
    ]
);
\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Metadata',
    [
        \Kitodo\Dlf\Controller\MetadataController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\MetadataController::class => '',
    ]
);
\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Embedded3dViewer',
    [
        \Kitodo\Dlf\Controller\Embedded3dViewerController::class => 'main',
    ],
    // non-cacheable actions
    [
        \Kitodo\Dlf\Controller\Embedded3dViewerController::class => '',
    ]
);

\TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
    'Dlf',
    'Annotation',
    [
        \Kitodo\Dlf\Controller\AnnotationController::class => 'main'
    ],
    // non-cacheable actions
    [
    ]
);

// Register a node in ext_localconf.php
$GLOBALS['TYPO3_CONF_VARS']['SYS']['formEngine']['nodeRegistry'][1638809996] = [
    'nodeName' => 'thumbnailCustomElement',
    'priority' => 40,
    'class' => \Kitodo\Dlf\Hooks\ThumbnailCustomElement::class
];
