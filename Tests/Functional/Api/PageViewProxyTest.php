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

use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;
use TYPO3\CMS\Core\Utility\GeneralUtility;

class PageViewProxyTest extends FunctionalTestCase
{
    protected $disableJsonWrappedResponse = true;

    protected function getDlfConfiguration()
    {
        return array_merge(parent::getDlfConfiguration(), [
            'general' => [
                'enableInternalProxy' => true
            ]
        ]);
    }

    protected function queryProxy(array $query, string $method = 'GET')
    {
        $query['middleware'] = 'dlf/page-view-proxy';

        return $this->httpClient->request($method, '', [
            'query' => $query,
        ]);
    }

    /**
     * @test
     */
    public function cannotAccessFileUrl(): void
    {
        $response = $this->queryProxy([
            'url' => 'file:///etc/passwd',
        ]);

        self::assertEquals(400, $response->getStatusCode());
    }

    /**
     * @test
     */
    public function cannotAccessUrlWithoutUrlHash(): void
    {
        $response = $this->queryProxy([
            'url' => 'http://web:8001/Tests/Fixtures/PageViewProxy/test.txt',
        ]);

        self::assertEquals(401, $response->getStatusCode());
    }

    /**
     * @test
     */
    public function cannotAccessUrlWithInvalidUrlHash(): void
    {
        $response = $this->queryProxy([
            'url' => 'http://web:8001/Tests/Fixtures/PageViewProxy/test.txt',
            'uHash' => 'nottherealhash',
        ]);

        self::assertEquals(401, $response->getStatusCode());
    }

    /**
     * @test
     */
    public function canAccessPageWithUrlHash(): void
    {
        $targetUrl = 'http://web:8001/Tests/Fixtures/PageViewProxy/test.txt';
        $uHash = GeneralUtility::hmac($targetUrl, 'PageViewProxy');

        $response = $this->queryProxy([
            'url' => $targetUrl,
            'uHash' => $uHash,
        ]);

        self::assertEquals(200, $response->getStatusCode());
        self::assertEquals('This is some plain text test file.' . "\n", (string) $response->getBody());
    }

    /**
     * @test
     */
    public function cannotSendPostRequest(): void
    {
        $targetUrl = 'http://web:8001/Tests/Fixtures/PageViewProxy/test.txt';
        $uHash = GeneralUtility::hmac($targetUrl, 'PageViewProxy');

        $response = $this->queryProxy([
            'url' => $targetUrl,
            'uHash' => $uHash,
        ], 'POST');

        self::assertEquals(405, $response->getStatusCode());
    }

    /**
     * @test
     */
    public function sendsUserAgentToTarget(): void
    {
        $targetUrl = 'http://web:8001/Tests/Fixtures/PageViewProxy/echo_user_agent.php';
        $uHash = GeneralUtility::hmac($targetUrl, 'PageViewProxy');

        $response = $this->queryProxy([
            'url' => $targetUrl,
            'uHash' => $uHash,
        ]);

        self::assertEquals(200, $response->getStatusCode());
        self::assertEquals('Kitodo.Presentation Proxy', (string) $response->getBody());
    }

    /**
     * @test
     */
    public function canQueryOptions(): void
    {
        $response = $this->queryProxy([], 'OPTIONS');

        self::assertGreaterThanOrEqual(200, $response->getStatusCode());
        self::assertLessThan(300, $response->getStatusCode());

        self::assertNotEmpty($response->getHeader('Access-Control-Allow-Methods'));
    }
}
