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

use Kitodo\Dlf\Common\Solr\Solr;
use Kitodo\Dlf\Domain\Repository\DocumentRepository;
use Kitodo\Dlf\Domain\Repository\SolrCoreRepository;
use Kitodo\Dlf\Hooks\DataHandler;
use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Extbase\Persistence\Generic\PersistenceManager;

class DataHandlerTest extends FunctionalTestCase
{
    public function setUp(): void
    {
        parent::setUp();

        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Hooks/documents.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Hooks/metadata.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Hooks/solrcores.csv');
        $this->persistenceManager = $this->objectManager->get(PersistenceManager::class);
        $this->documentRepository = $this->initializeRepository(DocumentRepository::class, 0);

        $this->setUpSolr(1, 20000, __DIR__ . '/../../Fixtures/Hooks/documents.solr.json');
    }

    /**
     * @test
     */
    public function canProcessDatamap_postProcessFieldArray()
    {
        $id = 0;
        $dataHandler = new DataHandler();

        // status 'new'
        $fieldArray = ['title' => 'Example'];
        $expected = ['title' => 'Example', 'title_sorting' => 'Example'];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_documents', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['is_listed' => 1];
        $expected = ['is_listed' => 1, 'index_stored' => 1];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_metadata', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_autocomplete' => 1];
        $expected = ['index_autocomplete' => 1, 'index_indexed' => 1];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_metadata', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = [];
        $expected = [];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_metadata', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['label' => 'Example label'];
        $expected = ['label' => 'Example label', 'index_name' => 'Example label'];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_collections', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_name' => 'Example label'];
        $expected = ['index_name' => 'Example label', 'label' => 'Example label'];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_libraries', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_name' => 'Example_sorting'];
        $expected = ['index_name' => 'Example_sorting0', 'label' => 'Example_sorting'];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_structures', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_name' => 'new_core_name'];
        $expected = ['index_name' => 'new_core_name'];
        $dataHandler->processDatamap_postProcessFieldArray('new', 'tx_dlf_solrcores', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        // status 'update'
        $fieldArray = ['is_listed' => 1];
        $expected = ['is_listed' => 1, 'index_stored' => 1];
        $dataHandler->processDatamap_postProcessFieldArray('update', 'tx_dlf_metadata', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_stored' => 0];
        $expected = ['index_stored' => 1];
        $dataHandler->processDatamap_postProcessFieldArray('update', 'tx_dlf_metadata', 5001, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_autocomplete' => 1];
        $expected = ['index_autocomplete' => 1, 'index_indexed' => 1];
        $dataHandler->processDatamap_postProcessFieldArray('update', 'tx_dlf_metadata', $id, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_indexed' => 0];
        $expected = ['index_indexed' => 1];
        $dataHandler->processDatamap_postProcessFieldArray('update', 'tx_dlf_metadata', 5001, $fieldArray);
        $this->assertEquals($expected, $fieldArray);

        $fieldArray = ['index_indexed' => 0];
        $expected = ['index_indexed' => 0];
        $dataHandler->processDatamap_postProcessFieldArray('update', 'tx_dlf_metadata', 5002, $fieldArray);
        $this->assertEquals($expected, $fieldArray);
    }

    /**
     * @test
     */
    public function canProcessDatamap_afterDatabaseOperations()
    {
        $GLOBALS['LANG'] = LanguageService::create('default');
        $solrSettings = [
            'solrcore' => 1,
            'storagePid' => 20000,
        ];
        $id = 1001;
        $dataHandler = new DataHandler();

        // check doc title in index
        $solrSearch = $this->documentRepository->findSolrByCollection(null, $solrSettings, ['query' => '*']);
        $solrSearch->getQuery()->execute();
        $elementFound = false;
        foreach ($solrSearch->getSolrResults()['documents'] as $solrDoc) {
            if ($solrDoc['toplevel'] && $solrDoc['uid'] === $id) {
                $this->assertEquals('Old title', $solrDoc['title']);
                $elementFound = true;
                break;
            }
        }
        $this->assertTrue($elementFound);

        // doc title in index should not change
        $fieldArray = [];
        $dataHandler->processDatamap_afterDatabaseOperations('update', 'tx_dlf_documents', $id, $fieldArray);
        $solrSearch = $this->documentRepository->findSolrByCollection(null, $solrSettings, ['query' => '*']);
        $solrSearch->getQuery()->execute();
        $elementFound = false;
        foreach ($solrSearch->getSolrResults()['documents'] as $solrDoc) {
            if ($solrDoc['toplevel'] && $solrDoc['uid'] === $id) {
                $this->assertEquals('Old title', $solrDoc['title']);
                $elementFound = true;
                break;
            }
        }
        $this->assertTrue($elementFound);

        // doc title in index should be updated
        $fieldArray = ['hidden' => 1];
        $dataHandler->processDatamap_afterDatabaseOperations('update', 'tx_dlf_documents', $id, $fieldArray);
        $solrSearch = $this->documentRepository->findSolrByCollection(null, $solrSettings, ['query' => '10 Keyboard pieces']);
        $solrSearch->getQuery()->execute();
        $elementFound = false;
        foreach ($solrSearch->getSolrResults()['documents'] as $solrDoc) {
            if ($solrDoc['toplevel'] && $solrDoc['uid'] === $id) {
                $this->assertEquals('10 Keyboard pieces - Go. S. 658', $solrDoc['title']);
                $elementFound = true;
                break;
            }
        }
        $this->assertTrue($elementFound);
    }

    /**
     * @test
     */
    public function canProcessCmdmap_postProcess()
    {
        $GLOBALS['LANG'] = LanguageService::create('default');
        $solrSettings = [
            'solrcore' => 1,
            'storagePid' => 20000,
        ];
        $dataHandler = new DataHandler();

        $dataHandler->processCmdmap_postProcess('delete', 'tx_dlf_documents', 1002);
        $solrSearch = $this->documentRepository->findSolrByCollection(null, $solrSettings, ['query' => '6 Sacred songs - Go. S. 591']);
        $solrSearch->getQuery()->execute();
        $this->assertEquals(0, $solrSearch->getNumFound(), 'Document should have been removed from index');

        $dataHandler->processCmdmap_postProcess('undelete', 'tx_dlf_documents', 1002);
        $solrSearch = $this->documentRepository->findSolrByCollection(null, $solrSettings, ['query' => '6 Sacred songs - Go. S.']);
        $solrSearch->getQuery()->execute();
        $this->assertEquals(1, $solrSearch->getNumFound(), 'Document should have been reindexed');
    }

    protected function setUpSolr($uid, $storagePid, $solrFixture)
    {
        $this->solrCoreRepository = $this->initializeRepository(SolrCoreRepository::class, $storagePid);

        // Setup Solr only once for all tests in this suite
        static $solr = null;

        if ($solr === null) {
            $coreName = Solr::createCore();
            $solr = Solr::getInstance($coreName);
            $this->importSolrDocuments($solr, $solrFixture);
        }

        $coreModel = $this->solrCoreRepository->findByUid($uid);
        $coreModel->setIndexName($solr->core);
        $this->solrCoreRepository->update($coreModel);
        $this->persistenceManager->persistAll();
    }
}
