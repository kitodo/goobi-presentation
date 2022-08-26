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

use TYPO3\CMS\Core\Cache\CacheManager;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Log\Logger;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use Ubl\Iiif\Presentation\Common\Model\Resources\IiifResourceInterface;
use Ubl\Iiif\Tools\IiifHelper;

/**
 * Document class for the 'dlf' extension
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 *
 * @abstract
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
 */
abstract class AbstractDocument
{
    /**
     * @access protected
     * @var Logger This holds the logger
     */
    protected Logger $logger;

    /**
     * @access protected
     * @var int This holds the PID for the configuration
     */
    protected int $cPid = 0;

    /**
     * @access public
     * @static
     * @var string The extension key
     */
    public static string $extKey = 'dlf';

    /**
     * @access protected
     * @var array Additional information about files (e.g., ADMID), indexed by ID.
     */
    protected array $fileInfos = [];

    /**
     * TODO: Consider moving this to extension configuration
     * @access public
     * @var string[] MIME types that are excluded from PageViewProxy.
     */
    public static $nonProxyMimeTypes = [
        'application/vnd.kitodo.iiif',
        'application/vnd.netfpx',
        'application/vnd.kitodo.zoomify',
    ];

    /**
     * @access protected
     * @var array This holds the configuration for all supported metadata encodings
     *
     * @see loadFormats()
     */
    protected array $formats = [
        'OAI' => [
            'rootElement' => 'OAI-PMH',
            'namespaceURI' => 'http://www.openarchives.org/OAI/2.0/',
        ],
        'METS' => [
            'rootElement' => 'mets',
            'namespaceURI' => 'http://www.loc.gov/METS/',
        ],
        'XLINK' => [
            'rootElement' => 'xlink',
            'namespaceURI' => 'http://www.w3.org/1999/xlink',
        ]
    ];

    /**
     * @access protected
     * @var bool Are the available metadata formats loaded?
     *
     * @see $formats
     */
    protected bool $formatsLoaded = false;

    /**
     * Are there any fulltext files available? This also includes IIIF text annotations
     * with motivation 'painting' if Kitodo.Presentation is configured to store text
     * annotations as fulltext.
     *
     * @access protected
     * @var bool
     */
    protected bool $hasFulltext = false;

    /**
     * @access protected
     * @var array Last searched logical and physical page
     */
    protected array $lastSearchedPhysicalPage = ['logicalPage' => null, 'physicalPage' => null];

    /**
     * @access protected
     * @var array This holds the logical units
     */
    protected array $logicalUnits = [];

    /**
     * This holds the documents' parsed metadata array with their corresponding
     * structMap//div's ID (METS) or Range / Manifest / Sequence ID (IIIF) as array key
     *
     * @access protected
     * @var array
     */
    protected array $metadataArray = [];

    /**
     * @access protected
     * @var bool Is the metadata array loaded?
     *
     * @see $metadataArray
     */
    protected bool $metadataArrayLoaded = false;

    /**
     * @access protected
     * @var int The holds the total number of pages
     */
    protected int $numPages = 0;

    /**
     * @access protected
     * @var int This holds the UID of the parent document or zero if not multi-volumed
     */
    protected int $parentId = 0;

    /**
     * @access protected
     * @var array This holds the physical structure
     */
    protected array $physicalStructure = [];

    /**
     * @access protected
     * @var array This holds the physical structure metadata
     */
    protected array $physicalStructureInfo = [];

    /**
     * @access protected
     * @var bool Is the physical structure loaded?
     *
     * @see $physicalStructure
     */
    protected bool $physicalStructureLoaded = false;

    /**
     * @access protected
     * @var int This holds the PID of the document or zero if not in database
     */
    protected int $pid = 0;

    /**
     * This holds the documents' raw text pages with their corresponding
     * structMap//div's ID (METS) or Range / Manifest / Sequence ID (IIIF) as array key
     *
     * @access protected
     * @var array
     */
    protected array $rawTextArray = [];

    /**
     * @access protected
     * @var bool Is the document instantiated successfully?
     */
    protected bool $ready = false;

    /**
     * @access protected
     * @var string The METS file's / IIIF manifest's record identifier
     */
    protected string $recordId = '';

    /**
     * @access protected
     * @var int This holds the UID of the root document or zero if not multi-volumed
     */
    protected int $rootId = 0;

    /**
     * @access protected
     * @var bool Is the root id loaded?
     *
     * @see $rootId
     */
    protected bool $rootIdLoaded = false;

    /**
     * @access protected
     * @var array This holds the smLinks between logical and physical structMap
     */
    protected array $smLinks = ['l2p' => [], 'p2l' => []];

    /**
     * @access protected
     * @var bool Are the smLinks loaded?
     *
     * @see $smLinks
     */
    protected bool $smLinksLoaded = false;

