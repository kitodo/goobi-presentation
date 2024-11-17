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

use Kitodo\Dlf\Controller\TableOfContentsController;
use TYPO3\CMS\Core\Http\Response;

class TableOfContentsControllerTest extends AbstractControllerTest
{
    private static array $databaseFixtures = [
        __DIR__ . '/../../Fixtures/Controller/documents.csv',
        __DIR__ . '/../../Fixtures/Controller/pages.csv',
        __DIR__ . '/../../Fixtures/Controller/solrcores.csv'
    ];

    public function setUp(): void
    {
        parent::setUp();
        $this->setUpData(self::$databaseFixtures);
    }

    /**
     * @test
     */
    public function canMainAction()
    {
        $_POST['tx_dlf'] = ['id' => 1001];
        $settings = ['storagePid' => 0];
        $templateHtml = '<html><f:for each="{toc}" as="entry">
{entry.type} – {entry.title}
<f:for each="{entry._SUB_MENU}" as="subentry">
{subentry.type} – {subentry.title}
</f:for>
</f:for>
</html>';
        $controller = $this->setUpController(TableOfContentsController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>
manuscript – 10 Keyboard pieces - Go. S. 658

other – Beigefügte Quellenbeschreibung

other – Beigefügtes Inhaltsverzeichnis

other – [Diverse]: 6 Airs Variés et tirés du Journal die Grazienbibliothek 1791. [Klavier]


</html>';
        $this->assertEquals($expected, $actual);
    }
}
