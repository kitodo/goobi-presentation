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

namespace Kitodo\Dlf\Tests\Functional\Controller;

use Kitodo\Dlf\Controller\SearchController;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Core\Session\UserSession;
use TYPO3\CMS\Core\Session\UserSessionManager;
use TYPO3\CMS\Core\Utility\StringUtility;
use TYPO3\CMS\Extbase\Mvc\Exception\StopActionException;
use TYPO3\CMS\Frontend\Authentication\FrontendUserAuthentication;

class SearchControllerTest extends AbstractControllerTest
{
    private static array $databaseFixtures = [
        __DIR__ . '/../../Fixtures/Controller/pages.csv',
        __DIR__ . '/../../Fixtures/Controller/documents.csv',
        __DIR__ . '/../../Fixtures/Controller/solrcores.csv'
    ];

    static array $solrFixtures = [
        __DIR__ . '/../../Fixtures/Controller/documents.solr.json'
    ];

    public function setUp(): void
    {
        parent::setUp();
        $this->setUpSolr(4, 0, self::$solrFixtures);
        $this->setUpData(self::$databaseFixtures);
    }

    /**
     * @test
     */
    public function canMainAction()
    {
        $_POST['tx_dlf'] = [
            'id' => 1001
        ];
        $_POST['tx_dlf_listview'] = [
            'searchParameter' => []
        ];
        $arguments = [
            'searchParameter' => [
                'dateFrom' => '1800'
            ]
        ];
        $settings = [
            'solrcore' => $this->currentCoreName,
            'extendedFields' => 'field1,field2,field3',
            'extendedSlotCount' => 1
        ];
        $templateHtml = '<html>
            lastSearch:<f:for each="{lastSearch}" as="searchEntry" key="key">{key}:{searchEntry},</f:for>
            currentDocument:{currentDocument.uid}
            searchFields:<f:for each="{searchFields}" as="field">{field},</f:for>
        </html>';

        $uniqueSessionId = StringUtility::getUniqueId('test');
        $currentTime = $GLOBALS['EXEC_TIME'];

        // Main session backend setup
        $userSession = UserSession::createNonFixated($uniqueSessionId);
        $userSessionManagerMock = $this->createMock(UserSessionManager::class);
        $userSessionManagerMock->method('createFromRequestOrAnonymous')->withAnyParameters()->willReturn($userSession);
        $userSessionManagerMock->method('createAnonymousSession')->withAnyParameters()->willReturn($userSession);

        // new session should be written
        $sessionRecord = [
            'ses_id' => 'newSessionId',
            'ses_iplock' => '',
            'ses_userid' => 0,
            'ses_tstamp' => $currentTime,
            'ses_data' => 'a:1:{s:3:"foo";s:3:"bar";}',
            'ses_permanent' => 0,
        ];
        $userSessionToBePersisted = UserSession::createFromRecord($uniqueSessionId, $sessionRecord, true);
        $userSessionToBePersisted->set('foo', 'bar');

        $controller = $this->setUpController(SearchController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main', $arguments);
        $GLOBALS['TSFE']->fe_user = new FrontendUserAuthentication();
        $GLOBALS['TSFE']->fe_user->initializeUserSessionManager($userSessionManagerMock);

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>
            lastSearch:dateFrom:1800,dateTo:NOW,
            currentDocument:1001
            searchFields:field1,field2,field3,
        </html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canMakeFacetsMenuArray()
    {
        $_POST['tx_dlf'] = [
            'id' => 1001
        ];
        $_POST['tx_dlf_listview'] = [
            'searchParameter' => []
        ];
        $arguments = [
            'searchParameter' => [
                'title' => '10 Keyboard pieces'
            ],
            'query' => '*'
        ];
        $settings = [
            'solrcore' => $this->currentCoreName,
            'storagePid' => 0,
            'facets' => 'type',
            'facetCollections' => '1'
        ];
        $templateHtml = '<html>
            lastSearch:<f:for each="{lastSearch}" as="searchEntry" key="key">{key}:{searchEntry},</f:for>
            currentDocument:{currentDocument.uid}
            facetsMenu:<f:for each="{facetsMenu}" as="menuEntry">
                {menuEntry.field}
                <f:for each="{menuEntry._SUB_MENU}" as="subMenuEntry"> {subMenuEntry.title}: {subMenuEntry.queryColumn.0}</f:for></f:for>
        </html>';

        $uniqueSessionId = StringUtility::getUniqueId('test');
        $currentTime = $GLOBALS['EXEC_TIME'];

        // Main session backend setup
        $userSession = UserSession::createNonFixated($uniqueSessionId);
        $userSessionManagerMock = $this->createMock(UserSessionManager::class);
        $userSessionManagerMock->method('createFromRequestOrAnonymous')->withAnyParameters()->willReturn($userSession);
        $userSessionManagerMock->method('createAnonymousSession')->withAnyParameters()->willReturn($userSession);

        // new session should be written
        $sessionRecord = [
            'ses_id' => 'newSessionId',
            'ses_iplock' => '',
            'ses_userid' => 0,
            'ses_tstamp' => $currentTime,
            'ses_data' => 'a:1:{s:3:"foo";s:3:"bar";}',
            'ses_permanent' => 0,
        ];
        $userSessionToBePersisted = UserSession::createFromRecord($uniqueSessionId, $sessionRecord, true);
        $userSessionToBePersisted->set('foo', 'bar');

        $controller = $this->setUpController(SearchController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main', $arguments);
        $GLOBALS['TSFE']->fe_user = new FrontendUserAuthentication();
        $GLOBALS['TSFE']->fe_user->initializeUserSessionManager($userSessionManagerMock);

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>
            lastSearch:title:10 Keyboard pieces,
            currentDocument:1001
            facetsMenu:
                type
                 other: type_faceting:(&quot;other&quot;) manuscript: type_faceting:(&quot;manuscript&quot;)
        </html>';
        $this->assertEquals($expected, $actual);

    }

    /**
     * @test
     */
    public function canSearchAction()
    {
        $controller = $this->setUpController(SearchController::class, [], '');
        $request = $this->setUpRequest('search', []);

        $this->expectException(StopActionException::class);
        $controller->processRequest($request);
    }
}