    /**
     * This holds the logical structure
     *
     * @access protected
     * @var array
     */
    protected array $tableOfContents = [];

    /**
     * @access protected
     * @var bool Is the table of contents loaded?
     *
     * @see $tableOfContents
     */
    protected bool $tableOfContentsLoaded = false;

    /**
     * @access protected
     * @var string This holds the document's thumbnail location
     */
    protected string $thumbnail = '';

    /**
     * @access protected
     * @var bool Is the document's thumbnail location loaded?
     *
     * @see $thumbnail
     */
    protected bool $thumbnailLoaded = false;

    /**
     * @access protected
     * @var string This holds the toplevel structure's "@ID" (METS) or the manifest's "@id" (IIIF)
     */
    protected string $toplevelId = '';

    /**
     * @access protected
     * @var \SimpleXMLElement This holds the whole XML file as \SimpleXMLElement object
     */
    protected \SimpleXMLElement $xml;

    /**
     * This gets the location of a downloadable file for a physical page or track
     *
     * @access public
     *
     * @abstract
     *
     * @param string $id The "@ID" attribute of the file node (METS) or the "@id" property of the IIIF resource
     *
     * @return string The file's location as URL
     */
    abstract public function getDownloadLocation(string $id): string;

    /**
     * This gets all file information stored in single array.
     *
     * @access public
     *
     * @abstract
     *
     * @param string $id The "@ID" attribute of the file node (METS) or the "@id" property of the IIIF resource
     *
     * @return array|null The set of file information
     */
    abstract public function getFileInfo($id): ?array;

    /**
     * This gets the location of a file representing a physical page or track
     *
     * @access public
     *
     * @abstract
     *
     * @param string $id The "@ID" attribute of the file node (METS) or the "@id" property of the IIIF resource
     *
     * @return string The file's location as URL
     */
    abstract public function getFileLocation(string $id): string;

    /**
     * This gets the MIME type of a file representing a physical page or track
     *
     * @access public
     *
     * @abstract
     *
     * @param string $id The "@ID" attribute of the file node
     *
     * @return string The file's MIME type
     */
    abstract public function getFileMimeType(string $id): string;

    /**
     * This extracts the OCR full text for a physical structure node / IIIF Manifest / Canvas. Text might be
     * given as ALTO for METS or as annotations or ALTO for IIIF resources.
     *
     * @access public
     *
     * @abstract
     *
     * @param string $id The "@ID" attribute of the physical structure node (METS) or the "@id" property
     * of the Manifest / Range (IIIF)
     *
     * @return string The OCR full text
     */
    abstract public function getFullText(string $id): string;

    /**
     * This gets details about a logical structure element
     *
     * @access public
     *
     * @abstract
     *
     * @param string $id The "@ID" attribute of the logical structure node (METS) or
     * the "@id" property of the Manifest / Range (IIIF)
     * @param bool $recursive Whether to include the child elements / resources
     *
     * @return array Array of the element's id, label, type and physical page indexes/mptr link
     */
    abstract public function getLogicalStructure(string $id, bool $recursive = false): array;

    /**
     * This extracts all the metadata for a logical structure node
     *
     * @access public
     *
     * @abstract
     *
     * @param string $id The "@ID" attribute of the logical structure node (METS) or the "@id" property
     * of the Manifest / Range (IIIF)
     * @param int $cPid The PID for the metadata definitions (defaults to $this->cPid or $this->pid)
     *
     * @return array The logical structure node's / the IIIF resource's parsed metadata array
     */
    abstract public function getMetadata(string $id, int $cPid = 0): array;

    /**
     * Analyze the document if it contains any fulltext that needs to be indexed.
     *
     * @access protected
     *
     * @abstract
     *
     * @return void
     */
    abstract protected function ensureHasFulltextIsSet(): void;

    /**
     * This ensures that the recordId, if existent, is retrieved from the document
     *
     * @access protected
     *
     * @abstract
     *
     * @param int $pid ID of the configuration page with the recordId config
     *
     * @return void
     */
    abstract protected function establishRecordId(int $pid): void;

    /**
     * Source document PHP object which is represented by a Document instance
     *
     * @access protected
     *
     * @abstract
     *
     * @return \SimpleXMLElement|IiifResourceInterface An PHP object representation of
     * the current document. SimpleXMLElement for METS, IiifResourceInterface for IIIF
     */
    abstract protected function getDocument();

    /**
     * This builds an array of the document's physical structure
     *
     * @access protected
     *
     * @abstract
     *
     * @return array Array of physical elements' id, type, label and file representations ordered
     * by "@ORDER" attribute / IIIF Sequence's Canvases
     */
    abstract protected function magicGetPhysicalStructure(): array;

