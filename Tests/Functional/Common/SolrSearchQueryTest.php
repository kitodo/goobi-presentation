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
use Kitodo\Dlf\Common\Solr\SolrSearch;
use Kitodo\Dlf\Domain\Repository\DocumentRepository;
use Kitodo\Dlf\Domain\Repository\SolrCoreRepository;
use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;

class SolrSearchQueryTest extends FunctionalTestCase
{
    private $solrCoreRepository;

    private static array $databaseFixtures = [
        __DIR__ . '/../../Fixtures/Common/documents_1.csv',
        __DIR__ . '/../../Fixtures/Common/pages.csv',
        __DIR__ . '/../../Fixtures/Common/solrcores.csv'
    ];

    private static array $solrFixtures = [
        __DIR__ . '/../../Fixtures/Common/documents_1.solr.json'
    ];

    public function setUp(): void
    {
        parent::setUp();
        $this->setUpData(self::$databaseFixtures);
        $this->setUpSolr(4, 0, self::$solrFixtures);
    }

    /**
     * @test
     * @ignore
     */
    public function canExecute()
    {
        $documentRepository = $this->initializeRepository(DocumentRepository::class, 0);
        $settings = ['solrcore' => 4, 'storagePid' => 0];

        $params = ['query' => '10 Keyboard pieces'];
        $search = new SolrSearch($documentRepository, [], $settings, $params);
        $search->prepare();
        $solrSearchQuery = $search->getQuery();
        $result = $solrSearchQuery->execute();
        // FIXME: test would fail because it is not possible to set $this->settings['storagePid'] for the
        //  documentRepository used in DocumentRepository.php:502

        $this->assertCount(0, $result);
        $this->assertEquals(0, $solrSearchQuery->getLimit());
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
        $this->solrCoreRepository = $this->initializeRepository(SolrCoreRepository::class, $storagePid);

        $coreName = Solr::createCore('solrSearchQueryTest');
        $solr = Solr::getInstance($coreName);
        foreach ($solrFixtures as $filePath) {
            $this->importSolrDocuments($solr, $filePath);
        }

        $coreModel = $this->solrCoreRepository->findByUid($uid);
        $coreModel->setIndexName($solr->core);
        $this->solrCoreRepository->update($coreModel);
        $this->persistenceManager->persistAll();
        return $solr;
    }
}
