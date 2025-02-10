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

namespace Kitodo\Dlf\Tests\Functional\Hooks;

use Kitodo\Dlf\Domain\Repository\DocumentRepository;
use Kitodo\Dlf\Hooks\ItemsProcFunc;
use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Extbase\Persistence\Generic\PersistenceManager;

class ItemsProcFuncTest extends FunctionalTestCase
{
    public function setUp(): void
    {
        parent::setUp();

        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Hooks/pages.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Hooks/metadata.csv');
        $this->persistenceManager = $this->objectManager->get(PersistenceManager::class);
        $this->documentRepository = $this->initializeRepository(DocumentRepository::class, 0);

    }

    /**
     * @test
     */
    public function canToollist()
    {
        $GLOBALS['LANG'] = LanguageService::create('default');
        $itemsProcFunc = new ItemsProcFunc();

        $params = [];
        $itemsProcFunc->toolList($params);
        $expected = [
            'items' => [
                ['Fulltext', 'tx_dlf_fulltexttool'],
                ['IIIF Annotations', 'tx_dlf_annotationtool'],
                ['Fulltext Download', 'tx_dlf_fulltextdownloadtool'],
                ['Image Download', 'tx_dlf_imagedownloadtool'],
                ['Image Manipulation', 'tx_dlf_imagemanipulationtool'],
                ['PDF Download', 'tx_dlf_pdfdownloadtool'],
                ['Search in Document', 'tx_dlf_searchindocumenttool']
            ]
        ];
        $this->assertEquals($expected, $params);
    }

    /**
     * @test
     */
    public function canExtendedSearchList()
    {
        $itemsProcFunc = new ItemsProcFunc();

        $params = [
            'flexParentDatabaseRow' => [
                'pid' => 19999
            ]
        ];
        $itemsProcFunc->extendedSearchList($params);
        $expected = [
            'items' => [
                ['Sammlungen', 'collection'],
                ['Titel', 'title']
            ],
            'flexParentDatabaseRow' => [
                'pid' => 19999
            ]
        ];
        $this->assertEquals($expected, $params);
    }

    /**
     * @test
     */
    public function canGetFacetList()
    {
        $itemsProcFunc = new ItemsProcFunc();

        $params = [
            'flexParentDatabaseRow' => [
                'pid' => 19999
            ]
        ];
        $itemsProcFunc->getFacetsList($params);
        $expected = [
            'items' => [
                ['Sammlungen', 'collection']
            ],
            'flexParentDatabaseRow' => [
                'pid' => 19999
            ]
        ];
        $this->assertEquals($expected, $params);
    }
}