    /**
     * This returns the smLinks between logical and physical structMap (METS) and models the
     * relation between IIIF Canvases and Manifests / Ranges in the same way
     *
     * @access protected
     *
     * @abstract
     *
     * @return array The links between logical and physical nodes / Range, Manifest and Canvas
     */
    abstract protected function magicGetSmLinks(): array;

    /**
     * This returns the document's thumbnail location
     *
     * @access protected
     *
     * @abstract
     *
     * @param bool $forceReload Force reloading the thumbnail instead of returning the cached value
     *
     * @return string The document's thumbnail location
     */
    abstract protected function magicGetThumbnail(bool $forceReload = false): string;

    /**
     * This returns the ID of the toplevel logical structure node
     *
     * @access protected
     *
     * @abstract
     *
     * @return string The logical structure node's ID
     */
    abstract protected function magicGetToplevelId(): string;

    /**
     * This sets some basic class properties
     *
     * @access protected
     *
     * @abstract
     *
     * @param string $location The location URL of the XML file to parse
     * @param array $settings The extension settings
     *
     * @return void
     */
    abstract protected function init(string $location, array $settings): void;

    /**
     * METS/IIIF specific part of loading a location
     *
     * @access protected
     *
     * @abstract
     *
     * @param string $location The URL of the file to load
     *
     * @return bool true on success or false on failure
     */
    abstract protected function loadLocation(string $location): bool;

    /**
     * Format specific part of building the document's metadata array
     *
     * @access protected
     *
     * @abstract
     *
     * @param int $cPid
     *
     * @return void
     */
    abstract protected function prepareMetadataArray(int $cPid): void;

    /**
     * Reuse any document object that might have been already loaded to determine whether document is METS or IIIF
     *
     * @access protected
     *
     * @abstract
     *
     * @param \SimpleXMLElement|IiifResourceInterface $preloadedDocument any instance that has already been loaded
     *
     * @return bool true if $preloadedDocument can actually be reused, false if it has to be loaded again
     */
    abstract protected function setPreloadedDocument($preloadedDocument): bool;

    /**
     * Get information about all files contained in the document, or null if this information is not available.
     *
     * Returns an associative array of the following form:
     *
     * ```php
     * [
     *     '#FILE_ID' => [
     *         'url' => '...',
     *         'mimetype' => '...',
     *     ],
     *     // ...
     * ]
     * ```
     *
     * @access public
     *
     * @return array|null
     */
    public function getAllFiles()
    {
        // TODO: Implement for IiifManifest
        return null;
    }

    /**
     * This is a singleton class, thus an instance must be created by this method
     *
     * @access public
     *
     * @static
     *
     * @param string $location The URL of XML file or the IRI of the IIIF resource
     * @param array $settings
     * @param bool $forceReload Force reloading the document instead of returning the cached instance
     *
     * @return AbstractDocument|null Instance of this class, either MetsDocument or IiifManifest
     */
    public static function &getInstance(string $location, array $settings = [], bool $forceReload = false)
    {
        // Create new instance depending on format (METS or IIIF) ...
        $documentFormat = null;
        $xml = null;
        $iiif = null;

        if (!$forceReload) {
            $instance = self::getDocumentCache($location);
            if ($instance !== false) {
                return $instance;
            }
        }

        $instance = null;

        // Try to load a file from the url
        if (GeneralUtility::isValidUrl($location)) {
            // Load extension configuration
            $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);

            $content = Helper::getUrl($location);
            if ($content !== false) {
                $xml = Helper::getXmlFileAsString($content);
                if ($xml !== false) {
                    /* @var $xml \SimpleXMLElement */
                    $xml->registerXPathNamespace('mets', 'http://www.loc.gov/METS/');
                    $xpathResult = $xml->xpath('//mets:mets');
                    $documentFormat = !empty($xpathResult) ? 'METS' : null;
                } else {
                    // Try to load file as IIIF resource instead.
                    $contentAsJsonArray = json_decode($content, true);
                    if ($contentAsJsonArray !== null) {
                        IiifHelper::setUrlReader(IiifUrlReader::getInstance());
                        IiifHelper::setMaxThumbnailHeight($extConf['iiif']['thumbnailHeight']);
                        IiifHelper::setMaxThumbnailWidth($extConf['iiif']['thumbnailWidth']);
                        $iiif = IiifHelper::loadIiifResource($contentAsJsonArray);
                        if ($iiif instanceof IiifResourceInterface) {
                            $documentFormat = 'IIIF';
                        }
                    }
                }
            }
        }

