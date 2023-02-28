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

namespace Kitodo\Dlf\Common;

use Flow\JSONPath\JSONPath;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\HiddenRestriction;
use TYPO3\CMS\Core\Log\LogManager;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use Ubl\Iiif\Presentation\Common\Model\Resources\AnnotationContainerInterface;
use Ubl\Iiif\Presentation\Common\Model\Resources\AnnotationInterface;
use Ubl\Iiif\Presentation\Common\Model\Resources\CanvasInterface;
use Ubl\Iiif\Presentation\Common\Model\Resources\ContentResourceInterface;
use Ubl\Iiif\Presentation\Common\Model\Resources\IiifResourceInterface;
use Ubl\Iiif\Presentation\Common\Model\Resources\ManifestInterface;
use Ubl\Iiif\Presentation\Common\Model\Resources\RangeInterface;
use Ubl\Iiif\Presentation\Common\Vocabulary\Motivation;
use Ubl\Iiif\Presentation\V1\Model\Resources\AbstractIiifResource1;
use Ubl\Iiif\Presentation\V2\Model\Resources\AbstractIiifResource2;
use Ubl\Iiif\Presentation\V3\Model\Resources\AbstractIiifResource3;
use Ubl\Iiif\Services\AbstractImageService;
use Ubl\Iiif\Services\Service;
use Ubl\Iiif\Tools\IiifHelper;

/**
 * IiifManifest class for the 'dlf' extension.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 *
 * @property int $cPid this holds the PID for the configuration
 * @property-read array $formats this holds the configuration for all supported metadata encodings
 * @property bool $formatsLoaded flag with information if the available metadata formats are loaded
 * @property-read bool $hasFulltext flag with information if there are any fulltext files available
 * @property array $lastSearchedPhysicalPage the last searched logical and physical page
 * @property array $logicalUnits this holds the logical units
 * @property-read array $metadataArray this holds the documents' parsed metadata array
 * @property bool $metadataArrayLoaded flag with information if the metadata array is loaded
 * @property-read int $numPages the holds the total number of pages
 * @property-read int $parentId this holds the UID of the parent document or zero if not multi-volumed
 * @property-read array $physicalStructure this holds the physical structure
 * @property-read array $physicalStructureInfo this holds the physical structure metadata
 * @property bool $physicalStructureLoaded flag with information if the physical structure is loaded
 * @property-read int $pid this holds the PID of the document or zero if not in database
 * @property array $rawTextArray this holds the documents' raw text pages with their corresponding structMap//div's ID (METS) or Range / Manifest / Sequence ID (IIIF) as array key
 * @property-read bool $ready Is the document instantiated successfully?
 * @property-read string $recordId the METS file's / IIIF manifest's record identifier
 * @property-read int $rootId this holds the UID of the root document or zero if not multi-volumed
 * @property-read array $smLinks this holds the smLinks between logical and physical structMap
 * @property bool $smLinksLoaded flag with information if the smLinks are loaded
 * @property-read array $tableOfContents this holds the logical structure
 * @property bool $tableOfContentsLoaded flag with information if the table of contents is loaded
 * @property-read string $thumbnail this holds the document's thumbnail location
 * @property bool $thumbnailLoaded flag with information if the thumbnail is loaded
 * @property-read string $toplevelId this holds the toplevel structure's "@ID" (METS) or the manifest's "@id" (IIIF)
 * @property \SimpleXMLElement $xml this holds the whole XML file as \SimpleXMLElement object
 * @property string $asJson this holds the manifest file as string for serialization purposes
 * @property ManifestInterface $iiif a PHP object representation of a IIIF manifest
 * @property string $iiifVersion 'IIIF1', 'IIIF2' or 'IIIF3', depending on the API $this->iiif conforms to
 * @property bool $hasFulltextSet flag if document has already been analyzed for presence of the fulltext for the Solr index
 * @property array $originalMetadataArray this holds the original manifest's parsed metadata array with their corresponding resource (Manifest / Sequence / Range) ID as array key
 * @property array $mimeTypes this holds the mime types of linked resources in the manifest (extracted during parsing) for later us
 * 
 */
final class IiifManifest extends AbstractDocument
{
    /**
     * @access protected
     * @var string This holds the manifest file as string for serialization purposes
     *
     * @see __sleep() / __wakeup()
     */
    protected string $asJson = '';

    /**
     * @access protected
     * @var ManifestInterface|null A PHP object representation of a IIIF manifest
     */
    protected ?ManifestInterface $iiif;

    /**
     * @access protected
     * @var string 'IIIF1', 'IIIF2' or 'IIIF3', depending on the API $this->iiif conforms to: IIIF Metadata API 1, IIIF Presentation API 2 or 3
     */
    protected string $iiifVersion;

    /**
     * @access protected
     * @var bool Document has already been analyzed if it contains fulltext for the Solr index
     */
    protected bool $hasFulltextSet = false;

    /**
     * @access protected
     * @var array This holds the original manifest's parsed metadata array with their corresponding resource (Manifest / Sequence / Range) ID as array key
     */
    protected array $originalMetadataArray = [];

    /**
     * @access protected
     * @var array Holds the mime types of linked resources in the manifest (extracted during parsing) for later use
     */
    protected array $mimeTypes = [];

