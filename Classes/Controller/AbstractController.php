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

namespace Kitodo\Dlf\Controller;

use Kitodo\Dlf\Common\AbstractDocument;
use Kitodo\Dlf\Common\Helper;
use Kitodo\Dlf\Domain\Model\Document;
use Kitodo\Dlf\Domain\Repository\DocumentRepository;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Pagination\PaginationInterface;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;
use TYPO3\CMS\Core\Pagination\PaginatorInterface;
use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;

/**
 * Abstract controller class for most of the plugin controller.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 *
 * @abstract
 */
abstract class AbstractController extends ActionController implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * @access protected
     * @var DocumentRepository
     */
    protected DocumentRepository $documentRepository;

    /**
     * @access public
     *
     * @param DocumentRepository $documentRepository
     *
     * @return void
     */
    public function injectDocumentRepository(DocumentRepository $documentRepository): void
    {
        $this->documentRepository = $documentRepository;
    }

    /**
     * @access protected
     * @var Document|null This holds the current document
     */
    protected ?Document $document = null;

    /**
     * @access protected
     * @var array
     */
    protected $documentArray;

    /**
     * @access protected
     * @var array
     */
    protected array $extConf;

    /**
     * @access protected
     * @var array This holds the request parameter
     */
    protected array $requestData;

    /**
     * @access protected
     * @var array This holds some common data for the fluid view
     */
    protected array $viewData;

    /**
     * @access protected
     * @var int
     */
    protected int $pageUid;

    /**
     * Initialize the plugin controller
     *
     * @access protected
     *
     * @return void
     */
    protected function initialize(): void
    {
        $this->requestData = GeneralUtility::_GPmerged('tx_dlf');
        $this->pageUid = (int) GeneralUtility::_GET('id');

        // Sanitize user input to prevent XSS attacks.
        $this->sanitizeRequestData();

        // Get extension configuration.
        $this->extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get('dlf');

        $this->viewData = [
            'pageUid' => $this->pageUid,
            'uniqueId' => uniqid(),
            'requestData' => $this->requestData
        ];
    }

    /**
     * Loads the current document into $this->document
     *
     * @access protected
     *
     * @param int $documentId The document's UID (fallback: $this->requestData[id])
     *
     * @return void
     */
    protected function loadDocument(int $documentId = 0): void
    {
        // Get document ID from request data if not passed as parameter.
        if ($documentId === 0 && !empty($this->requestData['id'])) {
            $documentId = $this->requestData['id'];
        }

        $pageId = $this->getRequest()->getAttribute('routing')->getPageId();

        // Try to get document format from database
        if (!empty($documentId)) {

            $doc = null;

            if (MathUtility::canBeInterpretedAsInteger($documentId)) {
                $doc = $this->getDocumentByUid($documentId, $pageId);
            } elseif (GeneralUtility::isValidUrl($documentId)) {
                $doc = $this->getDocumentByUrl($documentId, $pageId);
            }

            if ($this->document !== null && $doc !== null) {
                $this->document->setCurrentDocument($doc);
            }

        } elseif (!empty($this->requestData['recordId'])) {

            $this->document = $this->documentRepository->findOneByRecordId($this->requestData['recordId']);

            if ($this->document !== null) {
                $doc = AbstractDocument::getInstance($this->document->getLocation(), $pageId, $this->settings, true);
                if ($doc !== null) {
                    $this->document->setCurrentDocument($doc);
                } else {
                    $this->logger->error('Failed to load document with record ID "' . $this->requestData['recordId'] . '"');
                }
            }
        } else {
            $this->logger->error('Invalid ID "' . $documentId . '" or PID "' . $this->settings['storagePid'] . '" for document loading');
        }
    }

    /**
     * Configure URL for proxy.
     *
     * @access protected
     *
     * @param string $url URL for proxy configuration
     *
     * @return void
     */
    protected function configureProxyUrl(string &$url): void
    {
        $this->uriBuilder->reset()
            ->setTargetPageUid($this->getRequest()->getAttribute('routing')->getPageId())
            ->setCreateAbsoluteUri(!empty($this->settings['general']['forceAbsoluteUrl']))
            ->setArguments(
                [
                    'eID' => 'tx_dlf_pageview_proxy',
                    'url' => $url,
                    'uHash' => GeneralUtility::hmac($url, 'PageViewProxy')
                ]
            )
            ->build();
    }

    /**
     * Checks if doc is missing or is empty (no pages)
     *
     * @access protected
     *
     * @return bool
     */
    protected function isDocMissingOrEmpty(): bool
    {
        $multiViewType = $this->settings['multiViewType'] ?? '';
        return $this->isDocMissing() || ($this->document->getCurrentDocument()->numPages < 1 && $this->document->getCurrentDocument()->tableOfContents[0]['type'] !== $multiViewType);
    }

    /**
     * Checks if doc is missing
     *
     * @access protected
     *
     * @return bool
     */
    protected function isDocMissing(): bool
    {
        return $this->document === null || $this->document->getCurrentDocument() === null;
    }

    /**
     * Returns the LanguageService
     *
     * @access protected
     *
     * @return LanguageService
     */
    protected function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }

    /**
     * Safely gets Parameters from request if they exist
     *
     * @access protected
     *
     * @param string $parameterName
     *
     * @return null|string|array
     */
    protected function getParametersSafely(string $parameterName)
    {
        if ($this->request->hasArgument($parameterName)) {
            return $this->request->getArgument($parameterName);
        }
        return null;
    }

    /**
     * Sanitize input variables.
     *
     * @access protected
     *
     * @return void
     */
    protected function sanitizeRequestData(): void
    {
        // tx_dlf[id] may only be an UID or URI.
        if (
            !empty($this->requestData['id'])
            && !MathUtility::canBeInterpretedAsInteger($this->requestData['id'])
            && !GeneralUtility::isValidUrl($this->requestData['id'])
        ) {
            $this->logger->warning('Invalid ID or URI "' . $this->requestData['id'] . '" for document loading');
            unset($this->requestData['id']);
        }

        // tx_dlf[page] may only be a positive integer or valid XML ID.
        if (
            !empty($this->requestData['page'])
            && !MathUtility::canBeInterpretedAsInteger($this->requestData['page'])
            && !Helper::isValidXmlId($this->requestData['page'])
        ) {
            $this->requestData['page'] = 1;
        }

        // tx_dlf[double] may only be 0 or 1.
        $this->requestData['double'] = MathUtility::forceIntegerInRange($this->requestData['double'] ?? 0, 0, 1);
    }

    /**
     * Sets page value.
     *
     * @access protected
     *
     * @return void
     */
    protected function setPage(): void
    {
        if (!empty($this->requestData['logicalPage'])) {
            $this->requestData['page'] = $this->document->getCurrentDocument()->getPhysicalPage($this->requestData['logicalPage']);
            // The logical page parameter should not appear again
            unset($this->requestData['logicalPage']);
        }

        $this->setDefaultPage();
    }

    /**
     * Sets default page value.
     *
     * @access protected
     *
     * @return void
     */
    protected function setDefaultPage(): void
    {
        // Set default values if not set.
        // $this->requestData['page'] may be integer or string (physical structure @ID)
        if (
            (int) $this->requestData['page'] > 0
            || empty($this->requestData['page'])
            || is_array($this->requestData['docPage'])
        ) {
            if (isset($this->settings['multiViewType']) && $this->document->getCurrentDocument()->tableOfContents[0]['type'] === $this->settings['multiViewType']) {
                $i = 0;
                foreach ($this->documentArray as $document) {
                    if ($document !== null) {
                        $this->requestData['docPage'][$i] = MathUtility::forceIntegerInRange((int) $this->requestData['docPage'][$i], 1, $document->numPages, 1);
                        $i++;
                    }
                }
            } else {
                $this->requestData['page'] = MathUtility::forceIntegerInRange((int) $this->requestData['page'], 1, $this->document->getCurrentDocument()->numPages, 1);
            }
        }
        // reassign viewData to get correct page
        $this->viewData['requestData'] = $this->requestData;
    }

    /**
     * This is the constructor
     *
     * @access public
     *
     * @return void
     */
    public function __construct()
    {
        $this->initialize();
    }

    /**
     * build simple pagination
     *
     * @param PaginationInterface $pagination
     * @param PaginatorInterface $paginator
     * @return array
     */
    //TODO: clean this function
    protected function buildSimplePagination(PaginationInterface $pagination, PaginatorInterface $paginator): array
    {
        $firstPage = $pagination->getFirstPageNumber();
        $lastPage = $pagination->getLastPageNumber();
        $currentPageNumber = $paginator->getCurrentPageNumber();

        $pages = [];
        $pagesSect = [];
        $aRange = [];
        $nRange = 5;    // ToDo: should be made configurable

        // lower limit of the range
        $nBottom = $currentPageNumber - $nRange;
        // upper limit of the range
        $nTop = $currentPageNumber + $nRange;
        // page range
        for ($i = $nBottom; $i <= $nTop; $i++) {
            if ($i > 0 and $i <= $lastPage) {
                array_push($aRange, $i);
            };
        };

        // check whether the first screen page is > 1, if yes then points must be added
        if ($aRange[0] > 1) {
            array_push($pagesSect, ['label' => '...','startRecordNumber' => '...']);
        };
        $lastStartRecordNumberGrid = 0; // due to validity outside the loop
        foreach (range($firstPage, $lastPage) as $i) {
            // detect which pagination is active: ListView or GridView
            if (get_class($pagination) == 'TYPO3\CMS\Core\Pagination\SimplePagination') {  // ListView
                $lastStartRecordNumberGrid = $i; // save last $startRecordNumber for LastPage button

                $pages[$i] = [
                    'label' => $i,
                    'startRecordNumber' => $i
                ];

                // Check if screen page is in range
                // <f:for each="{pagination.pagesR}" as="page">
                if (in_array($i, $aRange)) {
                    array_push($pagesSect, ['label' => $i, 'startRecordNumber' => $i]);
                };
            } else { // GridView
                // to calculate the values for generation the links for the pagination pages
                /** @var \Kitodo\Dlf\Pagination\PageGridPaginator $paginator */
                $itemsPerPage = $paginator->getPublicItemsPerPage();

                $startRecordNumber = $itemsPerPage * $i;
                $startRecordNumber = $startRecordNumber + 1;
                $startRecordNumber = $startRecordNumber - $itemsPerPage;

                $lastStartRecordNumberGrid = $startRecordNumber; // save last $startRecordNumber for LastPage button

                // array with label as screen/pagination page number
                // and startRecordNumer for correct structure of the link
                //<f:link.action action="{action}"
                //      addQueryString="true"
                //      argumentsToBeExcludedFromQueryString="{0: 'tx_dlf[page]'}"
                //      additionalParams="{'tx_dlf[page]': page.startRecordNumber}"
                //      arguments="{searchParameter: lastSearch}">{page.label}</f:link.action>
                $pages[$i] = [
                    'label' => $i,
                    'startRecordNumber' => $startRecordNumber
                ];

                // Check if screen page is in range
                if (in_array($i, $aRange)) {
                    array_push($pagesSect, ['label' => $i,'startRecordNumber' => $startRecordNumber]);
                };
            };
        };

        // check whether the last element from $aRange <= last screen page, if yes then points must be added
        if ($aRange[array_key_last($aRange)] < $lastPage) {
            array_push($pagesSect, ['label' => '...', 'startRecordNumber' => '...']);
        };

        // Safely get the next and previous page numbers
        $nextPageNumber = isset($pages[$currentPageNumber + 1]) ? $pages[$currentPageNumber + 1]['startRecordNumber'] : null;
        $previousPageNumber = isset($pages[$currentPageNumber - 1]) ? $pages[$currentPageNumber - 1]['startRecordNumber'] : null;

        // 'startRecordNumber' is not required in GridView, only the variant for each loop is required
        // 'endRecordNumber' is not required in both views
        //
        // lastPageNumber       =>  last screen page
        // lastPageNumber       =>  Document page to build the last screen page. This is the first document
        //                          of the last block of 10 (or less) documents on the last screen page
        // firstPageNumber      =>  always 1
        // nextPageNumber       =>  Document page to build the next screen page
        // nextPageNumberG      =>  Number of the screen page for the next screen page
        // previousPageNumber   =>  Document page to build up the previous screen page
        // previousPageNumberG  =>  Number of the screen page for the previous screen page
        // currentPageNumber    =>  Number of the current screen page
        // pagesG               =>  Array with two keys
        //    label             =>  Number of the screen page
        //    startRecordNumber =>  First document of this block of 10 documents on the same screen page
        return [
            'lastPageNumber' => $lastPage,
            'lastPageNumberG' => $lastStartRecordNumberGrid,
            'firstPageNumber' => $firstPage,
            'nextPageNumber' => $nextPageNumber,
            'nextPageNumberG' => $currentPageNumber + 1,
            'previousPageNumber' => $previousPageNumber,
            'previousPageNumberG' => $currentPageNumber - 1,
            'startRecordNumber' => $pagination->getStartRecordNumber(),
            'endRecordNumber' => $pagination->getEndRecordNumber(),
            'currentPageNumber' => $currentPageNumber,
            'pages' => range($firstPage, $lastPage),
            'pagesG' => $pages,
            'pagesR' => $pagesSect
        ];
    }

    protected function getRequest(): ServerRequestInterface
    {
        return $GLOBALS['TYPO3_REQUEST'];
    }

    /**
     * Get document from repository by uid.
     *
     * @access private
     *
     * @param int $documentId The document's UID
     * @param int $pageId
     *
     * @return AbstractDocument
     */
    private function getDocumentByUid(int $documentId, int $pageId)
    {
        $doc = null;
        // find document from repository by uid
        $this->document = $this->documentRepository->findOneByIdAndSettings($documentId);
        if ($this->document) {
            $doc = AbstractDocument::getInstance($this->document->getLocation(), $pageId, $this->settings, true);
        } else {
            $this->logger->error('Invalid UID "' . $documentId . '" or PID "' . $this->settings['storagePid'] . '" for document loading');
        }

        return $doc;
    }

    /**
     * Get document by URL.
     *
     * @access protected
     *
     * @param string $documentId The document's URL
     * @param int $pageId
     *
     * @return AbstractDocument
     */
    protected function getDocumentByUrl(string $documentId, int $pageId)
    {
        $doc = AbstractDocument::getInstance($documentId, $pageId, $this->settings, true);

        if (isset($this->settings['multiViewType']) && $doc->tableOfContents[0]['type'] === $this->settings['multiViewType']) {
            $childDocuments = $doc->tableOfContents[0]['children'];
            $i = 0;
            foreach ($childDocuments as $document) {
                $this->documentArray[] = AbstractDocument::getInstance($document['points'], $pageId, $this->settings, true);
                if (!isset($this->requestData['docPage'][$i]) && isset(explode('#', $document['points'])[1])) {
                    $initPage = explode('#', $document['points'])[1];
                    $this->requestData['docPage'][$i] = $initPage;
                }
                $i++;
            }
        } else {
            $this->documentArray[] = $doc;
        }
        if ($this->requestData['multipleSource'] && is_array($this->requestData['multipleSource'])) {
            $i = 0;
            foreach ($this->requestData['multipleSource'] as $location) {
                $document = AbstractDocument::getInstance($location, $pageId, $this->settings, true);
                if ($document !== null) {
                    $this->documentArray['extra_' . $i] = $document;
                }
                $i++;
            }
        }

        if ($doc !== null) {
            $this->document = GeneralUtility::makeInstance(Document::class);

            if ($doc->recordId) {
                // find document from repository by recordId
                $docFromRepository = $this->documentRepository->findOneByRecordId($doc->recordId);
                if ($docFromRepository !== null) {
                    $this->document = $docFromRepository;
                }
            }

            // Make sure configuration PID is set when applicable
            if ($doc->cPid == 0) {
                $doc->cPid = max(intval($this->settings['storagePid']), 0);
            }

            $this->document->setLocation($documentId);
                } else {
                    $this->logger->error('Invalid location given "' . $documentId . '" for document loading');
                }

        return $doc;
    }
}