        // Sanitize input.
        $pid = array_key_exists('storagePid', $settings) ? max((int) $settings['storagePid'], 0) : 0;
        if ($documentFormat == 'METS') {
            $instance = new MetsDocument($pid, $location, $xml, $settings);
        } elseif ($documentFormat == 'IIIF') {
            // TODO: Parameter $preloadedDocument of class Kitodo\Dlf\Common\IiifManifest constructor expects SimpleXMLElement|Ubl\Iiif\Presentation\Common\Model\Resources\IiifResourceInterface, Ubl\Iiif\Presentation\Common\Model\AbstractIiifEntity|null given.
            // @phpstan-ignore-next-line
            $instance = new IiifManifest($pid, $location, $iiif);
        }

        if ($instance !== null) {
            self::setDocumentCache($location, $instance);
        }

        return $instance;
    }

    /**
     * Clear document cache.
     *
     * @access public
     *
     * @static
     *
     * @return void
     */
    public static function clearDocumentCache(): void
    {
        $cache = GeneralUtility::makeInstance(CacheManager::class)->getCache('tx_dlf_doc');
        $cache->flush();
    }

    /**
     * This returns the first corresponding physical page number of a given logical page label
     *
     * @access public
     *
     * @param string $logicalPage The label (or a part of the label) of the logical page
     *
     * @return int The physical page number
     */
    public function getPhysicalPage(string $logicalPage): int
    {
        if (
            !empty($this->lastSearchedPhysicalPage['logicalPage'])
            && $this->lastSearchedPhysicalPage['logicalPage'] == $logicalPage
        ) {
            return $this->lastSearchedPhysicalPage['physicalPage'];
        } else {
            $physicalPage = 0;
            foreach ($this->physicalStructureInfo as $page) {
                if (strpos($page['orderlabel'], $logicalPage) !== false) {
                    $this->lastSearchedPhysicalPage['logicalPage'] = $logicalPage;
                    $this->lastSearchedPhysicalPage['physicalPage'] = $physicalPage;
                    return $physicalPage;
                }
                $physicalPage++;
            }
        }
        return 1;
    }

    /**
     * This extracts the OCR full text for a physical structure node / IIIF Manifest / Canvas from an
     * XML full text representation (currently only ALTO). For IIIF manifests, ALTO documents have
     * to be given in the Canvas' / Manifest's "seeAlso" property.
     *
     * @param string $id The "@ID" attribute of the physical structure node (METS) or the "@id" property
     * of the Manifest / Range (IIIF)
     *
     * @return string The OCR full text
     */
    protected function getFullTextFromXml(string $id): string
    {
        $fullText = '';
        // Load available text formats, ...
        $this->loadFormats();
        // ... physical structure ...
        $this->magicGetPhysicalStructure();
        // ... and extension configuration.
        $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey, 'files');
        $fileGrpsFulltext = GeneralUtility::trimExplode(',', $extConf['fileGrpFulltext']);
        $textFormat = "";
        if (!empty($this->physicalStructureInfo[$id])) {
            while ($fileGrpFulltext = array_shift($fileGrpsFulltext)) {
                if (!empty($this->physicalStructureInfo[$id]['files'][$fileGrpFulltext])) {
                    // Get full text file.
                    $fileContent = GeneralUtility::getUrl($this->getFileLocation($this->physicalStructureInfo[$id]['files'][$fileGrpFulltext]));
                    if ($fileContent !== false) {
                        $textFormat = $this->getTextFormat($fileContent);
                    } else {
                        $this->logger->warning('Couldn\'t load full text file for structure node @ID "' . $id . '"');
                        return $fullText;
                    }
                    break;
                }
            }
        } else {
            $this->logger->warning('Invalid structure node @ID "' . $id . '"');
            return $fullText;
        }
        // Is this text format supported?
        // This part actually differs from previous version of indexed OCR
        if (!empty($fileContent) && !empty($this->formats[$textFormat])) {
            $textMiniOcr = '';
            if (!empty($this->formats[$textFormat]['class'])) {
                $textMiniOcr = $this->getRawTextFromClass($id, $fileContent, $textFormat);
            }
            $fullText = $textMiniOcr;
        } else {
            $this->logger->warning('Unsupported text format "' . $textFormat . '" in physical node with @ID "' . $id . '"');
        }
        return $fullText;
    }

    /**
     * Get raw text from class for given format.
     *
     * @access private
     *
     * @param $id
     * @param $fileContent
     * @param $textFormat
     *
     * @return string
     */
    private function getRawTextFromClass($id, $fileContent, $textFormat): string
    {
        $textMiniOcr = '';
        $class = $this->formats[$textFormat]['class'];
        // Get the raw text from class.
        if (class_exists($class)) {
            $obj = GeneralUtility::makeInstance($class);
            if ($obj instanceof FulltextInterface) {
                // Load XML from file.
                $ocrTextXml = Helper::getXmlFileAsString($fileContent);
                $textMiniOcr = $obj->getTextAsMiniOcr($ocrTextXml);
                $this->rawTextArray[$id] = $textMiniOcr;
            } else {
                $this->logger->warning('Invalid class/method "' . $class . '->getRawText()" for text format "' . $textFormat . '"');
            }
        } else {
            $this->logger->warning('Class "' . $class . ' does not exists for "' . $textFormat . ' text format"');
        }
        return $textMiniOcr;
    }

    /**
     * Get format of the OCR full text
     *
     * @access private
     *
     * @param string $fileContent content of the XML file
     *
     * @return string The format of the OCR full text
     */
    private function getTextFormat(string $fileContent): string
    {
        $xml = Helper::getXmlFileAsString($fileContent);

        if ($xml !== false) {
            // Get the root element's name as text format.
            return strtoupper($xml->getName());
        } else {
            return '';
        }
    }

    /**
     * This determines a title for the given document
     *
     * @access public
     *
     * @static
     *
     * @param int $uid The UID of the document
     * @param bool $recursive Search superior documents for a title, too?
     *
     * @return string The title of the document itself or a parent document
     */
    public static function getTitle(int $uid, bool $recursive = false): string
    {
        $title = '';
        // Sanitize input.
        $uid = max($uid, 0);
        if ($uid) {
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_documents');

            $result = $queryBuilder
                ->select(
                    'tx_dlf_documents.title',
                    'tx_dlf_documents.partof'
                )
                ->from('tx_dlf_documents')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_documents.uid', $uid),
                    Helper::whereExpression('tx_dlf_documents')
                )
                ->setMaxResults(1)
                ->execute();

            $resArray = $result->fetchAssociative();
            if ($resArray) {
                // Get title information.
                $title = $resArray['title'];
                $partof = $resArray['partof'];
                // Search parent documents recursively for a title?
                if (
                    $recursive
                    && empty($title)
                    && (int) $partof
                    && $partof != $uid
                ) {
                    $title = self::getTitle($partof, true);
                }
            } else {
                Helper::log('No document with UID ' . $uid . ' found or document not accessible', LOG_SEVERITY_WARNING);
            }
        } else {
            Helper::log('Invalid UID ' . $uid . ' for document', LOG_SEVERITY_ERROR);
        }
        return $title;
    }

    /**
     * This extracts all the metadata for the toplevel logical structure node / resource
     *
     * @access public
     *
     * @param int $cPid The PID for the metadata definitions
     *
     * @return array The logical structure node's / resource's parsed metadata array
     */
    public function getToplevelMetadata(int $cPid = 0): array
    {
        $toplevelMetadata = $this->getMetadata($this->magicGetToplevelId(), $cPid);
        // Add information from METS structural map to toplevel metadata array.
        if ($this instanceof MetsDocument) {
            $this->addMetadataFromMets($toplevelMetadata, $this->magicGetToplevelId());
        }
        // Set record identifier for METS file / IIIF manifest if not present.
        if (array_key_exists('record_id', $toplevelMetadata)) {
            if (
                !empty($this->recordId)
                && !in_array($this->recordId, $toplevelMetadata['record_id'])
            ) {
                array_unshift($toplevelMetadata['record_id'], $this->recordId);
            }
        }
        return $toplevelMetadata;
    }

    /**
     * Traverse a logical (sub-) structure tree to find the structure with the requested logical id and return its depth.
     *
     * @access protected
     *
     * @param array $structure logical structure array
     * @param int $depth current tree depth
     * @param string $logId ID of the logical structure whose depth is requested
     *
     * @return int|bool false if structure with $logId is not a child of this substructure,
     * or the actual depth.
     */
    protected function getTreeDepth(array $structure, int $depth, string $logId)
    {
        foreach ($structure as $element) {
            if ($element['id'] == $logId) {
                return $depth;
            } elseif (array_key_exists('children', $element)) {
                $foundInChildren = $this->getTreeDepth($element['children'], $depth + 1, $logId);
                if ($foundInChildren !== false) {
                    return $foundInChildren;
                }
            }
        }
        return false;
    }

    /**
     * Get the tree depth of a logical structure element within the table of content
     *
     * @access public
     *
     * @param string $logId The id of the logical structure element whose depth is requested
     *
     * @return int|bool tree depth as integer or false if no element with $logId exists within the TOC.
     */
    public function getStructureDepth(string $logId)
    {
        return $this->getTreeDepth($this->magicGetTableOfContents(), 1, $logId);
    }

    /**
     * Load XML file / IIIF resource from URL
     *
     * @access protected
     *
     * @param string $location The URL of the file to load
     *
     * @return bool true on success or false on failure
     */
    protected function load(string $location): bool
    {
        // Load XML / JSON-LD file.
        if (GeneralUtility::isValidUrl($location)) {
            // the actual loading is format specific
            return $this->loadLocation($location);
        } else {
            $this->logger->error('Invalid file location "' . $location . '" for document loading');
        }
        return false;
    }

    /**
     * Register all available data formats
     *
     * @access protected
     *
     * @return void
     */
    protected function loadFormats(): void
    {
        if (!$this->formatsLoaded) {
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_formats');

            // Get available data formats from database.
            $result = $queryBuilder
                ->select(
                    'tx_dlf_formats.type AS type',
                    'tx_dlf_formats.root AS root',
                    'tx_dlf_formats.namespace AS namespace',
                    'tx_dlf_formats.class AS class'
                )
                ->from('tx_dlf_formats')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_formats.pid', 0)
                )
                ->execute();

            while ($resArray = $result->fetchAssociative()) {
                // Update format registry.
                $this->formats[$resArray['type']] = [
                    'rootElement' => $resArray['root'],
                    'namespaceURI' => $resArray['namespace'],
                    'class' => $resArray['class']
                ];
            }
            $this->formatsLoaded = true;
        }
    }

    /**
     * Register all available namespaces for a \SimpleXMLElement object
     *
     * @access public
     *
     * @param \SimpleXMLElement|\DOMXPath &$obj \SimpleXMLElement or \DOMXPath object
     *
     * @return void
     */
    public function registerNamespaces(&$obj): void
    {
        // TODO Check usage. XML specific method does not seem to be used anywhere outside this class within the project, but it is public and may be used by extensions.
        $this->loadFormats();
        // Do we have a \SimpleXMLElement or \DOMXPath object?
        if ($obj instanceof \SimpleXMLElement) {
            $method = 'registerXPathNamespace';
        } elseif ($obj instanceof \DOMXPath) {
            $method = 'registerNamespace';
        } else {
            $this->logger->error('Given object is neither a SimpleXMLElement nor a DOMXPath instance');
            return;
        }
        // Register metadata format's namespaces.
        foreach ($this->formats as $enc => $conf) {
            $obj->$method(strtolower($enc), $conf['namespaceURI']);
        }
    }

    /**
     * Initialize metadata array with empty values.
     *
     * @access protected
     *
     * @param string $format of the document eg. METS
     *
     * @return array
     */
    protected function initializeMetadata(string $format): array
    {
        return [
            'title' => [],
            'title_sorting' => [],
            'description' => [],
            'author' => [],
            'holder' => [],
            'place' => [],
            'year' => [],
            'prod_id' => [],
            'record_id' => [],
            'opac_id' => [],
            'union_id' => [],
            'urn' => [],
            'purl' => [],
            'type' => [],
            'volume' => [],
            'volume_sorting' => [],
            'date' => [],
            'license' => [],
            'terms' => [],
            'restrictions' => [],
            'out_of_print' => [],
            'rights_info' => [],
            'collection' => [],
            'owner' => [],
            'mets_label' => [],
            'mets_orderlabel' => [],
            'document_format' => [$format]
        ];
    }

    /**
     * This returns $this->cPid via __get()
     *
     * @access protected
     *
     * @return int The PID of the metadata definitions
     */
    protected function magicGetCPid(): int
    {
        return $this->cPid;
    }

    /**
     * This returns $this->hasFulltext via __get()
     *
     * @access protected
     *
     * @return bool Are there any fulltext files available?
     */
    protected function magicGetHasFulltext(): bool
    {
        $this->ensureHasFulltextIsSet();
        return $this->hasFulltext;
    }

    /**
     * This magic method is called each time an invisible property is referenced from the object
     * It builds an array of the document's metadata
     *
     * @access protected
     *
     * @return array Array of metadata with their corresponding logical structure node ID as key
     */
    protected function magicGetMetadataArray(): array
    {
        // Set metadata definitions' PID.
        $cPid = ($this->cPid ? $this->cPid : $this->pid);
        if (!$cPid) {
            $this->logger->error('Invalid PID ' . $cPid . ' for metadata definitions');
            return [];
        }
        if (
            !$this->metadataArrayLoaded
            || $this->metadataArray[0] != $cPid
        ) {
            $this->prepareMetadataArray($cPid);
            $this->metadataArray[0] = $cPid;
            $this->metadataArrayLoaded = true;
        }
        return $this->metadataArray;
    }

    /**
     * This returns $this->numPages via __get()
     *
     * @access protected
     *
     * @return int The total number of pages and/or tracks
     */
    protected function magicGetNumPages(): int
    {
        $this->magicGetPhysicalStructure();
        return $this->numPages;
    }

    /**
     * This returns $this->parentId via __get()
     *
     * @access protected
     *
     * @return int The UID of the parent document or zero if not applicable
     */
    protected function magicGetParentId(): int
    {
        return $this->parentId;
    }

    /**
     * This gives an array of the document's physical structure metadata
     *
     * @access protected
     *
     * @return array Array of elements' type, label and file representations ordered by "@ID" attribute / Canvas order
     */
    protected function magicGetPhysicalStructureInfo(): array
    {
        // Is there no physical structure array yet?
        if (!$this->physicalStructureLoaded) {
            // Build physical structure array.
            $this->magicGetPhysicalStructure();
        }
        return $this->physicalStructureInfo;
    }

    /**
     * This returns $this->pid via __get()
     *
     * @access protected
     *
     * @return int The PID of the document or zero if not in database
     */
    protected function magicGetPid(): int
    {
        return $this->pid;
    }

    /**
     * This returns $this->ready via __get()
     *
     * @access protected
     *
     * @return bool Is the document instantiated successfully?
     */
    protected function magicGetReady(): bool
    {
        return $this->ready;
    }

    /**
     * This returns $this->recordId via __get()
     *
     * @access protected
     *
     * @return mixed The METS file's / IIIF manifest's record identifier
     */
    protected function magicGetRecordId()
    {
        return $this->recordId;
    }

    /**
     * This returns $this->rootId via __get()
     *
     * @access protected
     *
     * @return int The UID of the root document or zero if not applicable
     */
    protected function magicGetRootId(): int
    {
        if (!$this->rootIdLoaded) {
            if ($this->parentId) {
                // TODO: Parameter $location of static method AbstractDocument::getInstance() expects string, int<min, -1>|int<1, max> given.
                // @phpstan-ignore-next-line
                $parent = self::getInstance($this->parentId, ['storagePid' => $this->pid]);
                $this->rootId = $parent->rootId;
            }
            $this->rootIdLoaded = true;
        }
        return $this->rootId;
    }

    /**
     * This builds an array of the document's logical structure
     *
     * @access protected
     *
     * @return array Array of structure nodes' id, label, type and physical page indexes/mptr / Canvas link with original hierarchy preserved
     */
    protected function magicGetTableOfContents(): array
    {
        // Is there no logical structure array yet?
        if (!$this->tableOfContentsLoaded) {
            // Get all logical structures.
            $this->getLogicalStructure('', true);
            $this->tableOfContentsLoaded = true;
        }
        return $this->tableOfContents;
    }

    /**
     * This sets $this->cPid via __set()
     *
     * @access protected
     *
     * @param int $value The new PID for the metadata definitions
     *
     * @return void
     */
    protected function _setCPid(int $value): void
    {
        $this->cPid = max($value, 0);
    }

    /**
     * This is a singleton class, thus the constructor should be private/protected
     * (Get an instance of this class by calling AbstractDocument::getInstance())
     *
     * @access protected
     *
     * @param int $pid If > 0, then only document with this PID gets loaded
     * @param string $location The location URL of the XML file to parse
     * @param \SimpleXMLElement|IiifResourceInterface $preloadedDocument Either null or the \SimpleXMLElement
     * or IiifResourceInterface that has been loaded to determine the basic document format.
     *
     * @return void
     */
    protected function __construct(int $pid, string $location, $preloadedDocument, array $settings = [])
    {
        $this->pid = $pid;
        $this->setPreloadedDocument($preloadedDocument);
        $this->init($location, $settings);
        $this->establishRecordId($pid);
    }

    /**
     * This magic method is called each time an invisible property is referenced from the object
     *
     * @access public
     *
     * @param string $var Name of variable to get
     *
     * @return mixed Value of $this->$var
     */
    public function __get(string $var)
    {
        $method = 'magicGet' . ucfirst($var);
        if (
            !property_exists($this, $var)
            || !method_exists($this, $method)
        ) {
            $this->logger->warning('There is no getter function for property "' . $var . '"');
            return null;
        } else {
            return $this->$method();
        }
    }

    /**
     * This magic method is called each time an invisible property is checked for isset() or empty()
     *
     * @access public
     *
     * @param string $var Name of variable to check
     *
     * @return bool true if variable is set and not empty, false otherwise
     */
    public function __isset(string $var): bool
    {
        return !empty($this->__get($var));
    }

    /**
     * This magic method is called each time an invisible property is referenced from the object
     *
     * @access public
     *
     * @param string $var Name of variable to set
     * @param mixed $value New value of variable
     *
     * @return void
     */
    public function __set(string $var, $value): void
    {
        $method = '_set' . ucfirst($var);
        if (
            !property_exists($this, $var)
            || !method_exists($this, $method)
        ) {
            $this->logger->warning('There is no setter function for property "' . $var . '"');
        } else {
            $this->$method($value);
        }
    }

    /**
     * Get Cache Hit for document instance
     *
     * @access private
     *
     * @static
     *
     * @param string $location
     *
     * @return AbstractDocument|false
     */
    private static function getDocumentCache(string $location)
    {
        $cacheIdentifier = hash('md5', $location);
        $cache = GeneralUtility::makeInstance(CacheManager::class)->getCache('tx_dlf_doc');
        $cacheHit = $cache->get($cacheIdentifier);

        return $cacheHit;
    }

    /**
     * Set Cache for document instance
     *
     * @access private
     *
     * @static
     *
     * @param string $location
     * @param AbstractDocument $currentDocument
     *
     * @return void
     */
    private static function setDocumentCache(string $location, AbstractDocument $currentDocument): void
    {
        $cacheIdentifier = hash('md5', $location);
        $cache = GeneralUtility::makeInstance(CacheManager::class)->getCache('tx_dlf_doc');

        // Save value in cache
        $cache->set($cacheIdentifier, $currentDocument);
    }

    /**
     * Get IDs of logical structures that a page belongs to, indexed by depth.
     *
     * @param int $pageNo
     * @return array
     */
    public function getLogicalSectionsOnPage($pageNo)
    {
        $this->magicGetSmLinks();
        $this->magicGetPhysicalStructure();

        $ids = [];
        if (!empty($this->physicalStructure[$pageNo]) && !empty($this->smLinks['p2l'][$this->physicalStructure[$pageNo]])) {
            foreach ($this->smLinks['p2l'][$this->physicalStructure[$pageNo]] as $logId) {
                $depth = $this->getStructureDepth($logId);
                $ids[$depth][] = $logId;
            }
        }
        ksort($ids);
        reset($ids);
        return $ids;
    }

    /**
     * Get URL of download file of specified page, or the empty string if there is no such link.
     *
     * @param int $pageNumber
     * @return string
     */
    public function getPageLink($pageNumber)
    {
        $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
        $fileGrpsDownload = GeneralUtility::trimExplode(',', $extConf['files']['fileGrpDownload']);
        // Get image link.
        foreach ($fileGrpsDownload as $fileGrpDownload) {
            if (!empty($this->physicalStructureInfo[$this->physicalStructure[$pageNumber]]['files'][$fileGrpDownload])) {
                return $this->getFileLocation($this->physicalStructureInfo[$this->physicalStructure[$pageNumber]]['files'][$fileGrpDownload]);
            }
        }
        return '';
    }

    public function toArray($uriBuilder, array $config = [])
    {
        $proxyFileGroups = $config['proxyFileGroups'] ?? [];
        $forceAbsoluteUrl = $config['forceAbsoluteUrl'] ?? false;

        $this->magicGetSmLinks();
        $this->magicGetPhysicalStructure();

        $proxyFileGroups = $config['proxyFileGroups'] ?? [];
        $forceAbsoluteUrl = $config['forceAbsoluteUrl'] ?? false;
        $minPage = $config['minPage'] ?? 1;
        $maxPage = $config['maxPage'] ?? $this->numPages;

        $result = [
            'pages' => [],
            'query' => [
                'minPage' => $minPage
            ]
        ];
        $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
        $fileGrpsImages = array_reverse(GeneralUtility::trimExplode(',', $extConf['fileGrpImages']));
        $fileGrpsFulltext = GeneralUtility::trimExplode(',', $extConf['fileGrpFulltext']);

        $allFiles = $this->getAllFiles();

        for ($page = $minPage; $page <= $maxPage; $page++) {
            $pageEntry = [
                'logSections' => array_merge(...$this->getLogicalSectionsOnPage($page)),
                'files' => [],
            ];

            foreach ($this->physicalStructureInfo[$this->physicalStructure[$page]]['files'] as $fileGrp => $fileId) {
                if ($allFiles === null) {
                    $file = [
                        'url' => $this->getFileLocation($fileId),
                        'mimetype' => $this->getFileMimeType($fileId),
                    ];
                } else {
                    $file = $allFiles[$fileId] ?? null;
                    if ($file === null) {
                        continue;
                    }
                }

                // Only deliver static images via the internal PageViewProxy.
                // (For IIP and IIIF, the viewer needs to build and access a separate metadata URL, see `getMetadataURL`.)
                if (in_array($fileGrp, $proxyFileGroups) && !in_array($file['mimetype'], self::$nonProxyMimeTypes)) {
                    // Configure @action URL for form.
                    $file['url'] = $uriBuilder
                        ->reset()
                        ->setTargetPageUid($GLOBALS['TSFE']->id)
                        ->setCreateAbsoluteUri($forceAbsoluteUrl)
                        ->setArguments([
                            'eID' => 'tx_dlf_pageview_proxy',
                            'url' => $file['url'],
                            'uHash' => GeneralUtility::hmac($file['url'], 'PageViewProxy')
                        ])
                        ->build();
                }

                $pageEntry['files'][$fileGrp] = $file;
            }

            $result['pages'][] = $pageEntry;
        }

        return $result;
    }
}
