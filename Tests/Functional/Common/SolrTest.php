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

use Kitodo\Dlf\Common\Solr\Solr;
use Kitodo\Dlf\Domain\Repository\DocumentRepository;
use Kitodo\Dlf\Domain\Repository\SolrCoreRepository;
use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;

class SolrTest extends FunctionalTestCase
{

    private static array $databaseFixtures = [
        __DIR__ . '/../../Fixtures/Common/documents_1.csv',
        __DIR__ . '/../../Fixtures/Common/pages.csv',
        __DIR__ . '/../../Fixtures/Common/solrcores.csv'
    ];

    private static array $solrFixtures = [
        __DIR__ . '/../../Fixtures/Common/documents_1.solr.json'
    ];

    /**
     * @test
     */
    public function canCreateCore()
    {
        $this->assertEquals('newCoreName', Solr::createCore('newCoreName'));
        $this->assertEquals('newCoreName', Solr::getInstance('newCoreName')->core);
    }

    /**
     * @test
     */
    public function canEscapeQuery()
    {
        $query1 = Solr::escapeQuery('"custom query with special characters: "testvalue"\n"');
        $this->assertEquals('"custom query with special characters\: "testvalue"\\\\n"', $query1);

        $query2 = Solr::escapeQuery('+ - && || ! ( ) { } [ ] ^ " ~ * ? : \ /');
        $this->assertEquals('+ - && || ! ( ) \{ \} \[ \] ^ " ~ * ? \: \\\ \/', $query2);
    }

    /**
     * @test
     */
    public function canEscapeQueryKeepField()
    {
        $query1 = Solr::escapeQueryKeepField('abc_uui:(abc)', 0);
        $this->assertEquals('abc_uui\:(abc)', $query1);
    }

    /**
     * @test
     */
    public function canGetNextCoreNumber()
    {
        $this->assertEquals(2, Solr::getNextCoreNumber());
        $this->assertEquals(2, Solr::getNextCoreNumber());
        Solr::createCore();
        $this->assertEquals(3, Solr::getNextCoreNumber());
    }

    /**
     * @test
     */
    public function canSearchRaw()
    {
        $this->setUpData(self::$databaseFixtures);
        $solr = $this->setUpSolr(4, 0, self::$solrFixtures);
        $resultSet = $solr->searchRaw(['core' => 4, 'collection' => 1]);

        $this->assertCount(33, $resultSet);
        $this->assertEquals('Solarium\QueryType\Select\Result\Document', get_class($resultSet[0]));
    }

    protected function setUpData($databaseFixtures): void
    {
        foreach ($databaseFixtures as $filePath) {
            $this->importCSVDataSet($filePath);
        }
        $this->initializeRepository(DocumentRepository::class, 0);
    }

    protected function setUpSolr($uid, $storagePid, $solrFixtures)
    {
        $solrCoreRepository = $this->initializeRepository(SolrCoreRepository::class, $storagePid);

        $coreName = Solr::createCore('SolrTestCore');
        $solr = Solr::getInstance($coreName);
        foreach ($solrFixtures as $filePath) {
            $this->importSolrDocuments($solr, $filePath);
        }

        $coreModel = $solrCoreRepository->findByUid($uid);
        $coreModel->setIndexName($solr->core);
        $solrCoreRepository->update($coreModel);
        $this->persistenceManager->persistAll();
        return $solr;
    }
}
