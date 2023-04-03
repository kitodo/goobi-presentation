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
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;

/**
 * Controller class for plugin 'Toolbox'.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class ToolboxController extends AbstractController
{

    /**
     * @access private
     * @var AbstractDocument This holds the current document
     */
    private AbstractDocument $currentDocument;

    /**
     * The main method of the plugin
     *
     * @access public
     *
     * @return void
     */
    public function mainAction(): void
    {
        // Load current document.
        $this->loadDocument();

        $this->view->assign('double', $this->requestData['double']);

        if (!$this->isDocMissingOrEmpty()) {
            $this->currentDocument = $this->document->getCurrentDocument();
        }

        $this->renderTools();
        $this->view->assign('viewData', $this->viewData);
    }

    /**
     * Renders tool in the toolbox.
     *
     * @access private
     *
     * @return void
     */
    private function renderTools(): void
    {
        if (!empty($this->settings['tools'])) {

            $tools = explode(',', $this->settings['tools']);

            foreach ($tools as $tool) {
                switch ($tool) {
                    case 'tx_dlf_annotationtool':
                    case 'annotationtool':
                        $this->renderToolByName('renderAnnotationTool');
                        break;
                    case 'tx_dlf_fulltextdownloadtool':
                    case 'fulltextdownloadtool':
                        $this->renderToolByName('renderFulltextDownloadTool');
                        break;
                    case 'tx_dlf_fulltexttool':
                    case 'fulltexttool':
                        $this->renderToolByName('renderFulltextTool');
                        break;
                    case 'tx_dlf_imagedownloadtool':
                    case 'imagedownloadtool':
                        $this->renderToolByName('renderImageDownloadTool');
                        break;
                    case 'tx_dlf_imagemanipulationtool':
                    case 'imagemanipulationtool':
                        $this->renderToolByName('renderImageManipulationTool');
                        break;
                    case 'tx_dlf_modeldownloadtool':
                    case 'modeldownloadtool':
                        $this->renderToolByName('renderModelDownloadTool');
                        break;
                    case 'tx_dlf_pdfdownloadtool':
                    case 'pdfdownloadtool':
                        $this->renderToolByName('renderPdfDownloadTool');
                        break;
                    case 'tx_dlf_searchindocumenttool':
                    case 'searchindocumenttool':
                        $this->renderToolByName('renderSearchInDocumentTool');
                        break;
                    case 'scoretool':
                        $this->renderToolByName('renderScoreTool');
                        break;
                    default:
                        $this->logger->warning('Incorrect tool configuration: "' . $this->settings['tools'] . '". Tool "' . $tool . '" does not exist.');
                }
            }
        }
    }

    /**
     * Renders tool by the name in the toolbox.
     *
     * @access private
     *
     * @param string $tool name
     *
     * @return void
     */
    private function renderToolByName(string $tool): void
    {
        $this->$tool();
        $this->view->assign($tool, true);
    }

    /**
     * Get image's URL and MIME type information's.
     *
     * @access private
     *
     * @param int $page Page number
     *
     * @return array Array of image information's.
     */
    private function getImage(int $page, array $fileGrps): array
    {
        $image = [];
        foreach ($fileGrps as $fileGrp) {
            // Get image link.
            $physicalStructureInfo = $this->currentDocument->physicalStructureInfo[$this->currentDocument->physicalStructure[$page]];
            $fileId = $physicalStructureInfo['files'][$fileGrp];
            if (!empty($fileId)) {
                $image['url'] = $this->currentDocument->getDownloadLocation($fileId);
                $image['mimetype'] = $this->currentDocument->getFileMimeType($fileId);
                // Also see Toolbox.js
                switch ($image['mimetype']) {
                    case 'image/jpeg':
                        $image['mimetypeLabel']  = ' (JPG)';
                        break;
                    case 'image/tiff':
                        $image['mimetypeLabel']  = ' (TIFF)';
                        break;
                    default:
                        $image['mimetypeLabel']  = '';
                }
                break;
            } else {
                $this->logger->warning('File not found in fileGrp "' . $fileGrp . '"');
            }
        }
        return $image;
    }

    /**
     * Renders the annotation tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    // TODO(client-side)
    private function renderAnnotationTool(): void
    {
        if ($this->isDocMissingOrEmpty()) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $this->setPage();

        $annotationContainers = $this->currentDocument->physicalStructureInfo[$this->currentDocument->physicalStructure[$this->requestData['page']]]['annotationContainers'];
        if (
            $annotationContainers != null
            && count($annotationContainers) > 0
        ) {
            $this->view->assign('annotationTool', true);
        } else {
            $this->view->assign('annotationTool', false);
        }
    }

    /**
     * Renders the fulltext download tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    private function renderFulltextDownloadTool(): void
    {
        if (
            $this->isDocMissingOrEmpty()
            || empty($this->extConf['files']['fileGrpFulltext'])
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $this->setPage();

        // Get text download.
        $this->view->assign('fulltextDownload', !$this->isFullTextEmpty());
    }

    /**
     * Renders the fulltext tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    private function renderFulltextTool(): void
    {
        if (
            $this->isDocMissingOrEmpty()
            || empty($this->extConf['files']['fileGrpFulltext'])
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $this->setPage();

        if (!$this->isFullTextEmpty()) {
            $this->view->assign('fulltext', true);
            $this->view->assign('activateFullTextInitially', MathUtility::forceIntegerInRange($this->settings['activateFullTextInitially'], 0, 1, 0));
        } else {
            $this->view->assign('fulltext', false);
        }
    }

    /**
     * Renders the score tool
     *
     * @return void
     */
    public function renderScoreTool()
    {
        if (
            $this->isDocMissingOrEmpty()
            || empty($this->extConf['files']['fileGrpScore'])
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        if ($this->requestData['page']) {
            $currentPhysPage = $this->document->getCurrentDocument()->physicalStructure[$this->requestData['page']];
        } else {
            $currentPhysPage = $this->document->getCurrentDocument()->physicalStructure[1];
        }

        $fileGrpsScores = GeneralUtility::trimExplode(',', $this->extConf['files']['fileGrpScore']);
        foreach ($fileGrpsScores as $fileGrpScore) {
            if ($this->document->getCurrentDocument()->physicalStructureInfo[$currentPhysPage]['files'][$fileGrpScore]) {
                $scoreFile = $this->document->getCurrentDocument()->physicalStructureInfo[$currentPhysPage]['files'][$fileGrpScore];
            }
        }
        if (!empty($scoreFile)) {
            $this->view->assign('score', true);
            $this->view->assign('activateScoreInitially', MathUtility::forceIntegerInRange($this->settings['activateScoreInitially'], 0, 1, 0));
        } else {
            $this->view->assign('score', false);
        }
    }

    /**
     * Renders the image download tool
     * Renders the image download tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    private function renderImageDownloadTool(): void
    {
        if (
            $this->isDocMissingOrEmpty()
            || empty($this->settings['fileGrpsImageDownload'])
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $this->setPage();

        // Get @USE value of METS fileGrp.
        $fileGrpsImageDownload = array_reverse(GeneralUtility::trimExplode(',', $this->settings['fileGrpsImageDownload']));

        $imageArray = [];
        // Get left or single page download.
        $imageArray[0] = $this->getImage($this->requestData['page'], $fileGrpsImageDownload);
        if ($this->requestData['double'] == 1) {
            $imageArray[1] = $this->getImage($this->requestData['page'] + 1, $fileGrpsImageDownload);
        }

        $this->view->assign('imageDownload', $imageArray);
        $this->view->assign('fileGrpsImageDownload', $fileGrpsImageDownload);
    }

    /**
     * Get file's URL and MIME type
     *
     * @access private
     *
     * @param int $page Page number
     * @param string[] $fileGrps File groups to consider
     *
     * @return array Array of file information
     */
    private function getFile(int $page, array $fileGrps): array
    {
        $file = [];
        while ($fileGrp = @array_pop($fileGrps)) {
            $physicalStructureInfo = $this->currentDocument->physicalStructureInfo[$this->currentDocument->physicalStructure[$page]];
            $fileId = $physicalStructureInfo['files'][$fileGrp];
            if (!empty($fileId)) {
                $file['url'] = $this->currentDocument->getDownloadLocation($fileId);
                $file['mimetype'] = $this->currentDocument->getFileMimeType($fileId);
            } else {
                $this->logger->warning('File not found in fileGrp "' . $fileGrp . '"');
            }
        }
        return $file;
    }

    /**
     * Renders the image manipulation tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    private function renderImageManipulationTool(): void
    {
        // Set parent element for initialization.
        $parentContainer = !empty($this->settings['parentContainer']) ? $this->settings['parentContainer'] : '.tx-dlf-imagemanipulationtool';

        $this->view->assign('imageManipulation', true);
        $this->view->assign('parentContainer', $parentContainer);
        // activate it here as it is the most common used tool
        $this->view->assign('activateToolbox', true);
    }

    /**
     * Renders the model download tool
     * Renders the model download tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    private function renderModelDownloadTool(): void
    {
        if (
            $this->isDocMissingOrEmpty()
            || empty($this->settings['fileGrpsModelDownload'])
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $this->setPage();

        $this->view->assign('modelDownload', $this->getFile($this->requestData['page'], GeneralUtility::trimExplode(',', $this->settings['fileGrpsModelDownload'])));
    }

    /**
     * Renders the PDF download tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    private function renderPdfDownloadTool(): void
    {
        if (
            $this->isDocMissingOrEmpty()
            || empty($this->extConf['files']['fileGrpDownload'])
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $this->setPage();

        // Get single page downloads.
        $this->view->assign('pageLinks', $this->getPageLink());
        // Get work download.
        $this->view->assign('workLink', $this->getWorkLink());
    }

    /**
     * Get page's download link
     *
     * @access private
     *
     * @return array Link to downloadable page
     */
    private function getPageLink(): array
    {
        $pageNumber = $this->requestData['page'];
        $pageLinks = [
            $this->currentDocument->getPageLink($pageNumber),
        ];
        // Get second page, too, if double page view is activated.
        if ($this->requestData['double'] && $pageNumber < $this->currentDocument->numPages) {
            $pageLinks[1] = $this->currentDocument->getPageLink($pageNumber + 1);
        }
        if (
            empty($pageLinks[0])
            && empty($pageLinks[1])
        ) {
            $this->logger->warning('File not found in fileGrps "' . $this->extConf['files']['fileGrpDownload'] . '"');
        }

        return $pageLinks;
    }

    /**
     * Get work's download link
     *
     * @access private
     *
     * @return string Link to downloadable work
     */
    private function getWorkLink(): string
    {
        $workLink = '';
        $fileGrpsDownload = GeneralUtility::trimExplode(',', $this->extConf['files']['fileGrpDownload']);
        // Get work link.
        while ($fileGrpDownload = array_shift($fileGrpsDownload)) {
            $fileGroupDownload = $this->currentDocument->physicalStructureInfo[$this->currentDocument->physicalStructure[0]]['files'][$fileGrpDownload];
            if (!empty($fileGroupDownload)) {
                $workLink = $this->currentDocument->getFileLocation($fileGroupDownload);
                break;
            } else {
                $details = $this->currentDocument->getLogicalStructure($this->currentDocument->toplevelId);
                if (!empty($details['files'][$fileGrpDownload])) {
                    $workLink = $this->currentDocument->getFileLocation($details['files'][$fileGrpDownload]);
                    break;
                }
            }
        }
        if (empty($workLink)) {
            $this->logger->warning('File not found in fileGrps "' . $this->extConf['files']['fileGrpDownload'] . '"');
        }
        return $workLink;
    }

    /**
     * Renders the searchInDocument tool (used in template)
     * @SuppressWarnings(PHPMD.UnusedPrivateMethod)
     *
     * @access private
     *
     * @return void
     */
    private function renderSearchInDocumentTool(): void
    {
        if (
            $this->isDocMissingOrEmpty()
            || empty($this->extConf['files']['fileGrpFulltext'])
            || empty($this->settings['solrcore'])
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $this->setPage();

        // Quit if no fulltext file is present
        if ($this->isFullTextEmpty()) {
            return;
        }

        $viewArray = [
            'labelQueryUrl' => $this->settings['queryInputName'],
            'labelStart' => $this->settings['startInputName'],
            'labelId' => $this->settings['idInputName'],
            'labelPid' => $this->settings['pidInputName'],
            'labelPageUrl' => $this->settings['pageInputName'],
            'labelHighlightWord' => $this->settings['highlightWordInputName'],
            'labelEncrypted' => $this->settings['encryptedInputName'],
            'documentId' => $this->getCurrentDocumentId(),
            'documentPageId' => $this->document->getPid(),
            'solrEncrypted' => $this->getEncryptedCoreName() ? : ''
        ];

        $this->view->assign('searchInDocument', $viewArray);
    }

    /**
     * Get current document id. As default the uid will be used.
     * In case there is defined documentIdUrlSchema then the id will
     * extracted from this URL.
     *
     * @access private
     *
     * @return string with current document id
     */
    private function getCurrentDocumentId(): string
    {
        $id = $this->document->getUid();

        if ($id !== null && $id > 0) {
            // we found the document uid
            return (string) $id;
        } else {
            $id = $this->requestData['id'];
            if (!GeneralUtility::isValidUrl($id)) {
                // we found no valid URI --> something unexpected we cannot search within.
                return '';
            }
        }

        // example: https://host.de/items/*id*/record
        if (!empty($this->settings['documentIdUrlSchema'])) {
            $arr = explode('*', $this->settings['documentIdUrlSchema']);

            if (count($arr) == 2) {
                $id = explode($arr[0], $id)[0];
            } else if (count($arr) == 3) {
                $sub = substr($id, strpos($id, $arr[0]) + strlen($arr[0]), strlen($id));
                $id = substr($sub, 0, strpos($sub, $arr[2]));
            }
        }
        return $id;
    }

    /**
     * Get the encrypted Solr core name
     *
     * @access private
     *
     * @return string with encrypted core name
     */
    private function getEncryptedCoreName(): string
    {
        // Get core name.
        $name = Helper::getIndexNameFromUid($this->settings['solrcore'], 'tx_dlf_solrcores');
        // Encrypt core name.
        if (!empty($name)) {
            $name = Helper::encrypt($name);
        }
        return $name;
    }

    /**
     * Check if the full text is empty.
     *
     * @access private
     *
     * @return bool true if empty, false otherwise
     */
    private function isFullTextEmpty(): bool
    {
        $fileGrpsFulltext = GeneralUtility::trimExplode(',', $this->extConf['files']['fileGrpFulltext']);
        while ($fileGrpFulltext = array_shift($fileGrpsFulltext)) {
            $files = $this->currentDocument->physicalStructureInfo[$this->currentDocument->physicalStructure[$this->requestData['page']]]['files'];
            if (!empty($files[$fileGrpFulltext])) {
                return false;
            }
        }
        return true;
    }
}
