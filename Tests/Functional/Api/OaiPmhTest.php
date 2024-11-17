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

namespace Kitodo\Dlf\Tests\Functional\Api;

use DateTime;
use GuzzleHttp\Client as HttpClient;
use Kitodo\Dlf\Common\Solr\Solr;
use Kitodo\Dlf\Domain\Repository\SolrCoreRepository;
use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;
use Phpoaipmh\Endpoint;
use Phpoaipmh\Exception\OaipmhException;
use SimpleXMLElement;

class OaiPmhTest extends FunctionalTestCase
{
    protected $disableJsonWrappedResponse = true;

    protected array $coreExtensionsToLoad = [
        'fluid',
        'fluid_styled_content',
    ];

    /** @var int */
    protected $oaiPage = 20001;

    /** @var string */
    protected $oaiUrl;

    /** @var int */
    protected $oaiPageNoStoragePid = 20002;

    /** @var string */
    protected $oaiUrlNoStoragePid;

    /**
     * @var SolrCoreRepository
     */
    protected $solrCoreRepository;

    public function setUp(): void
    {
        parent::setUp();

        $this->oaiUrl = $this->baseUrl . 'index.php?id=' . $this->oaiPage;
        $this->oaiUrlNoStoragePid = $this->baseUrl . 'index.php?id=' . $this->oaiPageNoStoragePid;

        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/documents_1.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/metadata.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/libraries.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/pages.csv');
        $this->importDataSet(__DIR__ . '/../../Fixtures/OaiPmh/pages.xml');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/OaiPmh/solrcores.csv');

        $this->solrCoreRepository = $this->initializeRepository(SolrCoreRepository::class, 20000);

        $this->setUpOaiSolr();
    }

    protected function setUpOaiSolr()
    {
        // Setup Solr only once for all tests in this suite
        static $solr = null;

        if ($solr === null) {
            $coreName = Solr::createCore('OaiCore');
            $solr = Solr::getInstance($coreName);

            $this->importSolrDocuments($solr, __DIR__ . '/../../Fixtures/Common/documents_1.solr.json');
        }

        $oaiCoreModel = $this->solrCoreRepository->findByUid(11001);
        $oaiCoreModel->setIndexName($solr->core);
        $this->solrCoreRepository->update($oaiCoreModel);
        $this->persistenceManager->persistAll();
    }

    /**
     * @test
     */
    public function correctlyRespondsOnBadVerb()
    {
        $client = new HttpClient();
        $response = $client->get($this->baseUrl, [
            'query' => [
                'id' => $this->oaiPage,
                'verb' => 'nastyVerb',
            ],
        ]);
        $xml = new SimpleXMLElement((string) $response->getBody());

        self::assertEquals('badVerb', (string) $xml->error['code']);

        // The base URL may be different from the one used that we actually used,
        // but it shouldn't contain the verb argument
        self::assertStringNotContainsString('nastyVerb', (string) $xml->request);

        // For bad verbs, the <request> element must not contain any attributes
        // - http://www.openarchives.org/OAI/openarchivesprotocol.html#XMLResponse
        // - http://www.openarchives.org/OAI/openarchivesprotocol.html#ErrorConditions
        self::assertEmpty($xml->request->attributes());
    }

    /**
     * @test
     */
    public function canIdentify()
    {
        $oai = Endpoint::build($this->oaiUrl);
        $identity = $oai->identify();

        self::assertEquals('Identify', (string) $identity->request['verb']);
        self::assertEquals('Default Library - OAI Repository', (string) $identity->Identify->repositoryName);
        self::assertUtcDateString((string) $identity->Identify->earliestDatestamp);
        self::assertEquals('default-library@example.com', (string) $identity->Identify->adminEmail);
    }

    /**
     * @test
     */
    public function identifyGivesFallbackDatestampWhenNoDocuments()
    {
        $oai = Endpoint::build($this->oaiUrlNoStoragePid);
        $identity = $oai->identify();

        self::assertUtcDateString((string) $identity->Identify->earliestDatestamp);
    }

    /**
     * @test
     */
    public function canListMetadataFormats()
    {
        $oai = Endpoint::build($this->oaiUrl);
        $formats = $oai->listMetadataFormats();

        $formatMap = [];
        foreach ($formats as $format) {
            $formatMap[(string) $format->metadataPrefix] = $format;
        }

        self::assertEquals('http://www.loc.gov/METS/', (string) $formatMap['mets']->metadataNamespace);
    }

