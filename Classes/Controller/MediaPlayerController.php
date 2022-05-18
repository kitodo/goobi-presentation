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

use Kitodo\Dlf\Common\Doc;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;

/**
 * Plugin MediaPlayer for the 'dlf' extension
 *
 * @author Kajetan Dvoracek <kajetan.dvoracek@slub-dresden.de>
 * @package TYPO3
 * @subpackage dlf
 * @access public
 */
class MediaPlayerController extends AbstractController
{
    /**
     * The main method of the PlugIn
     *
     * @access public
     *
     * @param string $content: The PlugIn content
     * @param array $conf: The PlugIn configuration
     *
     * @return string The content that is displayed on the website
     */
    public function mainAction()
    {
        // Load current document.
        $this->loadDocument($this->requestData);
        if (
            $this->document === null
            || $this->document->getDoc() === null
            || $this->document->getDoc()->numPages < 1
        ) {
            // Quit without doing anything if required variables are not set.
            return;
        } else {
            if (!empty($this->requestData['logicalPage'])) {
                $this->requestData['page'] = $this->document->getDoc()->getPhysicalPage($this->requestData['logicalPage']);
                // The logical page parameter should not appear again
                unset($this->requestData['logicalPage']);
            }
            // Set default values if not set.
            // $this->requestData['page'] may be integer or string (physical structure @ID)
            if ((int) $this->requestData['page'] > 0 || empty($this->requestData['page'])) {
                $this->requestData['page'] = MathUtility::forceIntegerInRange((int) $this->requestData['page'], 1, $this->document->getDoc()->numPages, 1);
            } else {
                $this->requestData['page'] = array_search($this->requestData['page'], $this->document->getDoc()->physicalStructure);
            }
            $this->requestData['double'] = MathUtility::forceIntegerInRange($this->requestData['double'], 0, 1, 0);
        }

        $doc = $this->document->getDoc();
        $pageNo = $this->requestData['page'];
        $video = $this->getVideoInfo($doc, $pageNo);
        if ($video === null) {
            return;
        }

        $this->addPlayerJS();

        $this->view->assign('video', $video);
    }

    /**
     * Build video info to be passed to the player template.
     *
     * @return ?array The video data, or `null` if no video source is found
     */
    protected function getVideoInfo(Doc $doc, int $pageNo): ?array
    {
        $videoFileGrps = GeneralUtility::trimExplode(',', $this->extConf['fileGrpVideo']);
        $mainVideoFileGrp = $videoFileGrps[0] ?? '';

        $thumbFileGroups = GeneralUtility::trimExplode(',', $this->extConf['fileGrpThumbs']);

        $initialMode = 'audio';

        // Collect video file source URLs
        // TODO: This is for multiple sources (MPD, HLS, MP3, ...) - revisit, make sure it's ordered by preference!
        $videoSources = [];
        $videoFiles = $this->findFiles($doc, $pageNo, $videoFileGrps);
        foreach ($videoFiles as $videoFile) {
            $mimeType = $doc->getFileMimeType($videoFile['fileId']);
            if ($this->isMediaMime($mimeType)) {
                $url = $doc->getFileLocation($videoFile['fileId']);
                $videoSources[] = compact('mimeType', 'url');

                // TODO: Better guess of initial mode?
                //       Perhaps we could look for VIDEOMD/AUDIOMD in METS
                if ($videoFile['fileGrp'] === $mainVideoFileGrp || strpos($mimeType, 'video/') === 0) {
                    $initialMode = 'video';
                }
            }
        }
        if (empty($videoSources)) {
            return null;
        }

        // List all chapters for chapter markers
        $videoChapters = [];
        foreach ($doc->tableOfContents as $entry) {
            $this->recurseChapters($entry, $videoChapters);
        }

        // Get additional video URLs
        $videoUrl = [];
        $thumbFiles = $this->findFiles($doc, 0, $thumbFileGroups);
        if (!empty($thumbFiles)) {
            $videoUrl['poster'] = urldecode($doc->getFileLocation($thumbFiles[0]['fileId']));
        }

        return [
            'start' => $videoChapters[$pageNo - 1]['timecode'] ?: '',
            'mode' => $initialMode,
            'chapters' => $videoChapters,
            'metadata' => $doc->getTitledata($this->settings['storagePid']),
            'sources' => $videoSources,
            'url' => $videoUrl,
        ];
    }

    /**
     * Find files of the given file groups that are referenced on a page.
     *
     * @param Doc $doc
     * @param int $pageNo
     * @param string[] $fileGrps
     * @return string[]
     */
    protected function findFiles(Doc $doc, int $pageNo, array $fileGrps): array
    {
        $pagePhysKey = $doc->physicalStructure[$pageNo];
        $pageFiles = $doc->physicalStructureInfo[$pagePhysKey]['all_files'] ?? [];
        $filesInGrp = array_intersect_key($pageFiles, array_flip($fileGrps));

        $result = [];
        foreach ($filesInGrp as $fileGrp => $fileIds) {
            foreach ($fileIds as $fileId) {
                $result[] = compact('fileGrp', 'fileId');
            }
        }
        return $result;
    }

    /**
     * Recursively push chapters in given logical structure to $outChapters.
     */
    protected function recurseChapters(array $logInfo, array &$outChapters)
    {
        if ($logInfo['type'] === 'segment' && isset($logInfo['videoChapter'])) {
            $outChapters[] = [
                'fileId' => $logInfo['videoChapter']['fileId'],
                'pageNo' => $logInfo['points'],
                'title' => $logInfo['label'] ?? '',
                'timecode' => $logInfo['videoChapter']['timecode'],
            ];
        }

        foreach ($logInfo['children'] ?? [] as $child) {
            $this->recurseChapters($child, $outChapters);
        }
    }

    protected function isMediaMime(string $mimeType)
    {
        return (
            strpos($mimeType, 'audio/') === 0
            || strpos($mimeType, 'video/') === 0
            || $mimeType == 'application/dash+xml'
            || $mimeType == 'application/x-mpegurl'
            || $mimeType == 'application/vnd.apple.mpegurl'
        );
    }

    /**
     * Adds Player javascript
     *
     * @access protected
     *
     * @return void
     */
    protected function addPlayerJS()
    {
        // TODO: TYPO3 v10
        // $assetCollector = GeneralUtility::makeInstance(AssetCollector::class);
        // $assetCollector->addJavaScript('DlfMediaPlayer.js', 'EXT:dlf/Resources/Public/Javascript/DlfMediaPlayer.js');
        // $assetCollector->addStyleSheet('DlfMediaPlayer.css', 'EXT:dlf/Resources/Public/Css/DlfMediaPlayerStyles.css');

        // TODO: Move to TypoScript
        $pageRenderer = GeneralUtility::makeInstance(PageRenderer::class);
        $pageRenderer->addCssFile('EXT:dlf/Resources/Public/Css/DlfMediaPlayer.css');
        $pageRenderer->addCssFile('EXT:dlf/Resources/Public/Css/DlfMediaVendor.css', 'stylesheet', 'all', '', true, false, '', /* excludeFromConcatenation= */true);
        $pageRenderer->addCssFile('EXT:dlf/Resources/Public/Css/DlfMediaPlayerStyles.css');
        $pageRenderer->addJsFooterFile('EXT:dlf/Resources/Public/Javascript/DlfMediaPlayer.js');
        $pageRenderer->addJsFooterFile('EXT:dlf/Resources/Public/Javascript/DlfMediaVendor.js', 'text/javascript', true, false, '', /* excludeFromConcatenation= */true);
    }
}
