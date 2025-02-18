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

namespace Kitodo\Dlf\Tests\Functional\Common;

use Kitodo\Dlf\Common\AbstractDocument;
use Kitodo\Dlf\Common\Indexer;
use Kitodo\Dlf\Common\Solr\Solr;
use Kitodo\Dlf\Domain\Model\SolrCore;
use Kitodo\Dlf\Domain\Repository\CollectionRepository;
use Kitodo\Dlf\Domain\Repository\DocumentRepository;
use Kitodo\Dlf\Domain\Repository\SolrCoreRepository;
use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;
use TYPO3\CMS\Core\Core\Bootstrap;
use TYPO3\CMS\Core\Utility\GeneralUtility;

class SolrIndexingTest extends FunctionalTestCase
{
    /** @var CollectionRepository */
    protected $collectionRepository;

    /** @var DocumentRepository */
    protected $documentRepository;

    /** @var SolrCoreRepository */
    protected $solrCoreRepository;

    public function setUp(): void
    {
        parent::setUp();

        // Needed for Indexer::add, which uses the language service
        Bootstrap::initializeLanguageObject();

        $this->collectionRepository = $this->initializeRepository(CollectionRepository::class, 20000);
        $this->documentRepository = $this->initializeRepository(DocumentRepository::class, 20000);
        $this->solrCoreRepository = $this->initializeRepository(SolrCoreRepository::class, 20000);

        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/documents_1.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/libraries.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/metadata.csv');
    }

    /**
     * @test
     */
    public function canCreateCore()
    {
        $coreName = uniqid('testCore');
        $solr = Solr::getInstance($coreName);
        self::assertNull($solr->core);

        $actualCoreName = Solr::createCore($coreName);
        self::assertEquals($actualCoreName, $coreName);

        $solr = Solr::getInstance($coreName);
        self::assertNotNull($solr->core);
    }

    /**
     * @test
     */
    public function canIndexAndSearchDocument()
    {
        $core = $this->createSolrCore();

        $document = $this->documentRepository->findByUid(1001);
        $document->setSolrcore($core->model->getUid());
        $this->persistenceManager->persistAll();

        $doc = AbstractDocument::getInstance($document->getLocation(), 0, ['useExternalApisForMetadata' => 0]);
        $document->setCurrentDocument($doc);

        $indexingSuccessful = Indexer::add($document, $this->documentRepository);
        self::assertTrue($indexingSuccessful);

        $solrSettings = [
            'solrcore' => $core->solr->core,
            'storagePid' => $document->getPid(),
        ];

        $solrSearch = $this->documentRepository->findSolrWithoutCollection($solrSettings, ['query' => '*']);
        $solrSearch->getQuery()->execute();
        self::assertEquals(1, count($solrSearch));
        self::assertEquals(15, $solrSearch->getNumFound());

        // Check that the title stored in Solr matches the title of database entry
        $docTitleInSolr = false;
        foreach ($solrSearch->getSolrResults()['documents'] as $solrDoc) {
            if ($solrDoc['toplevel'] && intval($solrDoc['uid']) === intval($document->getUid())) {
                self::assertEquals($document->getTitle(), $solrDoc['title']);
                $docTitleInSolr = true;
                break;
            }
        }
        self::assertTrue($docTitleInSolr);

        // $solrSearch[0] is hydrated from the database model
        self::assertEquals($document->getTitle(), $solrSearch[0]['title']);

        // Test ArrayAccess and Iterator implementation
        self::assertTrue(isset($solrSearch[0]));
        self::assertFalse(isset($solrSearch[1]));
        self::assertNull($solrSearch[1]);
        self::assertFalse(isset($solrSearch[$document->getUid()]));

        $iter = [];
        foreach ($solrSearch as $key => $value) {
            $iter[$key] = $value;
        }
        self::assertEquals(1, count($iter));
        self::assertEquals($solrSearch[0], $iter[0]);
    }

    /**
     * @test
     */
    public function canSearchInCollections()
    {
        $core = $this->createSolrCore();

        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/documents_fulltext.csv');
        $this->importSolrDocuments($core->solr, __DIR__ . '/../../Fixtures/Common/documents_1.solr.json');
        $this->importSolrDocuments($core->solr, __DIR__ . '/../../Fixtures/Common/documents_fulltext.solr.json');

        $collections = $this->collectionRepository->findCollectionsBySettings([
            'index_name' => ['Musik', 'Projekt: Dresdner Hefte'],
        ]);
        $musik[] = $collections[0];
        $dresdnerHefte[] = $collections[1];

        $settings = [
            'solrcore' => $core->solr->core,
            'storagePid' => 20000,
        ];

        // No query: Only list toplevel result(s) in collection(s)
        $musikSearch = $this->documentRepository->findSolrByCollections($musik, $settings, []);
        $dresdnerHefteSearch = $this->documentRepository->findSolrByCollections($dresdnerHefte, $settings, []);
        $multiCollectionSearch = $this->documentRepository->findSolrByCollections($collections, $settings, []);
        self::assertGreaterThanOrEqual(1, $musikSearch->getNumFound());
        self::assertGreaterThanOrEqual(1, $dresdnerHefteSearch->getNumFound());
        self::assertEquals('533223312LOG_0000', $dresdnerHefteSearch->getSolrResults()['documents'][0]['id']);
        self::assertEquals(
            // Assuming there's no overlap
            $dresdnerHefteSearch->getNumFound() + $musikSearch->getNumFound(),
            $multiCollectionSearch->getNumFound()
        );

        // With query: List all results
        $metadataSearch = $this->documentRepository->findSolrByCollection($collections[1], $settings, ['query' => 'Dresden']);
        $fulltextSearch = $this->documentRepository->findSolrByCollection($collections[1], $settings, ['query' => 'Dresden', 'fulltext' => '1']);
        self::assertGreaterThan($metadataSearch->getNumFound(), $fulltextSearch->getNumFound());
    }

    /**
     * @test
     */
    public function canGetIndexFieldName()
    {
        $this->assertEquals('title_usi', Indexer::getIndexFieldName('title', 20000));
        $this->assertEquals('year_uuu', Indexer::getIndexFieldName('year', 20000));
        $this->assertEquals('', Indexer::getIndexFieldName('title'));
    }

    protected function createSolrCore(): object
    {
        $coreName = Solr::createCore();
        $solr = Solr::getInstance($coreName);

        $model = GeneralUtility::makeInstance(SolrCore::class);
        $model->setLabel('Testing Solr Core');
        $model->setIndexName($coreName);
        $this->solrCoreRepository->add($model);
        $this->persistenceManager->persistAll();

        return (object) compact('solr', 'model');
    }
}
