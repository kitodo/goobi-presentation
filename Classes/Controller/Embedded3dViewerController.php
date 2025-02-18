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
use Psr\Http\Message\ResponseInterface;

/**
 * Plugin 'Embedded3dViewer' for the 'dlf' extension
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class Embedded3dViewerController extends AbstractController
{

    const MIDDLEWARE_DLF_EMBEDDED_3D_VIEWER_PREFIX = '/?middleware=dlf/embedded3dviewer';

    /**
     * @access public
     *
     * @return ResponseInterface the response
     */
    public function mainAction(): ResponseInterface
    {
        if (!empty($this->requestData['model']) || !empty($this->settings['model'])) {
            $this->view->assign('embedded3dViewerUrl', $this->buildEmbedded3dViewerUrl());
            return $this->htmlResponse();
        }

        if (!empty($this->settings['document'])) {
            $this->assignModelFromDocument($this->getDocumentByUrl($this->settings['document'], 0));
        } else {
            $this->loadDocument();
            if (!$this->isDocMissingOrEmpty()) {
                $this->assignModelFromDocument($this->document->getCurrentDocument());
            }
        }

        return $this->htmlResponse();
    }

    /**
     * Builds the embedded 3D viewer url.
     *
     * @param string $model The model url
     * @return string The embedded 3D viewer url
     */
    public function buildEmbedded3dViewerUrl(string $model = ''): string
    {
        $viewer = "";
        $embedded3dViewerUrl = self::MIDDLEWARE_DLF_EMBEDDED_3D_VIEWER_PREFIX;

        if (!empty($this->requestData['model'])) {
            $model = $this->requestData['model'];
        } elseif (!empty($this->settings['model'])) {
            $model = $this->settings['model'];
        }

        if (!empty($model)) {
            $embedded3dViewerUrl .= '&model=' . $model;
        }

        if (!empty($this->requestData['viewer'])) {
            $viewer = $this->requestData['viewer'];
        } elseif (!empty($this->settings['viewer'])) {
            $viewer = $this->settings['viewer'];
        }

        if (!empty($viewer)) {
            $embedded3dViewerUrl .= '&viewer=' . $viewer;
        }
        return $embedded3dViewerUrl;
    }

    /**
     * Assign the model from document to view.
     *
     * @param AbstractDocument $document The document containing the model
     */
    public function assignModelFromDocument(AbstractDocument $document): void
    {
        if ($document->getToplevelMetadata()['type'][0] === 'object') {
            $model = trim($document->getFileLocation($document->physicalStructureInfo[$document->physicalStructure[1]]['files']['DEFAULT']));
            $this->view->assign('embedded3dViewerUrl', $this->buildEmbedded3dViewerUrl($model));
        }
    }
}
