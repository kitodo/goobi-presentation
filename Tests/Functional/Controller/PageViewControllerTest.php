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

use Kitodo\Dlf\Controller\PageViewController;
use TYPO3\CMS\Core\Http\Response;

class PageViewControllerTest extends AbstractControllerTest
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
    public function canMainAction()
    {
        $_POST['tx_dlf'] = [
            'id' => 2001,
            'page' => 2
        ];
        $templateHtml = '<html>
                docId:{docId}
                page:{page}
                images:<f:for each="{images}" as="image">
                    {image.url}
                    {image.mimetype}</f:for>
                viewerConfiguration:<f:format.raw>{viewerConfiguration}</f:format.raw>
            </html>';
        $controller = $this->setUpController(PageViewController::class, ['solrcore' => $this->currentCoreName], $templateHtml);
        $request = $this->setUpRequest('main');

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>
                docId:2001
                page:2
                images:
                    http://example.com/mets_audio/jpegs/00000002.tif.large.jpg
                    image/jpeg
                viewerConfiguration:$(document).ready(function() {
                    if (dlfUtils.exists(dlfViewer)) {
                        tx_dlf_viewer = new dlfViewer({"controls":[""],"div":null,"progressElementId":null,"images":[{"url":"http:\/\/example.com\/mets_audio\/jpegs\/00000002.tif.large.jpg","mimetype":"image\/jpeg"}],"fulltexts":[[]],"score":[],"annotationContainers":[[]],"measureCoords":[],"useInternalProxy":0,"verovioAnnotations":[],"currentMeasureId":"","measureIdLinks":[]});
                    }
                });
            </html>';
        $this->assertEquals($expected, $actual);
    }
}