    /**
     * @test
     */
    public function canListRecords()
    {
        $oai = Endpoint::build($this->oaiUrl);
        $result = $oai->listRecords('mets');

        $record = $result->current();
        $metsRoot = $record->metadata->children('http://www.loc.gov/METS/')[0];
        self::assertNotNull($metsRoot);
        self::assertEquals('mets', $metsRoot->getName());
    }

    /**
     * @test
     */
    public function noRecordsUntil1900()
    {
        $this->expectException(OaipmhException::class);
        $this->expectExceptionMessage('empty list');

        $oai = Endpoint::build($this->oaiUrl);
        $result = $oai->listRecords('mets', null, (new DateTime())->setDate(1900, 1, 1));

        $result->current();
    }

    /**
     * @test
     */
    public function canUseResumptionToken()
    {
        // NOTE: cursor and expirationDate are optional by the specification,
        //       but we include them in our implementation

        $client = new HttpClient();

        // The general handling of resumption tokens should be the same for these verbs
        foreach (['ListIdentifiers', 'ListRecords'] as $verb) {
            // Check that we get a proper resumption token when starting a list
            $response = $client->get($this->baseUrl, [
                'query' => [
                    'id' => $this->oaiPage,
                    'verb' => $verb,
                    'metadataPrefix' => 'mets',
                ],
            ]);
            $xml = new SimpleXMLElement((string) $response->getBody());

            $resumptionToken = $xml->$verb->resumptionToken;
            self::assertEquals('0', (string) $resumptionToken['cursor']);
            self::assertInFuture((string) $resumptionToken['expirationDate']);
            self::assertNotEmpty((string) $resumptionToken);

            // Store list size to check that it remains constant (and check its sanity)
            $completeListSize = (int) $resumptionToken['completeListSize'];
            self::assertGreaterThan(2, $completeListSize); // we have more than two documents in document set

            // Check that we can resume and get a proper cursor value
            $cursor = 1;
            do {
                $response = $client->get($this->baseUrl, [
                    'query' => [
                        'id' => $this->oaiPage,
                        'verb' => $verb,
                        'resumptionToken' => (string) $resumptionToken,
                    ],
                ]);
                $xml = new SimpleXMLElement((string) $response->getBody());

                $resumptionToken = $xml->$verb->resumptionToken;
                $tokenStr = (string) $resumptionToken;

                self::assertEquals($cursor, (string) $resumptionToken['cursor']); // settings.limit = 1
                self::assertEquals($completeListSize, (string) $resumptionToken['completeListSize']);

                // The last resumptionToken is empty and doesn't have expirationDate
                $isLastBatch = $cursor + 1 >= $completeListSize;
                self::assertEquals($isLastBatch, empty((string) $resumptionToken['expirationDate']));
                self::assertEquals($isLastBatch, empty($tokenStr));

                $cursor++;
            } while ($tokenStr);
        }
    }

    /**
     * @test
     */
    public function noResumptionTokenForCompleteList()
    {
        $client = new HttpClient();

        foreach (['ListIdentifiers', 'ListRecords'] as $verb) {
            $response = $client->get($this->baseUrl, [
                'query' => [
                    'id' => $this->oaiPage,
                    'verb' => $verb,
                    'metadataPrefix' => 'mets',
                    'set' => 'collection-with-single-document',
                ],
            ]);
            $xml = new SimpleXMLElement((string) $response->getBody());

            self::assertEquals(1, count($xml->$verb->children()));
            self::assertEmpty($xml->$verb->resumptionToken);
        }
    }

    /**
     * @test
     */
    public function canListAndResumeIdentifiers()
    {
        $oai = Endpoint::build($this->oaiUrl);
        $result = $oai->listIdentifiers('mets');

        $record = $result->current();
        self::assertEquals('oai:de:slub-dresden:db:id-476251419', $record->identifier);
        self::assertEquals(['collection-with-single-document', 'music'], (array) $record->setSpec);

        // This should use a resumption token because settings.limit is 1
        $record = $result->next();
        self::assertEquals('oai:de:slub-dresden:db:id-476248086', $record->identifier);
    }

    protected function parseUtc(string $dateTime)
    {
        return DateTime::createFromFormat('Y-m-d\TH:i:s\Z', $dateTime);
    }

    protected function assertUtcDateString(string $dateTime)
    {
        self::assertInstanceOf(DateTime::class, $this->parseUtc($dateTime));
    }

    protected function assertInFuture(string $dateTime)
    {
        self::assertGreaterThan(new DateTime(), $this->parseUtc($dateTime));
    }
}
