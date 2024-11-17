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

use Kitodo\Dlf\Controller\CalendarController;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Extbase\Mvc\Exception\StopActionException;

class CalendarControllerTest extends AbstractControllerTest
{

    private static array $databaseFixtures = [
        __DIR__ . '/../../Fixtures/Controller/pages.csv',
        __DIR__ . '/../../Fixtures/Controller/documents_calendar.csv',
        __DIR__ . '/../../Fixtures/Controller/solrcores.csv',
        __DIR__ . '/../../Fixtures/Controller/metadata.csv'
    ];

    public function setUp(): void
    {
        parent::setUp();
        $this->setUpData(self::$databaseFixtures);
    }

    /**
     * @test
     */
    public function canCalendarAction()
    {
        $settings = ['solrcore' => $this->currentCoreName];
        $templateHtml = '<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers">
            calendarData:<f:for each="{calendarData}" as="month">
                <f:for each="{month.week}" as="week"><f:for each="{week}" as="day"><f:if condition="{day.issues}">
                    <f:then>[{day.dayValue}:{day.issues.0.text}]</f:then><f:else>x</f:else></f:if></f:for>|</f:for></f:for>
            documentId:{documentId}
            yearLinkTitle:{yearLinkTitle}
            parentDocumentId:{parentDocumentId}
            allYearDocTitle:{allYearDocTitle}
        </html>';
        $controller = $this->setUpController(CalendarController::class, $settings, $templateHtml);
        $arguments = ['id' => 2001];
        $request = $this->setUpRequest('calendar', $arguments);

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers">
            calendarData:
                xxx[01:issue 1]x[03:issue 2]x|xxxxxxx|xxxxxxx|xxxxxxx|xxxxxxx|xxxxxxx|
                xxxxxxx|xxxxxxx|xxxxxxx|xxxxxxx|xxxxxxx|xxxxxxx|
                xx[01:issue 4]xxxx|xxxxxxx|xxxxxxx|xxxxxxx|xxxxxxx|xxxxxxx|
            documentId:2001
            yearLinkTitle:Test Newspaper
            parentDocumentId:1
            allYearDocTitle:Test Newspaper
        </html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canMainAction()
    {
        $settings = ["storagePid" => 2];
        $_POST['tx_dlf'] = [
            'id' => 2002,
            'page' => '2',
        ];
        $controller = $this->setUpController(CalendarController::class, $settings, '');

        $request = $this->setUpRequest('main');
        $this->expectException(StopActionException::class);
        $controller->processRequest($request);
    }

    /**
     * @test
     */
    public function canYearsAction()
    {
        $settings = ['solrcore' => $this->currentCoreName];
        $templateHtml = '<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers">
            documentId: {documentId}
            allYearDocTitle: {allYearDocTitle}
            documents: <f:for each="{yearName}" as="year">{year.title},</f:for>
        </html>';
        $controller = $this->setUpController(CalendarController::class, $settings, $templateHtml);
        $arguments = ['id' => "2002"];
        $request = $this->setUpRequest('years', $arguments);

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers">
            documentId: 2002
            allYearDocTitle: Newspaper for testing purposes
            documents: 2021,2022,2023,
        </html>';
        $this->assertEquals($expected, $actual);
    }
}
