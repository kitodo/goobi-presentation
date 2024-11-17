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

use Kitodo\Dlf\Controller\ToolboxController;
use TYPO3\CMS\Core\Http\Response;

class ToolboxControllerTest extends AbstractControllerTest
{
    private static array $databaseFixtures = [
        __DIR__ . '/../../Fixtures/Controller/documents_local.csv',
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
    public function canFulltextdownloadtool()
    {
        $_POST['tx_dlf'] = [
            'id' => 2002,
            'page' => '2'
        ];
        $settings = [
            'tools' => 'tx_dlf_fulltextdownloadtool'
        ];
        $templateHtml = '<html>fulltextDownload:{fulltextDownload}</html>';
        $controller = $this->setUpController(ToolboxController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>fulltextDownload:1</html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canFulltexttool()
    {
        $_POST['tx_dlf'] = [
            'id' => 2002,
            'page' => '2'
        ];
        $settings = [
            'tools' => 'tx_dlf_fulltexttool',
            'activateFullTextInitially' => 1
        ];
        $templateHtml = '<html>fulltext:{fulltext},activateFullTextInitially:{activateFullTextInitially}</html>';
        $controller = $this->setUpController(ToolboxController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>fulltext:1,activateFullTextInitially:1</html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canImagedownloadtool()
    {
        $_POST['tx_dlf'] = [
            'id' => 2002,
            'double' => 1,
            'page' => 1
        ];
        $settings = [
            'tools' => 'tx_dlf_imagedownloadtool',
            'fileGrpsImageDownload' => 'MAX'
        ];
        $templateHtml = '<html>imageDownload:<f:for each="{imageDownload}" as="image">
            {image.url}{image.mimetypeLabel}</f:for>
        </html>';
        $controller = $this->setUpController(ToolboxController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>imageDownload:
            http://web:8001/Tests/Fixtures/Controller/mets_local/jpegs/00000001.tif.large.jpg (JPG)
            http://web:8001/Tests/Fixtures/Controller/mets_local/jpegs/00000002.tif.large.jpg (JPG)
        </html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canImagemanipulationtool()
    {
        $_POST['tx_dlf'] = [
            'id' => 2002,
            'page' => '2'
        ];
        $settings = [
            'tools' => 'tx_dlf_imagemanipulationtool',
            'parentContainer' => '.parent-container'
        ];
        $templateHtml = '<html>imageManipulation:{imageManipulation},parentContainer:{parentContainer}</html>';
        $controller = $this->setUpController(ToolboxController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>imageManipulation:1,parentContainer:.parent-container</html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canMainAction()
    {
        $_POST['tx_dlf'] = [
            'id' => 1001,
            'double' => 1
        ];
        $settings = [
            'solrcore' => $this->currentCoreName,
            'library' => 1,
            'tools' => 'tx_dlf_annotationtool',
            'limit' => 1
        ];
        $templateHtml = '<html>double:{double}</html>';
        $controller = $this->setUpController(ToolboxController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>double:1</html>';
        $this->assertEquals($expected, $actual);

    }

    /**
     * @test
     */
    public function canPdfdownloadtool()
    {
        $_POST['tx_dlf'] = [
            'id' => 2002,
            'page' => 1,
            'double' => 1
        ];
        $settings = [
            'tools' => 'tx_dlf_pdfdownloadtool'
        ];
        $templateHtml = '<html>pageLinks:<f:for each="{pageLinks}" as="link">
            {link}</f:for>
            workLink:{workLink}
        </html>';
        $controller = $this->setUpController(ToolboxController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>pageLinks:
            http://web:8001/Tests/Fixtures/Controller/mets_local/jpegs/00000001.tif.pdf
            http://web:8001/Tests/Fixtures/Controller/mets_local/jpegs/00000002.tif.pdf
            workLink:http://web:8001/Tests/Fixtures/Controller/mets_local/jpegs/00000002.tif.pdf
        </html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canSearchindocumenttool()
    {
        $_POST['tx_dlf'] = [
            'id' => 2002,
            'page' => 1
        ];
        $settings = [
            'solrcore' => $this->currentSolrUid,
            'tools' => 'tx_dlf_searchindocumenttool',
            'queryInputName' => 'queryInputName',
            'startInputName' => 'startInputName',
            'idInputName' => 'idInputName',
            'pageInputName' => 'pageInputName',
            'highlightWordInputName' => 'highlightWordInputName',
            'encryptedInputName' => 'encryptedInputName',
            'documentIdUrlSchema' => 'https://host.de/items/*id*/record',
        ];
        $templateHtml = '<html>
            LABEL_QUERY_URL:{searchInDocument.labelQueryUrl}
            LABEL_START:{searchInDocument.labelStart}
            LABEL_ID:{searchInDocument.labelId}
            LABEL_PAGE_URL:{searchInDocument.labelPageUrl}
            LABEL_HIGHLIGHT_WORD:{searchInDocument.labelHighlightWord}
            LABEL_ENCRYPTED:{searchInDocument.labelEncrypted}
            CURRENT_DOCUMENT:{searchInDocument.documentId}
        </html>';
        $controller = $this->setUpController(ToolboxController::class, $settings, $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>
            LABEL_QUERY_URL:queryInputName
            LABEL_START:startInputName
            LABEL_ID:idInputName
            LABEL_PAGE_URL:pageInputName
            LABEL_HIGHLIGHT_WORD:highlightWordInputName
            LABEL_ENCRYPTED:encryptedInputName
            CURRENT_DOCUMENT:2002
        </html>';
        $this->assertEquals($expected, $actual);
    }
}
