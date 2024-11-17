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

use Kitodo\Dlf\Controller\NavigationController;
use Kitodo\Dlf\Domain\Model\PageSelectForm;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Extbase\Mvc\Exception\StopActionException;
use TYPO3\CMS\Frontend\Authentication\FrontendUserAuthentication;

class NavigationControllerTest extends AbstractControllerTest
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
        $templateHtml = '<html>
                pageSteps: {pageSteps}
                numPages: {numPages}
                pageOptions:<f:for each="{pageOptions}" as="entry">{entry},</f:for>
            </html>';
        $controller = $this->setUpController(NavigationController::class, ['solrcore' => $this->currentCoreName], $templateHtml);
        $request = $this->setUpRequest('main');
        $GLOBALS['TSFE']->fe_user = new FrontendUserAuthentication();
        $GLOBALS['TSFE']->fe_user->id = 1;

        $response = $controller->processRequest($request);
        $actual = $response->getBody()->getContents();
        $expected = '<html>
                pageSteps: 5
                numPages: 76
                pageOptions:[1] -  - ,[2] -  - ,[3] - 1,[4] - 2,[5] - 3,[6] - 4,[7] - 5,[8] - 6,[9] - 7,[10] - 8,[11] - 9,[12] - 10,[13] - 11,[14] - 12,[15] - 13,[16] - 14,[17] - 15,[18] - 16,[19] - 17,[20] - 18,[21] - 19,[22] - 20,[23] - 21,[24] - 22,[25] - 23,[26] - 24,[27] - 25,[28] - 26,[29] - 27,[30] - 28,[31] - 29,[32] - 30,[33] - 31,[34] - 32,[35] - 33,[36] - 34,[37] - 35,[38] - 36,[39] - 37,[40] - 38,[41] - 39,[42] - 40,[43] - 41,[44] - 42,[45] - 43,[46] - 44,[47] - 45,[48] - 46,[49] - 47,[50] - 48,[51] - 49,[52] - 50,[53] - 51,[54] - 52,[55] - 53,[56] - 54,[57] - 55,[58] - 56,[59] - 57,[60] - 58,[61] - 59,[62] - 60,[63] - 61,[64] - 62,[65] - 63,[66] - 64,[67] - 65,[68] - 66,[69] - 67,[70] - 68,[71] - 69,[72] - 70,[73] - 71,[74] - 72,[75] - 73,[76] - 74,
            </html>';
        $this->assertEquals($expected, $actual);
    }

    /**
     * @test
     */
    public function canPageSelectAction()
    {
        $pageSelectForm = new PageSelectForm();
        $pageSelectForm->setId(1);
        $pageSelectForm->setPage(2);
        $pageSelectForm->setDouble(false);

        $controller = $this->setUpController(NavigationController::class, ['solrcore' => $this->currentCoreName], '');
        $request = $this->setUpRequest('pageSelect', ['pageSelectForm' => $pageSelectForm]);

        $this->expectException(StopActionException::class);
        $controller->processRequest($request);
    }
}