    /**
     * @see AbstractDocument::establishRecordId()
     */
    protected function establishRecordId(int $pid): void
    {
        if ($this->iiif !== null) {
            /*
             *  FIXME This will not consistently work because we can not be sure to have the pid at hand. It may miss
             *  if the plugin that actually loads the manifest allows content from other pages.
             *  Up until now the cPid is only set after the document has been initialized. We need it before to
             *  check the configuration.
             *  TODO Saving / indexing should still work - check!
             */
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_metadata');
            // Get hidden records, too.
            $queryBuilder
                ->getRestrictions()
                ->removeByType(HiddenRestriction::class);
            $result = $queryBuilder
                ->select('tx_dlf_metadataformat.xpath AS querypath')
                ->from('tx_dlf_metadata')
                ->from('tx_dlf_metadataformat')
                ->from('tx_dlf_formats')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_metadata.pid', (int) $pid),
                    $queryBuilder->expr()->eq('tx_dlf_metadataformat.pid', (int) $pid),
                    $queryBuilder->expr()->orX(
                        $queryBuilder->expr()->andX(
                            $queryBuilder->expr()->eq('tx_dlf_metadata.uid', 'tx_dlf_metadataformat.parent_id'),
                            $queryBuilder->expr()->eq('tx_dlf_metadataformat.encoded', 'tx_dlf_formats.uid'),
                            $queryBuilder->expr()->eq('tx_dlf_metadata.index_name', $queryBuilder->createNamedParameter('record_id')),
                            $queryBuilder->expr()->eq('tx_dlf_formats.type', $queryBuilder->createNamedParameter($this->getIiifVersion()))
                        ),
                        $queryBuilder->expr()->eq('tx_dlf_metadata.format', 0)
                    )
                )
                ->execute();
            while ($resArray = $result->fetchAssociative()) {
                $recordIdPath = $resArray['querypath'];
                if (!empty($recordIdPath)) {
                    try {
                        $this->recordId = $this->iiif->jsonPath($recordIdPath);
                    } catch (\Exception $e) {
                        $this->logger->warning('Could not evaluate JSONPath to get IIIF record ID');
                    }
                }
            }
            // For now, it's a hardcoded ID, not only as a fallback
            if (!isset($this->recordId)) {
                $this->recordId = $this->iiif->getId();
            }
        }
    }

    /**
     * @see AbstractDocument::getDocument()
     */
    protected function getDocument(): IiifResourceInterface
    {
        return $this->iiif;
    }

    /**
     * Returns a string representing the Metadata / Presentation API version which the IIIF resource
     * conforms to. This is used for example to extract metadata according to configured patterns.
     *
     * @access public
     *
     * @return string 'IIIF1' if the resource is a Metadata API 1 resource, 'IIIF2' / 'IIIF3' if
     * the resource is a Presentation API 2 / 3 resource
     */
    public function getIiifVersion(): string
    {
        if (!isset($this->iiifVersion)) {
            if ($this->iiif instanceof AbstractIiifResource1) {
                $this->iiifVersion = 'IIIF1';
            } elseif ($this->iiif instanceof AbstractIiifResource2) {
                $this->iiifVersion = 'IIIF2';
            } elseif ($this->iiif instanceof AbstractIiifResource3) {
                $this->iiifVersion = 'IIIF3';
            }
        }
        return $this->iiifVersion;
    }

    /**
     * True if getUseGroups() has been called and $this->useGrps is loaded
     *
     * @var bool
     * @access protected
     */
    protected bool $useGrpsLoaded = false;

    /**
     * Holds the configured useGrps as array.
     *
     * @var array
     * @access protected
     */
    protected array $useGrps = [];

    /**
     * IiifManifest also populates the physical structure array entries for matching
     * 'fileGrp's. To do that, the configuration has to be loaded; afterwards configured
     * 'fileGrp's for thumbnails, downloads, audio, fulltext and the 'fileGrp's for images
     * can be requested with this method.
     *
     * @access protected
     *
     * @param string $use
     *
     * @return array|string
     */
    protected function getUseGroups(string $use)
    {
        if (!$this->useGrpsLoaded) {
            // Get configured USE attributes.
            $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey, 'files');
            if (!empty($extConf['fileGrpImages'])) {
                $this->useGrps['fileGrpImages'] = GeneralUtility::trimExplode(',', $extConf['fileGrpImages']);
            }
            if (!empty($extConf['fileGrpThumbs'])) {
                $this->useGrps['fileGrpThumbs'] = GeneralUtility::trimExplode(',', $extConf['fileGrpThumbs']);
            }
            if (!empty($extConf['fileGrpDownload'])) {
                $this->useGrps['fileGrpDownload'] = GeneralUtility::trimExplode(',', $extConf['fileGrpDownload']);
            }
            if (!empty($extConf['fileGrpFulltext'])) {
                $this->useGrps['fileGrpFulltext'] = GeneralUtility::trimExplode(',', $extConf['fileGrpFulltext']);
            }
            if (!empty($extConf['fileGrpAudio'])) {
                $this->useGrps['fileGrpAudio'] = GeneralUtility::trimExplode(',', $extConf['fileGrpAudio']);
            }
            $this->useGrpsLoaded = true;
        }
        return array_key_exists($use, $this->useGrps) ? $this->useGrps[$use] : [];
    }

    /**
     * @see AbstractDocument::magicGetPhysicalStructure()
     */
    protected function magicGetPhysicalStructure(): array
    {
        // Is there no physical structure array yet?
        if (!$this->physicalStructureLoaded) {
            if ($this->iiif == null || !($this->iiif instanceof ManifestInterface)) {
                return [];
            }
            $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey, 'iiif');
            $iiifId = $this->iiif->getId();
            $this->physicalStructureInfo[$iiifId]['id'] = $iiifId;
            $this->physicalStructureInfo[$iiifId]['dmdId'] = $iiifId;
            $this->physicalStructureInfo[$iiifId]['label'] = $this->iiif->getLabelForDisplay();
            $this->physicalStructureInfo[$iiifId]['orderlabel'] = $this->iiif->getLabelForDisplay();
            $this->physicalStructureInfo[$iiifId]['type'] = 'physSequence';
            $this->physicalStructureInfo[$iiifId]['contentIds'] = null;

            $this->setFileUseDownload($iiifId, $this->iiif);
            $this->setFileUseFulltext($iiifId, $this->iiif);

            $fileUseThumbs = $this->getUseGroups('fileGrpThumbs');
            $fileUses = $this->getUseGroups('fileGrpImages');

            if (!empty($this->iiif->getDefaultCanvases())) {
                // canvases have not order property, but the context defines canveses as @list with a specific order, so we can provide an alternative
                $elements = [];
                $canvasOrder = 0;
                foreach ($this->iiif->getDefaultCanvases() as $canvas) {
                    $canvasOrder++;
                    $thumbnailUrl = $canvas->getThumbnailUrl();
                    // put thumbnails in thumbnail filegroup
                    if (
                        !empty($thumbnailUrl)
                        && empty($this->physicalStructureInfo[$iiifId]['files'][$fileUseThumbs[0]])
                    ) {
                        $this->physicalStructureInfo[$iiifId]['files'][$fileUseThumbs[0]] = $thumbnailUrl;
                    }
                    // populate structural metadata info
                    $elements[$canvasOrder] = $canvas->getId();
                    $this->physicalStructureInfo[$elements[$canvasOrder]]['id'] = $canvas->getId();
                    $this->physicalStructureInfo[$elements[$canvasOrder]]['dmdId'] = null;
                    $this->physicalStructureInfo[$elements[$canvasOrder]]['label'] = $canvas->getLabelForDisplay();
                    $this->physicalStructureInfo[$elements[$canvasOrder]]['orderlabel'] = $canvas->getLabelForDisplay();
                    // assume that a canvas always represents a page
                    $this->physicalStructureInfo[$elements[$canvasOrder]]['type'] = 'page';
                    $this->physicalStructureInfo[$elements[$canvasOrder]]['contentIds'] = null;
                    $this->physicalStructureInfo[$elements[$canvasOrder]]['annotationContainers'] = null;
                    if (!empty($canvas->getPossibleTextAnnotationContainers(Motivation::PAINTING))) {
                        $this->physicalStructureInfo[$elements[$canvasOrder]]['annotationContainers'] = [];
                        foreach ($canvas->getPossibleTextAnnotationContainers(Motivation::PAINTING) as $annotationContainer) {
                            $this->physicalStructureInfo[$elements[$canvasOrder]]['annotationContainers'][] = $annotationContainer->getId();
                            if ($extConf['indexAnnotations']) {
                                $this->hasFulltext = true;
                                $this->hasFulltextSet = true;
                            }
                        }
                    }

                    $this->setFileUseFulltext($elements[$canvasOrder], $canvas);

                    if (!empty($fileUses)) {
                        $image = $canvas->getImageAnnotations()[0];
                        foreach ($fileUses as $fileUse) {
                            if ($image->getBody() !== null && $image->getBody() instanceof ContentResourceInterface) {
                                $this->physicalStructureInfo[$elements[$canvasOrder]]['files'][$fileUse] = $image->getBody()->getId();
                            }
                        }
                    }
                    if (!empty($thumbnailUrl)) {
                        $this->physicalStructureInfo[$elements[$canvasOrder]]['files'][$fileUseThumbs] = $thumbnailUrl;
                    }

                    $this->setFileUseDownload($elements[$canvasOrder], $canvas);
                }
                $this->numPages = $canvasOrder;
                // Merge and re-index the array to get nice numeric indexes.
                array_unshift($elements, $iiifId);
                $this->physicalStructure = $elements;
            }
            $this->physicalStructureLoaded = true;
        }
        return $this->physicalStructure;
    }

    /**
     * @see AbstractDocument::getDownloadLocation()
     */
    public function getDownloadLocation(string $id): string
    {
        $fileLocation = $this->getFileLocation($id);
        $resource = $this->iiif->getContainedResourceById($fileLocation);
        if ($resource instanceof AbstractImageService) {
            return $resource->getImageUrl();
        }
        return $fileLocation;
    }

    /**
     * @see AbstractDocument::getFileInfo()
     */
    public function getFileInfo($id): ?array
    {
        if (empty($this->fileInfos[$id]['location'])) {
            $this->fileInfos[$id]['location'] = $this->getFileLocation($id);
        }

        if (empty($this->fileInfos[$id]['mimeType'])) {
            $this->fileInfos[$id]['mimeType'] = $this->getFileMimeType($id);
        }

        return $this->fileInfos[$id] ?? null;
    }

    /**
     * @see AbstractDocument::getFileLocation()
     */
    public function getFileLocation(string $id): string
    {
        if ($id == null) {
            return '';
        }
        $resource = $this->iiif->getContainedResourceById($id);
        if (isset($resource)) {
            if ($resource instanceof CanvasInterface) {
                // TODO: Cannot call method getSingleService() on array<Ubl\Iiif\Presentation\Common\Model\Resources\AnnotationInterface>.
                // @phpstan-ignore-next-line
                return (!empty($resource->getImageAnnotations()) && $resource->getImageAnnotations()->getSingleService() != null) ? $resource->getImageAnnotations()[0]->getSingleService()->getId() : $id;
            } elseif ($resource instanceof ContentResourceInterface) {
                return $resource->getSingleService() instanceof Service ? $resource->getSingleService()->getId() : $id;
            } elseif ($resource instanceof AbstractImageService) {
                return $resource->getId();
            } elseif ($resource instanceof AnnotationContainerInterface) {
                return $id;
            }
        }
        return $id;
    }

    /**
     * @see AbstractDocument::getFileMimeType()
     */
    public function getFileMimeType(string $id): string
    {
        $fileResource = $this->iiif->getContainedResourceById($id);
        if ($fileResource instanceof CanvasInterface) {
            $format = "application/vnd.kitodo.iiif";
        } elseif ($fileResource instanceof AnnotationInterface) {
            $format = "application/vnd.kitodo.iiif";
        } elseif ($fileResource instanceof ContentResourceInterface) {
            if ($fileResource->isText() || $fileResource->isImage() && ($fileResource->getSingleService() == null || !($fileResource->getSingleService() instanceof AbstractImageService))) {
                // Support static images without an image service
                return $fileResource->getFormat();
            }
            $format = "application/vnd.kitodo.iiif";
        } elseif ($fileResource instanceof AbstractImageService) {
            $format = "application/vnd.kitodo.iiif";
        } else {
            // Assumptions: this can only be the thumbnail and the thumbnail is a jpeg - TODO determine mimetype
            $format = "image/jpeg";
        }
        return $format;
    }

    /**
     * @see AbstractDocument::getAllFiles()
     */
    public function getAllFiles()
    {
        $files = [];
        $canvases = $this->iiif->getDefaultCanvases();
        foreach ($canvases as $canvas) {
            $images = $canvas->getImages();
            foreach ($images as $image) {
                $resource = $image->getResource();
                $fileId = $resource->getId();
                if (empty($fileId)) {
                    continue;
                }

                $mimetype = $this->getFileMimeType($fileId);
                if (empty($mimetype)) {
                    continue;
                }

                $files[$fileId] = [
                    'url' => $fileId,
                    'mimetype' => $mimetype,
                ];
            }

            $otherFiles = $canvas->getOtherContent();
            foreach ($otherFiles as $otherFile) {
                $fileId = $$otherFile->getId();
                if (empty($fileId)) {
                    continue;
                }

                $mimetype = $this->getFileMimeType($fileId);
                if (empty($mimetype)) {
                    continue;
                }

                // in IIIF id is URL
                $files[$fileId] = [
                    'url' => $fileId,
                    'mimetype' => $mimetype,
                ];
            }

        }
        return $files;
    }

    /**
     * @see AbstractDocument::getLogicalStructure()
     */
    public function getLogicalStructure(string $id, bool $recursive = false): array
    {
        $details = [];
        if (!$recursive && !empty($this->logicalUnits[$id])) {
            return $this->logicalUnits[$id];
        } elseif (!empty($id)) {
            $logUnits[] = $this->iiif->getContainedResourceById($id);
        } else {
            $logUnits[] = $this->iiif;
        }
        // TODO: Variable $logUnits in empty() always exists and is not falsy.
        // @phpstan-ignore-next-line
        if (!empty($logUnits)) {
            if (!$recursive) {
                $details = $this->getLogicalStructureInfo($logUnits[0]);
            } else {
                // cache the ranges - they might occur multiple times in the structures "tree" - with full data as well as referenced as id
                $processedStructures = [];
                foreach ($logUnits as $logUnit) {
                    if (array_search($logUnit->getId(), $processedStructures) == false) {
                        $this->tableOfContents[] = $this->getLogicalStructureInfo($logUnit, true, $processedStructures);
                    }
                }
            }
        }
        return $details;
    }

    /**
     * Get the details about a IIIF resource (manifest or range) in the logical structure
     *
     * @access protected
     *
     * @param IiifResourceInterface $resource IIIF resource, either a manifest or range.
     * @param bool $recursive Whether to include the child elements
     * @param array $processedStructures IIIF resources that already have been processed
     *
     * @return array Logical structure array
     */
    protected function getLogicalStructureInfo(IiifResourceInterface $resource, bool $recursive = false, array &$processedStructures = []): array
    {
        $details = [];
        $details['id'] = $resource->getId();
        $details['dmdId'] = '';
        $details['label'] = $resource->getLabelForDisplay() ?? '';
        $details['orderlabel'] = $resource->getLabelForDisplay() ?? '';
        $details['contentIds'] = '';
        $details['volume'] = '';
        $details['pagination'] = '';
        $cPid = ($this->cPid ? $this->cPid : $this->pid);
        if ($details['id'] == $this->magicGetToplevelId()) {
            $metadata = $this->getMetadata($details['id'], $cPid);
            if (!empty($metadata['type'][0])) {
                $details['type'] = $metadata['type'][0];
            }
        }
        $details['thumbnailId'] = $resource->getThumbnailUrl();
        $details['points'] = '';
        // Load structural mapping
        $this->magicGetSmLinks();
        // Load physical structure.
        $this->magicGetPhysicalStructure();

        if ($resource instanceof ManifestInterface || $resource instanceof RangeInterface) {
            $startCanvas = $resource->getStartCanvasOrFirstCanvas();
        }
        if (isset($startCanvas)) {
            $details['pagination'] = $startCanvas->getLabel();
            $startCanvasIndex = array_search($startCanvas, $this->iiif->getDefaultCanvases());
            if ($startCanvasIndex !== false) {
                $details['points'] = $startCanvasIndex + 1;
            }
        }
        $useGroups = $this->getUseGroups('fileGrpImages');
        if (is_string($useGroups)) {
            $useGroups = [$useGroups];
        }
        // Keep for later usage.
        $this->logicalUnits[$details['id']] = $details;
        // Walk the structure recursively? And are there any children of the current element?
        if ($recursive) {
            $processedStructures[] = $resource->getId();
            $details['children'] = [];
            if ($resource instanceof ManifestInterface && $resource->getRootRanges() != null) {
                $rangesToAdd = [];
                $rootRanges = [];
                if (count($this->iiif->getRootRanges()) == 1 && $this->iiif->getRootRanges()[0]->isTopRange()) {
                    $rangesToAdd = $this->iiif->getRootRanges()[0]->getMemberRangesAndRanges();
                } else {
                    $rangesToAdd = $this->iiif->getRootRanges();
                }
                foreach ($rangesToAdd as $range) {
                    $rootRanges[] = $range;
                }
                foreach ($rootRanges as $range) {
                    if ((array_search($range->getId(), $processedStructures) == false)) {
                        $details['children'][] = $this->getLogicalStructureInfo($range, true, $processedStructures);
                    }
                }
            } elseif ($resource instanceof RangeInterface) {
                if (!empty($resource->getAllRanges())) {
                    foreach ($resource->getAllRanges() as $range) {
                        if ((array_search($range->getId(), $processedStructures) == false)) {
                            $details['children'][] = $this->getLogicalStructureInfo($range, true, $processedStructures);
                        }
                    }
                }
            }
        }
        return $details;
    }

    /**
     * Returns metadata for IIIF resources with the ID $id in there original form in
     * the manifest, but prepared for display to the user.
     *
     * @access public
     *
     * @param string $id the ID of the IIIF resource
     * @param bool $withDescription add description / summary to the return value
     * @param bool $withRights add attribution and license / rights and requiredStatement to the return value
     * @param bool $withRelated add related links / homepage to the return value
     *
     * @return array
     *
     * @todo This method is still in experimental; the method signature may change.
     */
    public function getManifestMetadata(string $id, bool $withDescription = true, bool $withRights = true, bool $withRelated = true): array
    {
        if (!empty($this->originalMetadataArray[$id])) {
            return $this->originalMetadataArray[$id];
        }
        $iiifResource = $this->iiif->getContainedResourceById($id);
        $result = [];
        if ($iiifResource != null) {
            if (!empty($iiifResource->getLabel())) {
                $result['label'] = $iiifResource->getLabel();
            }
            if (!empty($iiifResource->getMetadata())) {
                $result['metadata'] = [];
                foreach ($iiifResource->getMetadataForDisplay() as $metadata) {
                    $result['metadata'][$metadata['label']] = $metadata['value'];
                }
            }
            if ($withDescription && !empty($iiifResource->getSummary())) {
                $result["description"] = $iiifResource->getSummaryForDisplay();
            }
            if ($withRights) {
                if (!empty($iiifResource->getRights())) {
                    $result["rights"] = $iiifResource->getRights();
                }
                if (!empty($iiifResource->getRequiredStatement())) {
                    $result["requiredStatement"] = $iiifResource->getRequiredStatementForDisplay();
                }
            }
            if ($withRelated && !empty($iiifResource->getWeblinksForDisplay())) {
                $result["weblinks"] = [];
                foreach ($iiifResource->getWeblinksForDisplay() as $link) {
                    $key = array_key_exists("label", $link) ? $link["label"] : $link["@id"];
                    $result["weblinks"][$key] = $link["@id"];
                }
            }
        }
        return $result;
    }

    /**
     * @see AbstractDocument::getMetadata()
     */
    public function getMetadata(string $id, int $cPid = 0): array
    {
        if (!empty($this->metadataArray[$id]) && $this->metadataArray[0] == $cPid) {
            return $this->metadataArray[$id];
        }

        $metadata = $this->initializeMetadata('IIIF');

        $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
            ->getQueryBuilderForTable('tx_dlf_metadata');
        // Get hidden records, too.
        $queryBuilder
            ->getRestrictions()
            ->removeByType(HiddenRestriction::class);
        $result = $queryBuilder
            ->select(
                'tx_dlf_metadata.index_name AS index_name',
                'tx_dlf_metadataformat.xpath AS xpath',
                'tx_dlf_metadataformat.xpath_sorting AS xpath_sorting',
                'tx_dlf_metadata.is_sortable AS is_sortable',
                'tx_dlf_metadata.default_value AS default_value',
                'tx_dlf_metadata.format AS format'
            )
            ->from('tx_dlf_metadata')
            ->from('tx_dlf_metadataformat')
            ->from('tx_dlf_formats')
            ->where(
                $queryBuilder->expr()->eq('tx_dlf_metadata.pid', (int) $cPid),
                $queryBuilder->expr()->eq('tx_dlf_metadataformat.pid', (int) $cPid),
                $queryBuilder->expr()->orX(
                    $queryBuilder->expr()->andX(
                        $queryBuilder->expr()->eq('tx_dlf_metadata.uid', 'tx_dlf_metadataformat.parent_id'),
                        $queryBuilder->expr()->eq('tx_dlf_metadataformat.encoded', 'tx_dlf_formats.uid'),
                        $queryBuilder->expr()->eq('tx_dlf_formats.type', $queryBuilder->createNamedParameter($this->getIiifVersion()))
                    ),
                    $queryBuilder->expr()->eq('tx_dlf_metadata.format', 0)
                )
            )
            ->execute();
        $iiifResource = $this->iiif->getContainedResourceById($id);
        while ($resArray = $result->fetchAssociative()) {
            // Set metadata field's value(s).
            if ($resArray['format'] > 0 && !empty($resArray['xpath'])) {
                $values = $iiifResource->jsonPath($resArray['xpath']);
                if (is_string($values)) {
                    $metadata[$resArray['index_name']] = [trim((string) $values)];
                } elseif ($values instanceof JSONPath && is_array($values->data()) && count($values->data()) > 1) {
                    $metadata[$resArray['index_name']] = [];
                    foreach ($values->data() as $value) {
                        $metadata[$resArray['index_name']][] = trim((string) $value);
                    }
                }
            }
            // Set default value if applicable.
            if (empty($metadata[$resArray['index_name']][0]) && strlen($resArray['default_value']) > 0) {
                $metadata[$resArray['index_name']] = [$resArray['default_value']];
            }
            // Set sorting value if applicable.
            if (!empty($metadata[$resArray['index_name']]) && $resArray['is_sortable']) {
                if ($resArray['format'] > 0 && !empty($resArray['xpath_sorting'])) {
                    $values = $iiifResource->jsonPath($resArray['xpath_sorting']);
                    if (is_string($values)) {
                        $metadata[$resArray['index_name'] . '_sorting'][0] = [trim((string) $values)];
                    } elseif ($values instanceof JSONPath && is_array($values->data()) && count($values->data()) > 1) {
                        $metadata[$resArray['index_name']] = [];
                        foreach ($values->data() as $value) {
                            $metadata[$resArray['index_name'] . '_sorting'][0] = trim((string) $value);
                        }
                    }
                }
                if (empty($metadata[$resArray['index_name'] . '_sorting'][0])) {
                    $metadata[$resArray['index_name'] . '_sorting'][0] = $metadata[$resArray['index_name']][0];
                }
            }
        }
        // Set date to empty string if not present.
        if (empty($metadata['date'][0])) {
            $metadata['date'][0] = '';
        }
        return $metadata;
    }

    /**
     * @see AbstractDocument::magicGetSmLinks()
     */
    protected function magicGetSmLinks(): array
    {
        if (!$this->smLinksLoaded && isset($this->iiif) && $this->iiif instanceof ManifestInterface) {
            if (!empty($this->iiif->getDefaultCanvases())) {
                foreach ($this->iiif->getDefaultCanvases() as $canvas) {
                    $this->smLinkCanvasToResource($canvas, $this->iiif);
                }
            }
            if (!empty($this->iiif->getStructures())) {
                foreach ($this->iiif->getStructures() as $range) {
                    $this->smLinkRangeCanvasesRecursively($range);
                }
            }
            $this->smLinksLoaded = true;
        }
        return $this->smLinks;
    }

    /**
     * Construct a link between a range and it's sub ranges and all contained canvases.
     *
     * @access private
     *
     * @param RangeInterface $range Current range whose canvases shall be linked
     * 
     * @return void
     */
    private function smLinkRangeCanvasesRecursively(RangeInterface $range): void
    {
        // map range's canvases including all child ranges' canvases
        if (!$range->isTopRange()) {
            foreach ($range->getAllCanvasesRecursively() as $canvas) {
                $this->smLinkCanvasToResource($canvas, $range);
            }
        }
        // recursive call for all ranges
        if (!empty($range->getAllRanges())) {
            foreach ($range->getAllRanges() as $childRange) {
                $this->smLinkRangeCanvasesRecursively($childRange);
            }
        }
    }

    /**
     * Link a single canvas to a containing range
     *
     * @access private
     *
     * @param CanvasInterface $canvas
     * @param IiifResourceInterface $resource
     * 
     * @return void
     */
    private function smLinkCanvasToResource(CanvasInterface $canvas, IiifResourceInterface $resource): void
    {
        $this->smLinks['l2p'][$resource->getId()][] = $canvas->getId();
        if (!is_array($this->smLinks['p2l'][$canvas->getId()]) || !in_array($resource->getId(), $this->smLinks['p2l'][$canvas->getId()])) {
            $this->smLinks['p2l'][$canvas->getId()][] = $resource->getId();
        }
    }

    /**
     * @see AbstractDocument::getFullText()
     */
    //TODO: rewrite it to get full OCR
    public function getFullText(string $id): string
    {
        $rawText = '';
        // Get text from raw text array if available.
        if (!empty($this->rawTextArray[$id])) {
            return $this->rawTextArray[$id];
        }
        $this->ensureHasFulltextIsSet();
        if ($this->hasFulltext) {
            // Load physical structure ...
            $this->magicGetPhysicalStructure();
            // ... and extension configuration.
            $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
            $fileGrpsFulltext = GeneralUtility::trimExplode(',', $extConf['files']['fileGrpFulltext']);
            if (!empty($this->physicalStructureInfo[$id])) {
                while ($fileGrpFulltext = array_shift($fileGrpsFulltext)) {
                    if (!empty($this->physicalStructureInfo[$id]['files'][$fileGrpFulltext])) {
                        $rawText = parent::getFullTextFromXml($id);
                        break;
                    }
                }
                if ($extConf['iiif']['indexAnnotations'] == 1) {
                    $iiifResource = $this->iiif->getContainedResourceById($id);
                    // Get annotation containers
                    $annotationContainerIds = $this->physicalStructureInfo[$id]['annotationContainers'];
                    if (!empty($annotationContainerIds)) {
                        $annotationTexts = $this->getAnnotationTexts($annotationContainerIds, $iiifResource->getId());
                        $rawText .= implode(' ', $annotationTexts);
                    }
                }
            } else {
                $this->logger->warning('Invalid structure resource @id "' . $id . '"');
                return $rawText;
            }
            $this->rawTextArray[$id] = $rawText;
        }
        return $rawText;
    }

    /**
     * Returns the underlying IiifResourceInterface.
     *
     * @access public
     *
     * @return IiifResourceInterface
     */
    public function getIiif(): IiifResourceInterface
    {
        return $this->iiif;
    }

    /**
     * @see AbstractDocument::init()
     */
    protected function init(string $location, array $settings = []): void
    {
        $this->logger = GeneralUtility::makeInstance(LogManager::class)->getLogger(static::class);
    }

    /**
     * @see AbstractDocument::loadLocation()
     */
    protected function loadLocation(string $location): bool
    {
        $fileResource = GeneralUtility::getUrl($location);
        if ($fileResource !== false) {
            $conf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey, 'iiif');
            IiifHelper::setUrlReader(IiifUrlReader::getInstance());
            IiifHelper::setMaxThumbnailHeight($conf['thumbnailHeight']);
            IiifHelper::setMaxThumbnailWidth($conf['thumbnailWidth']);
            $resource = IiifHelper::loadIiifResource($fileResource);
            if ($resource instanceof ManifestInterface) {
                $this->iiif = $resource;
                return true;
            }
        }
        $this->logger->error('Could not load IIIF manifest from "' . $location . '"');
        return false;
    }

    /**
     * @see AbstractDocument::prepareMetadataArray()
     */
    protected function prepareMetadataArray(int $cPid): void
    {
        $id = $this->iiif->getId();
        $this->metadataArray[(string) $id] = $this->getMetadata((string) $id, $cPid);
    }

    /**
     * @see AbstractDocument::setPreloadedDocument()
     */
    protected function setPreloadedDocument($preloadedDocument): bool
    {
        if ($preloadedDocument instanceof ManifestInterface) {
            $this->iiif = $preloadedDocument;
            return true;
        }
        return false;
    }

    /**
     * @see AbstractDocument::ensureHasFulltextIsSet()
     */
    protected function ensureHasFulltextIsSet(): void
    {
        /*
         *  TODO Check annotations and annotation lists of canvas for ALTO documents.
         *  Example:
         *  https://digi.ub.uni-heidelberg.de/diglit/iiif/hirsch_hamburg1933_04_25/manifest.json links
         *  https://digi.ub.uni-heidelberg.de/diglit/iiif/hirsch_hamburg1933_04_25/list/0001.json
         */
        if (!$this->hasFulltextSet && $this->iiif instanceof ManifestInterface) {
            $manifest = $this->iiif;
            $canvases = $manifest->getDefaultCanvases();
            foreach ($canvases as $canvas) {
                if (
                    !empty($canvas->getSeeAlsoUrlsForFormat("application/alto+xml")) ||
                    !empty($canvas->getSeeAlsoUrlsForProfile("http://www.loc.gov/standards/alto/"))
                ) {
                    $this->hasFulltextSet = true;
                    $this->hasFulltext = true;
                    return;
                }
                $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey, 'iiif');
                if ($extConf['indexAnnotations'] == 1 && !empty($canvas->getPossibleTextAnnotationContainers(Motivation::PAINTING))) {
                    foreach ($canvas->getPossibleTextAnnotationContainers(Motivation::PAINTING) as $annotationContainer) {
                        $textAnnotations = $annotationContainer->getTextAnnotations(Motivation::PAINTING);
                        if ($textAnnotations != null) {
                            foreach ($textAnnotations as $annotation) {
                                if (
                                    $annotation->getBody() != null &&
                                    $annotation->getBody()->getFormat() == "text/plain" &&
                                    $annotation->getBody()->getChars() != null
                                ) {
                                    $this->hasFulltextSet = true;
                                    $this->hasFulltext = true;
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            $this->hasFulltextSet = true;
        }
    }

    /**
     * @see AbstractDocument::magicGetThumbnail()
     */
    protected function magicGetThumbnail(bool $forceReload = false): string
    {
        return $this->iiif->getThumbnailUrl();
    }

    /**
     * @see AbstractDocument::magicGetToplevelId()
     */
    protected function magicGetToplevelId(): string
    {
        if (empty($this->toplevelId)) {
            if (isset($this->iiif)) {
                $this->toplevelId = $this->iiif->getId();
            }
        }
        return $this->toplevelId;
    }

    /**
     * Get annotation texts.
     *
     * @access private
     *
     * @param array $annotationContainerIds
     * @param string $iiifId
     *
     * @return array
     */
    private function getAnnotationTexts($annotationContainerIds, $iiifId): array
    {
        $annotationTexts = [];
        foreach ($annotationContainerIds as $annotationListId) {
            $annotationContainer = $this->iiif->getContainedResourceById($annotationListId);
            /* @var $annotationContainer \Ubl\Iiif\Presentation\Common\Model\Resources\AnnotationContainerInterface */
            foreach ($annotationContainer->getTextAnnotations(Motivation::PAINTING) as $annotation) {
                if (
                    $annotation->getTargetResourceId() == $iiifId &&
                    $annotation->getBody() != null && $annotation->getBody()->getChars() != null
                ) {
                    $annotationTexts[] = $annotation->getBody()->getChars();
                }
            }
        }
        return $annotationTexts;
    }

    /**
     * Set files used for download (PDF).
     *
     * @access private
     *
     * @param string $iiifId
     * @param IiifResourceInterface $iiif
     *
     * @return void
     */
    private function setFileUseDownload(string $iiifId, $iiif): void
    {
        $fileUseDownload = $this->getUseGroups('fileGrpDownload');

        if (!empty($fileUseDownload)) {
            $docPdfRendering = $iiif->getRenderingUrlsForFormat('application/pdf');
            if (!empty($docPdfRendering)) {
                $this->physicalStructureInfo[$iiifId]['files'][$fileUseDownload[0]] = $docPdfRendering[0];
            }
        }
    }

    /**
     * Set files used for full text (ALTO).
     *
     * @access private
     *
     * @param string $iiifId
     * @param IiifResourceInterface $iiif
     *
     * @return void
     */
    private function setFileUseFulltext(string $iiifId, $iiif): void
    {
        $fileUseFulltext = $this->getUseGroups('fileGrpFulltext');

        if (!empty($fileUseFulltext)) {
            $alto = $iiif->getSeeAlsoUrlsForFormat('application/alto+xml');
            if (empty($alto)) {
                $alto = $iiif->getSeeAlsoUrlsForProfile('http://www.loc.gov/standards/alto/', true);
            }
            if (!empty($alto)) {
                $this->mimeTypes[$alto[0]] = 'application/alto+xml';
                $this->physicalStructureInfo[$iiifId]['files'][$fileUseFulltext[0]] = $alto[0];
                $this->hasFulltext = true;
                $this->hasFulltextSet = true;
            }
        }
    }

    /**
     * This magic method is executed after the object is deserialized
     * @see __sleep()
     *
     * @access public
     *
     * @return void
     */
    public function __wakeup(): void
    {
        $conf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey, 'iiif');
        IiifHelper::setUrlReader(IiifUrlReader::getInstance());
        IiifHelper::setMaxThumbnailHeight($conf['thumbnailHeight']);
        IiifHelper::setMaxThumbnailWidth($conf['thumbnailWidth']);
        $resource = IiifHelper::loadIiifResource($this->asJson);
        if ($resource instanceof ManifestInterface) {
            $this->asJson = '';
            $this->iiif = $resource;
            $this->init('');
        } else {
            $this->logger = GeneralUtility::makeInstance(LogManager::class)->getLogger(static::class);
            $this->logger->error('Could not load IIIF after deserialization');
        }
    }

    /**
     * @access public
     *
     * @return string[]
     */
    public function __sleep(): array
    {
        // TODO implement serialization in IIIF library
        $jsonArray = $this->iiif->getOriginalJsonArray();
        $this->asJson = json_encode($jsonArray);
        return ['pid', 'recordId', 'parentId', 'asJson'];
    }
}
