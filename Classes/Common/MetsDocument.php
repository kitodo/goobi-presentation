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

use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\HiddenRestriction;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use Ubl\Iiif\Tools\IiifHelper;
use Ubl\Iiif\Services\AbstractImageService;
use TYPO3\CMS\Core\Log\LogManager;

/**
 * MetsDocument class for the 'dlf' extension.
 *
 * @author Sebastian Meyer <sebastian.meyer@slub-dresden.de>
 * @author Henrik Lochmann <dev@mentalmotive.com>
 * @package TYPO3
 * @subpackage dlf
 * @access public
 * @property int $cPid This holds the PID for the configuration
 * @property-read array $dmdSec This holds the XML file's dmdSec parts with their IDs as array key
 * @property-read array $fileGrps This holds the file ID -> USE concordance
 * @property-read bool $hasFulltext Are there any fulltext files available?
 * @property-read array $metadataArray This holds the documents' parsed metadata array
 * @property-read \SimpleXMLElement $mets This holds the XML file's METS part as \SimpleXMLElement object
 * @property-read int $numPages The holds the total number of pages
 * @property-read int $parentId This holds the UID of the parent document or zero if not multi-volumed
 * @property-read array $physicalStructure This holds the physical structure
 * @property-read array $physicalStructureInfo This holds the physical structure metadata
 * @property-read int $pid This holds the PID of the document or zero if not in database
 * @property-read bool $ready Is the document instantiated successfully?
 * @property-read string $recordId The METS file's / IIIF manifest's record identifier
 * @property-read int $rootId This holds the UID of the root document or zero if not multi-volumed
 * @property-read array $smLinks This holds the smLinks between logical and physical structMap
 * @property-read array $tableOfContents This holds the logical structure
 * @property-read string $thumbnail This holds the document's thumbnail location
 * @property-read string $toplevelId This holds the toplevel structure's @ID (METS) or the manifest's @id (IIIF)
 */
final class MetsDocument extends Doc
{
    /**
     * This holds the whole XML file as string for serialization purposes
     * @see __sleep() / __wakeup()
     *
     * @var string
     * @access protected
     */
    protected $asXML = '';

    /**
     * This holds the XML file's dmdSec parts with their IDs as array key
     *
     * @var array
     * @access protected
     */
    protected $dmdSec = [];

    /**
     * Are the METS file's dmdSecs loaded?
     * @see $dmdSec
     *
     * @var bool
     * @access protected
     */
    protected $dmdSecLoaded = false;

    /**
     * The extension key
     *
     * @var	string
     * @access public
     */
    public static $extKey = 'dlf';

    /**
     * This holds the file ID -> USE concordance
     * @see _getFileGrps()
     *
     * @var array
     * @access protected
     */
    protected $fileGrps = [];

    /**
     * Are the image file groups loaded?
     * @see $fileGrps
     *
     * @var bool
     * @access protected
     */
    protected $fileGrpsLoaded = false;

    /**
     * This holds the XML file's METS part as \SimpleXMLElement object
     *
     * @var \SimpleXMLElement
     * @access protected
     */
    protected $mets;

    /**
     * This holds the whole XML file as \SimpleXMLElement object
     *
     * @var \SimpleXMLElement
     * @access protected
     */
    protected $xml;

    /**
     * This adds metadata from METS structural map to metadata array.
     *
     * @access	public
     *
     * @param	array	&$metadata: The metadata array to extend
     * @param	string	$id: The "@ID" attribute of the logical structure node
     *
     * @return  void
     */
    public function addMetadataFromMets(&$metadata, $id)
    {
        $details = $this->getLogicalStructure($id);
        if (!empty($details)) {
            $metadata['mets_order'][0] = $details['order'];
            $metadata['mets_label'][0] = $details['label'];
            $metadata['mets_orderlabel'][0] = $details['orderlabel'];
        }
    }

    /**
     *
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::establishRecordId()
     */
    protected function establishRecordId($pid)
    {
        // Check for METS object @ID.
        if (!empty($this->mets['OBJID'])) {
            $this->recordId = (string) $this->mets['OBJID'];
        }
        // Get hook objects.
        $hookObjects = Helper::getHookObjects('Classes/Common/MetsDocument.php');
        // Apply hooks.
        foreach ($hookObjects as $hookObj) {
            if (method_exists($hookObj, 'construct_postProcessRecordId')) {
                $hookObj->construct_postProcessRecordId($this->xml, $this->recordId);
            }
        }
    }

    /**
     *
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::getDownloadLocation()
     */
    public function getDownloadLocation($id)
    {
        $fileMimeType = $this->getFileMimeType($id);
        $fileLocation = $this->getFileLocation($id);
        if ($fileMimeType === 'application/vnd.kitodo.iiif') {
            $fileLocation = (strrpos($fileLocation, 'info.json') === strlen($fileLocation) - 9) ? $fileLocation : (strrpos($fileLocation, '/') === strlen($fileLocation) ? $fileLocation . 'info.json' : $fileLocation . '/info.json');
            $conf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
            IiifHelper::setUrlReader(IiifUrlReader::getInstance());
            IiifHelper::setMaxThumbnailHeight($conf['iiifThumbnailHeight']);
            IiifHelper::setMaxThumbnailWidth($conf['iiifThumbnailWidth']);
            $service = IiifHelper::loadIiifResource($fileLocation);
            if ($service !== null && $service instanceof AbstractImageService) {
                return $service->getImageUrl();
            }
        } elseif ($fileMimeType === 'application/vnd.netfpx') {
            $baseURL = $fileLocation . (strpos($fileLocation, '?') === false ? '?' : '');
            // TODO CVT is an optional IIP server capability; in theory, capabilities should be determined in the object request with '&obj=IIP-server'
            return $baseURL . '&CVT=jpeg';
        }
        return $fileLocation;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::getFileLocation()
     */
    public function getFileLocation($id)
    {
        $location = $this->mets->xpath('./mets:fileSec/mets:fileGrp/mets:file[@ID="' . $id . '"]/mets:FLocat[@LOCTYPE="URL"]');
        if (
            !empty($id)
            && !empty($location)
        ) {
            return (string) $location[0]->attributes('http://www.w3.org/1999/xlink')->href;
        } else {
            $this->logger->warning('There is no file node with @ID "' . $id . '"');
            return '';
        }
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::getFileMimeType()
     */
    public function getFileMimeType($id)
    {
        $mimetype = $this->mets->xpath('./mets:fileSec/mets:fileGrp/mets:file[@ID="' . $id . '"]/@MIMETYPE');
        if (
            !empty($id)
            && !empty($mimetype)
        ) {
            return (string) $mimetype[0];
        } else {
            $this->logger->warning('There is no file node with @ID "' . $id . '" or no MIME type specified');
            return '';
        }
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::getLogicalStructure()
     */
    public function getLogicalStructure($id, $recursive = false)
    {
        $details = [];
        // Is the requested logical unit already loaded?
        if (
            !$recursive
            && !empty($this->logicalUnits[$id])
        ) {
            // Yes. Return it.
            return $this->logicalUnits[$id];
        } elseif (!empty($id)) {
            // Get specified logical unit.
            $divs = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]//mets:div[@ID="' . $id . '"]');
        } else {
            // Get all logical units at top level.
            $divs = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]/mets:div');
        }
        if (!empty($divs)) {
            if (!$recursive) {
                // Get the details for the first xpath hit.
                $details = $this->getLogicalStructureInfo($divs[0]);
            } else {
                // Walk the logical structure recursively and fill the whole table of contents.
                foreach ($divs as $div) {
                    $this->tableOfContents[] = $this->getLogicalStructureInfo($div, $recursive);
                }
            }
        }
        return $details;
    }

    /**
     * This gets details about a logical structure element
     *
     * @access protected
     *
     * @param \SimpleXMLElement $structure: The logical structure node
     * @param bool $recursive: Whether to include the child elements
     *
     * @return array Array of the element's id, label, type and physical page indexes/mptr link
     */
    protected function getLogicalStructureInfo(\SimpleXMLElement $structure, $recursive = false)
    {
        // Load plugin configuration.
        $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
        // Extract identity information.
        $details = $this->getLogicalStructureDetails($structure);
        // Load smLinks.
        $this->_getSmLinks();
        // Load physical structure.
        $this->_getPhysicalStructure();
        // Get the physical page or external file this structure element is pointing at.
        $details['points'] = '';
        // Is there a mptr node?
        if (count($structure->children('http://www.loc.gov/METS/')->mptr)) {
            // Yes. Get the file reference.
            $details['points'] = (string) $structure->children('http://www.loc.gov/METS/')->mptr[0]->attributes('http://www.w3.org/1999/xlink')->href;
        } elseif (
            !empty($this->physicalStructure)
            && array_key_exists($details['id'], $this->smLinks['l2p'])
        ) {
            // Link logical structure to the first corresponding physical page/track.
            $details['points'] = max(intval(array_search($this->smLinks['l2p'][$details['id']][0], $this->physicalStructure, true)), 1);
            $fileGrpsThumb = GeneralUtility::trimExplode(',', $extConf['fileGrpThumbs']);
            while ($fileGrpThumb = array_shift($fileGrpsThumb)) {
                if (!empty($this->physicalStructureInfo[$this->smLinks['l2p'][$details['id']][0]]['files'][$fileGrpThumb])) {
                    $details['thumbnailId'] = $this->physicalStructureInfo[$this->smLinks['l2p'][$details['id']][0]]['files'][$fileGrpThumb];
                    break;
                }
            }
            // Get page/track number of the first page/track related to this structure element.
            $details['pagination'] = $this->physicalStructureInfo[$this->smLinks['l2p'][$details['id']][0]]['orderlabel'];
        } elseif ($details['id'] == $this->_getToplevelId()) {
            // Point to self if this is the toplevel structure.
            $details['points'] = 1;
            $fileGrpsThumb = GeneralUtility::trimExplode(',', $extConf['fileGrpThumbs']);
            while ($fileGrpThumb = array_shift($fileGrpsThumb)) {
                if (
                    !empty($this->physicalStructure)
                    && !empty($this->physicalStructureInfo[$this->physicalStructure[1]]['files'][$fileGrpThumb])
                ) {
                    $details['thumbnailId'] = $this->physicalStructureInfo[$this->physicalStructure[1]]['files'][$fileGrpThumb];
                    break;
                }
            }
        }
        // Get the files this structure element is pointing at.
        $details['files'] = [];
        $fileUse = $this->_getFileGrps();
        // Get the file representations from fileSec node.
        foreach ($structure->children('http://www.loc.gov/METS/')->fptr as $fptr) {
            // Check if file has valid @USE attribute.
            if (!empty($fileUse[(string) $fptr->attributes()->FILEID])) {
                $details['files'][$fileUse[(string) $fptr->attributes()->FILEID]] = (string) $fptr->attributes()->FILEID;
            }
        }
        // Keep for later usage.
        $this->logicalUnits[$details['id']] = $details;
        // Walk the structure recursively? And are there any children of the current element?
        if (
            $recursive
            && count($structure->children('http://www.loc.gov/METS/')->div)
        ) {
            $details['children'] = [];
            foreach ($structure->children('http://www.loc.gov/METS/')->div as $child) {
                // Repeat for all children.
                $details['children'][] = $this->getLogicalStructureInfo($child, true);
            }
        }
        return $details;
    }

    /**
     * This gets basic details about a logical structure element
     *
     * @access protected
     *
     * @param \SimpleXMLElement $structure: The logical structure node
     *
     * @return array Array of the element's id, label, type and physical page indexes/mptr link
     */
    private function getLogicalStructureDetails(\SimpleXMLElement $structure) {
        // Get attributes.
        foreach ($structure->attributes() as $attribute => $value) {
            $attributes[$attribute] = (string) $value;
        }

        // Extract identity information.
        $details = [];
        $details['id'] = $attributes['ID'];
        $details['dmdId'] = (isset($attributes['DMDID']) ? $attributes['DMDID'] : '');
        $details['order'] = (isset($attributes['ORDER']) ? $attributes['ORDER'] : '');
        $details['label'] = (isset($attributes['LABEL']) ? $attributes['LABEL'] : '');
        $details['orderlabel'] = (isset($attributes['ORDERLABEL']) ? $attributes['ORDERLABEL'] : '');
        $details['contentIds'] = (isset($attributes['CONTENTIDS']) ? $attributes['CONTENTIDS'] : '');
        $details['volume'] = '';
        // Set volume information only if no label is set and this is the toplevel structure element.
        if (
            empty($details['label'])
            && $details['id'] == $this->_getToplevelId()
        ) {
            $metadata = $this->getMetadata($details['id']);
            if (!empty($metadata['volume'][0])) {
                $details['volume'] = $metadata['volume'][0];
            }
        }
        $details['pagination'] = '';
        $details['type'] = $attributes['TYPE'];
        $details['thumbnailId'] = '';
        return $details;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::getMetadata()
     */
    public function getMetadata($id, $cPid = 0)
    {
        // Make sure $cPid is a non-negative integer.
        $cPid = max(intval($cPid), 0);
        // If $cPid is not given, try to get it elsewhere.
        if (
            !$cPid
            && ($this->cPid || $this->pid)
        ) {
            // Retain current PID.
            $cPid = ($this->cPid ? $this->cPid : $this->pid);
        } elseif (!$cPid) {
            $this->logger->warning('Invalid PID ' . $cPid . ' for metadata definitions');
            return [];
        }
        // Get metadata from parsed metadata array if available.
        if (
            !empty($this->metadataArray[$id])
            && $this->metadataArray[0] == $cPid
        ) {
            return $this->metadataArray[$id];
        }
        // Initialize metadata array with empty values.
        $metadata = [
            'title' => [],
            'title_sorting' => [],
            'author' => [],
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
            'license' => [],
            'terms' => [],
            'restrictions' => [],
            'out_of_print' => [],
            'rights_info' => [],
            'collection' => [],
            'owner' => [],
            'mets_label' => [],
            'mets_orderlabel' => [],
            'document_format' => ['METS'],
        ];
        // Get the logical structure node's @DMDID.
        if (!empty($this->logicalUnits[$id])) {
            $dmdIds = $this->logicalUnits[$id]['dmdId'];
        } else {
            $dmdIds = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]//mets:div[@ID="' . $id . '"]/@DMDID');
            $dmdIds = (string) $dmdIds[0];
        }
        if (!empty($dmdIds)) {
            // Handle multiple DMDIDs separately.
            $dmdIds = explode(' ', $dmdIds);
            $hasSupportedMetadata = false;
        } else {
            // There is no dmdSec for this structure node.
            return [];
        }
        // Load available metadata formats and dmdSecs.
        $this->loadFormats();
        $this->_getDmdSec();
        foreach ($dmdIds as $dmdId) {
            // Is this metadata format supported?
            if (!empty($this->formats[$this->dmdSec[$dmdId]['type']])) {
                if (!empty($this->formats[$this->dmdSec[$dmdId]['type']]['class'])) {
                    $class = $this->formats[$this->dmdSec[$dmdId]['type']]['class'];
                    // Get the metadata from class.
                    if (
                        class_exists($class)
                        && ($obj = GeneralUtility::makeInstance($class)) instanceof MetadataInterface
                    ) {
                        $obj->extractMetadata($this->dmdSec[$dmdId]['xml'], $metadata);
                    } else {
                        $this->logger->warning('Invalid class/method "' . $class . '->extractMetadata()" for metadata format "' . $this->dmdSec[$dmdId]['type'] . '"');
                    }
                }
            } else {
                $this->logger->notice('Unsupported metadata format "' . $this->dmdSec[$dmdId]['type'] . '" in dmdSec with @ID "' . $dmdId . '"');
                // Continue searching for supported metadata with next @DMDID.
                continue;
            }
            // Get the structure's type.
            if (!empty($this->logicalUnits[$id])) {
                $metadata['type'] = [$this->logicalUnits[$id]['type']];
            } else {
                $struct = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]//mets:div[@ID="' . $id . '"]/@TYPE');
                if (!empty($struct)) {
                    $metadata['type'] = [(string) $struct[0]];
                }
            }
            // Get the additional metadata from database.
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_metadata');
            // Get hidden records, too.
            $queryBuilder
                ->getRestrictions()
                ->removeByType(HiddenRestriction::class);
            // Get all metadata with configured xpath and applicable format first.
            $resultWithFormat = $queryBuilder
                ->select(
                    'tx_dlf_metadata.index_name AS index_name',
                    'tx_dlf_metadataformat_joins.xpath AS xpath',
                    'tx_dlf_metadataformat_joins.xpath_sorting AS xpath_sorting',
                    'tx_dlf_metadata.is_sortable AS is_sortable',
                    'tx_dlf_metadata.default_value AS default_value',
                    'tx_dlf_metadata.format AS format'
                )
                ->from('tx_dlf_metadata')
                ->innerJoin(
                    'tx_dlf_metadata',
                    'tx_dlf_metadataformat',
                    'tx_dlf_metadataformat_joins',
                    $queryBuilder->expr()->eq(
                        'tx_dlf_metadataformat_joins.parent_id',
                        'tx_dlf_metadata.uid'
                    )
                )
                ->innerJoin(
                    'tx_dlf_metadataformat_joins',
                    'tx_dlf_formats',
                    'tx_dlf_formats_joins',
                    $queryBuilder->expr()->eq(
                        'tx_dlf_formats_joins.uid',
                        'tx_dlf_metadataformat_joins.encoded'
                    )
                )
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_metadata.pid', intval($cPid)),
                    $queryBuilder->expr()->eq('tx_dlf_metadata.l18n_parent', 0),
                    $queryBuilder->expr()->eq('tx_dlf_metadataformat_joins.pid', intval($cPid)),
                    $queryBuilder->expr()->eq('tx_dlf_formats_joins.type', $queryBuilder->createNamedParameter($this->dmdSec[$dmdId]['type']))
                )
                ->execute();
            // Get all metadata without a format, but with a default value next.
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_metadata');
            // Get hidden records, too.
            $queryBuilder
                ->getRestrictions()
                ->removeByType(HiddenRestriction::class);
            $resultWithoutFormat = $queryBuilder
                ->select(
                    'tx_dlf_metadata.index_name AS index_name',
                    'tx_dlf_metadata.is_sortable AS is_sortable',
                    'tx_dlf_metadata.default_value AS default_value',
                    'tx_dlf_metadata.format AS format'
                )
                ->from('tx_dlf_metadata')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_metadata.pid', intval($cPid)),
                    $queryBuilder->expr()->eq('tx_dlf_metadata.l18n_parent', 0),
                    $queryBuilder->expr()->eq('tx_dlf_metadata.format', 0),
                    $queryBuilder->expr()->neq('tx_dlf_metadata.default_value', $queryBuilder->createNamedParameter(''))
                )
                ->execute();
            // Merge both result sets.
            $allResults = array_merge($resultWithFormat->fetchAll(), $resultWithoutFormat->fetchAll());
            // We need a \DOMDocument here, because SimpleXML doesn't support XPath functions properly.
            $domNode = dom_import_simplexml($this->dmdSec[$dmdId]['xml']);
            $domXPath = new \DOMXPath($domNode->ownerDocument);
            $this->registerNamespaces($domXPath);
            // OK, now make the XPath queries.
            foreach ($allResults as $resArray) {
                // Set metadata field's value(s).
                if (
                    $resArray['format'] > 0
                    && !empty($resArray['xpath'])
                    && ($values = $domXPath->evaluate($resArray['xpath'], $domNode))
                ) {
                    if (
                        $values instanceof \DOMNodeList
                        && $values->length > 0
                    ) {
                        $metadata[$resArray['index_name']] = [];
                        foreach ($values as $value) {
                            $metadata[$resArray['index_name']][] = trim((string) $value->nodeValue);
                        }
                    } elseif (!($values instanceof \DOMNodeList)) {
                        $metadata[$resArray['index_name']] = [trim((string) $values)];
                    }
                }
                // Set default value if applicable.
                if (
                    empty($metadata[$resArray['index_name']][0])
                    && strlen($resArray['default_value']) > 0
                ) {
                    $metadata[$resArray['index_name']] = [$resArray['default_value']];
                }
                // Set sorting value if applicable.
                if (
                    !empty($metadata[$resArray['index_name']])
                    && $resArray['is_sortable']
                ) {
                    if (
                        $resArray['format'] > 0
                        && !empty($resArray['xpath_sorting'])
                        && ($values = $domXPath->evaluate($resArray['xpath_sorting'], $domNode))
                    ) {
                        if (
                            $values instanceof \DOMNodeList
                            && $values->length > 0
                        ) {
                            $metadata[$resArray['index_name'] . '_sorting'][0] = trim((string) $values->item(0)->nodeValue);
                        } elseif (!($values instanceof \DOMNodeList)) {
                            $metadata[$resArray['index_name'] . '_sorting'][0] = trim((string) $values);
                        }
                    }
                    if (empty($metadata[$resArray['index_name'] . '_sorting'][0])) {
                        $metadata[$resArray['index_name'] . '_sorting'][0] = $metadata[$resArray['index_name']][0];
                    }
                }
            }
            // Set title to empty string if not present.
            if (empty($metadata['title'][0])) {
                $metadata['title'][0] = '';
                $metadata['title_sorting'][0] = '';
            }
            // Extract metadata only from first supported dmdSec.
            $hasSupportedMetadata = true;
            break;
        }
        if ($hasSupportedMetadata) {
            return $metadata;
        } else {
            $this->logger->warning('No supported metadata found for logical structure with @ID "' . $id . '"');
            return [];
        }
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::getFullText()
     */
    public function getFullText($id)
    {
        $fullText = '';

        // Load fileGrps and check for full text files.
        $this->_getFileGrps();
        if ($this->hasFulltext) {
            $fullText = $this->getFullTextFromXml($id);
        }
        return $fullText;
    }

    /**
     * {@inheritDoc}
     * @see Doc::getStructureDepth()
     */
    public function getStructureDepth($logId)
    {
        $ancestors = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]//mets:div[@ID="' . $logId . '"]/ancestor::*');
        if (!empty($ancestors)) {
            return count($ancestors);
        } else {
            return 0;
        }
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::init()
     */
    protected function init($location)
    {
        $this->logger = GeneralUtility::makeInstance(LogManager::class)->getLogger(get_class($this));
        // Get METS node from XML file.
        $this->registerNamespaces($this->xml);
        $mets = $this->xml->xpath('//mets:mets');
        if (!empty($mets)) {
            $this->mets = $mets[0];
            // Register namespaces.
            $this->registerNamespaces($this->mets);
        } else {
            if (!empty($location)) {
                $this->logger->error('No METS part found in document with location "' . $location . '".');
            } else if (!empty($this->recordId)) {
                $this->logger->error('No METS part found in document with recordId "' . $this->recordId . '".');
            } else {
                $this->logger->error('No METS part found in current document.');
            }
        }
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::loadLocation()
     */
    protected function loadLocation($location)
    {
        $fileResource = Helper::getUrl($location);
        if ($fileResource !== false) {
            $xml = Helper::getXmlFileAsString($fileResource);
            // Set some basic properties.
            if ($xml !== false) {
                $this->xml = $xml;
                return true;
            }
        }
        $this->logger->error('Could not load XML file from "' . $location . '"');
        return false;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::ensureHasFulltextIsSet()
     */
    protected function ensureHasFulltextIsSet()
    {
        // Are the fileGrps already loaded?
        if (!$this->fileGrpsLoaded) {
            $this->_getFileGrps();
        }
    }

    /**
     * {@inheritDoc}
     * @see Doc::setPreloadedDocument()
     */
    protected function setPreloadedDocument($preloadedDocument)
    {

        if ($preloadedDocument instanceof \SimpleXMLElement) {
            $this->xml = $preloadedDocument;
            return true;
        }
        return false;
    }

    /**
     * {@inheritDoc}
     * @see Doc::getDocument()
     */
    protected function getDocument()
    {
        return $this->mets;
    }

    /**
     * This builds an array of the document's dmdSecs
     *
     * @access protected
     *
     * @return array Array of dmdSecs with their IDs as array key
     */
    protected function _getDmdSec()
    {
        if (!$this->dmdSecLoaded) {
            // Get available data formats.
            $this->loadFormats();
            // Get dmdSec nodes from METS.
            $dmdIds = $this->mets->xpath('./mets:dmdSec/@ID');
            if (!empty($dmdIds)) {
                foreach ($dmdIds as $dmdId) {
                    if ($type = $this->mets->xpath('./mets:dmdSec[@ID="' . (string) $dmdId . '"]/mets:mdWrap[not(@MDTYPE="OTHER")]/@MDTYPE')) {
                        if (!empty($this->formats[(string) $type[0]])) {
                            $type = (string) $type[0];
                            $xml = $this->mets->xpath('./mets:dmdSec[@ID="' . (string) $dmdId . '"]/mets:mdWrap[@MDTYPE="' . $type . '"]/mets:xmlData/' . strtolower($type) . ':' . $this->formats[$type]['rootElement']);
                        }
                    } elseif ($type = $this->mets->xpath('./mets:dmdSec[@ID="' . (string) $dmdId . '"]/mets:mdWrap[@MDTYPE="OTHER"]/@OTHERMDTYPE')) {
                        if (!empty($this->formats[(string) $type[0]])) {
                            $type = (string) $type[0];
                            $xml = $this->mets->xpath('./mets:dmdSec[@ID="' . (string) $dmdId . '"]/mets:mdWrap[@MDTYPE="OTHER"][@OTHERMDTYPE="' . $type . '"]/mets:xmlData/' . strtolower($type) . ':' . $this->formats[$type]['rootElement']);
                        }
                    }
                    if (!empty($xml)) {
                        $this->dmdSec[(string) $dmdId]['type'] = $type;
                        $this->dmdSec[(string) $dmdId]['xml'] = $xml[0];
                        $this->registerNamespaces($this->dmdSec[(string) $dmdId]['xml']);
                    }
                }
            }
            $this->dmdSecLoaded = true;
        }
        return $this->dmdSec;
    }

    /**
     * This builds the file ID -> USE concordance
     *
     * @access protected
     *
     * @return array Array of file use groups with file IDs
     */
    protected function _getFileGrps()
    {
        if (!$this->fileGrpsLoaded) {
            // Get configured USE attributes.
            $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
            $useGrps = GeneralUtility::trimExplode(',', $extConf['fileGrpImages']);
            if (!empty($extConf['fileGrpThumbs'])) {
                $useGrps = array_merge($useGrps, GeneralUtility::trimExplode(',', $extConf['fileGrpThumbs']));
            }
            if (!empty($extConf['fileGrpDownload'])) {
                $useGrps = array_merge($useGrps, GeneralUtility::trimExplode(',', $extConf['fileGrpDownload']));
            }
            if (!empty($extConf['fileGrpFulltext'])) {
                $useGrps = array_merge($useGrps, GeneralUtility::trimExplode(',', $extConf['fileGrpFulltext']));
            }
            if (!empty($extConf['fileGrpAudio'])) {
                $useGrps = array_merge($useGrps, GeneralUtility::trimExplode(',', $extConf['fileGrpAudio']));
            }
            // Get all file groups.
            $fileGrps = $this->mets->xpath('./mets:fileSec/mets:fileGrp');
            if (!empty($fileGrps)) {
                // Build concordance for configured USE attributes.
                foreach ($fileGrps as $fileGrp) {
                    if (in_array((string) $fileGrp['USE'], $useGrps)) {
                        foreach ($fileGrp->children('http://www.loc.gov/METS/')->file as $file) {
                            $this->fileGrps[(string) $file->attributes()->ID] = (string) $fileGrp['USE'];
                        }
                    }
                }
            }
            // Are there any fulltext files available?
            if (
                !empty($extConf['fileGrpFulltext'])
                && array_intersect(GeneralUtility::trimExplode(',', $extConf['fileGrpFulltext']), $this->fileGrps) !== []
            ) {
                $this->hasFulltext = true;
            }
            $this->fileGrpsLoaded = true;
        }
        return $this->fileGrps;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::prepareMetadataArray()
     */
    protected function prepareMetadataArray($cPid)
    {
        $ids = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]//mets:div[@DMDID]/@ID');
        // Get all logical structure nodes with metadata.
        if (!empty($ids)) {
            foreach ($ids as $id) {
                $this->metadataArray[(string) $id] = $this->getMetadata((string) $id, $cPid);
            }
        }
        // Set current PID for metadata definitions.
    }

    /**
     * This returns $this->mets via __get()
     *
     * @access protected
     *
     * @return \SimpleXMLElement The XML's METS part as \SimpleXMLElement object
     */
    protected function _getMets()
    {
        return $this->mets;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::_getPhysicalStructure()
     */
    protected function _getPhysicalStructure()
    {
        // Is there no physical structure array yet?
        if (!$this->physicalStructureLoaded) {
            // Does the document have a structMap node of type "PHYSICAL"?
            $elementNodes = $this->mets->xpath('./mets:structMap[@TYPE="PHYSICAL"]/mets:div[@TYPE="physSequence"]/mets:div');
            if (!empty($elementNodes)) {
                // Get file groups.
                $fileUse = $this->_getFileGrps();
                // Get the physical sequence's metadata.
                $physNode = $this->mets->xpath('./mets:structMap[@TYPE="PHYSICAL"]/mets:div[@TYPE="physSequence"]');
                $physSeq[0] = (string) $physNode[0]['ID'];
                $this->physicalStructureInfo[$physSeq[0]]['id'] = (string) $physNode[0]['ID'];
                $this->physicalStructureInfo[$physSeq[0]]['dmdId'] = (isset($physNode[0]['DMDID']) ? (string) $physNode[0]['DMDID'] : '');
                $this->physicalStructureInfo[$physSeq[0]]['order'] = (isset($physNode[0]['ORDER']) ? (string) $physNode[0]['ORDER'] : '');
                $this->physicalStructureInfo[$physSeq[0]]['label'] = (isset($physNode[0]['LABEL']) ? (string) $physNode[0]['LABEL'] : '');
                $this->physicalStructureInfo[$physSeq[0]]['orderlabel'] = (isset($physNode[0]['ORDERLABEL']) ? (string) $physNode[0]['ORDERLABEL'] : '');
                $this->physicalStructureInfo[$physSeq[0]]['type'] = (string) $physNode[0]['TYPE'];
                $this->physicalStructureInfo[$physSeq[0]]['contentIds'] = (isset($physNode[0]['CONTENTIDS']) ? (string) $physNode[0]['CONTENTIDS'] : '');
                // Get the file representations from fileSec node.
                foreach ($physNode[0]->children('http://www.loc.gov/METS/')->fptr as $fptr) {
                    // Check if file has valid @USE attribute.
                    if (!empty($fileUse[(string) $fptr->attributes()->FILEID])) {
                        $this->physicalStructureInfo[$physSeq[0]]['files'][$fileUse[(string) $fptr->attributes()->FILEID]] = (string) $fptr->attributes()->FILEID;
                    }
                }
                // Build the physical elements' array from the physical structMap node.
                foreach ($elementNodes as $elementNode) {
                    $elements[(int) $elementNode['ORDER']] = (string) $elementNode['ID'];
                    $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['id'] = (string) $elementNode['ID'];
                    $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['dmdId'] = (isset($elementNode['DMDID']) ? (string) $elementNode['DMDID'] : '');
                    $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['order'] = (isset($elementNode['ORDER']) ? (string) $elementNode['ORDER'] : '');
                    $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['label'] = (isset($elementNode['LABEL']) ? (string) $elementNode['LABEL'] : '');
                    $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['orderlabel'] = (isset($elementNode['ORDERLABEL']) ? (string) $elementNode['ORDERLABEL'] : '');
                    $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['type'] = (string) $elementNode['TYPE'];
                    $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['contentIds'] = (isset($elementNode['CONTENTIDS']) ? (string) $elementNode['CONTENTIDS'] : '');
                    // Get the file representations from fileSec node.
                    foreach ($elementNode->children('http://www.loc.gov/METS/')->fptr as $fptr) {
                        // Check if file has valid @USE attribute.
                        if (!empty($fileUse[(string) $fptr->attributes()->FILEID])) {
                            $this->physicalStructureInfo[$elements[(int) $elementNode['ORDER']]]['files'][$fileUse[(string) $fptr->attributes()->FILEID]] = (string) $fptr->attributes()->FILEID;
                        }
                    }
                }
                // Sort array by keys (= @ORDER).
                if (ksort($elements)) {
                    // Set total number of pages/tracks.
                    $this->numPages = count($elements);
                    // Merge and re-index the array to get nice numeric indexes.
                    $this->physicalStructure = array_merge($physSeq, $elements);
                }
            }
            $this->physicalStructureLoaded = true;
        }
        return $this->physicalStructure;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::_getSmLinks()
     */
    protected function _getSmLinks()
    {
        if (!$this->smLinksLoaded) {
            $smLinks = $this->mets->xpath('./mets:structLink/mets:smLink');
            if (!empty($smLinks)) {
                foreach ($smLinks as $smLink) {
                    $this->smLinks['l2p'][(string) $smLink->attributes('http://www.w3.org/1999/xlink')->from][] = (string) $smLink->attributes('http://www.w3.org/1999/xlink')->to;
                    $this->smLinks['p2l'][(string) $smLink->attributes('http://www.w3.org/1999/xlink')->to][] = (string) $smLink->attributes('http://www.w3.org/1999/xlink')->from;
                }
            }
            $this->smLinksLoaded = true;
        }
        return $this->smLinks;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::_getThumbnail()
     */
    protected function _getThumbnail($forceReload = false)
    {
        if (
            !$this->thumbnailLoaded
            || $forceReload
        ) {
            // Retain current PID.
            $cPid = ($this->cPid ? $this->cPid : $this->pid);
            if (!$cPid) {
                $this->logger->error('Invalid PID ' . $cPid . ' for structure definitions');
                $this->thumbnailLoaded = true;
                return $this->thumbnail;
            }
            // Load extension configuration.
            $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get(self::$extKey);
            if (empty($extConf['fileGrpThumbs'])) {
                $this->logger->warning('No fileGrp for thumbnails specified');
                $this->thumbnailLoaded = true;
                return $this->thumbnail;
            }
            $strctId = $this->_getToplevelId();
            $metadata = $this->getTitledata($cPid);

            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_structures');

            // Get structure element to get thumbnail from.
            $result = $queryBuilder
                ->select('tx_dlf_structures.thumbnail AS thumbnail')
                ->from('tx_dlf_structures')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_structures.pid', intval($cPid)),
                    $queryBuilder->expr()->eq('tx_dlf_structures.index_name', $queryBuilder->expr()->literal($metadata['type'][0])),
                    Helper::whereExpression('tx_dlf_structures')
                )
                ->setMaxResults(1)
                ->execute();

            $allResults = $result->fetchAll();

            if (count($allResults) == 1) {
                $resArray = $allResults[0];
                // Get desired thumbnail structure if not the toplevel structure itself.
                if (!empty($resArray['thumbnail'])) {
                    $strctType = Helper::getIndexNameFromUid($resArray['thumbnail'], 'tx_dlf_structures', $cPid);
                    // Check if this document has a structure element of the desired type.
                    $strctIds = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]//mets:div[@TYPE="' . $strctType . '"]/@ID');
                    if (!empty($strctIds)) {
                        $strctId = (string) $strctIds[0];
                    }
                }
                // Load smLinks.
                $this->_getSmLinks();
                // Get thumbnail location.
                $fileGrpsThumb = GeneralUtility::trimExplode(',', $extConf['fileGrpThumbs']);
                while ($fileGrpThumb = array_shift($fileGrpsThumb)) {
                    if (
                        $this->_getPhysicalStructure()
                        && !empty($this->smLinks['l2p'][$strctId])
                        && !empty($this->physicalStructureInfo[$this->smLinks['l2p'][$strctId][0]]['files'][$fileGrpThumb])
                    ) {
                        $this->thumbnail = $this->getFileLocation($this->physicalStructureInfo[$this->smLinks['l2p'][$strctId][0]]['files'][$fileGrpThumb]);
                        break;
                    } elseif (!empty($this->physicalStructureInfo[$this->physicalStructure[1]]['files'][$fileGrpThumb])) {
                        $this->thumbnail = $this->getFileLocation($this->physicalStructureInfo[$this->physicalStructure[1]]['files'][$fileGrpThumb]);
                        break;
                    }
                }
            } else {
                $this->logger->error('No structure of type "' . $metadata['type'][0] . '" found in database');
            }
            $this->thumbnailLoaded = true;
        }
        return $this->thumbnail;
    }

    /**
     * {@inheritDoc}
     * @see \Kitodo\Dlf\Common\Doc::_getToplevelId()
     */
    protected function _getToplevelId()
    {
        if (empty($this->toplevelId)) {
            // Get all logical structure nodes with metadata, but without associated METS-Pointers.
            $divs = $this->mets->xpath('./mets:structMap[@TYPE="LOGICAL"]//mets:div[@DMDID and not(./mets:mptr)]');
            if (!empty($divs)) {
                // Load smLinks.
                $this->_getSmLinks();
                foreach ($divs as $div) {
                    $id = (string) $div['ID'];
                    // Are there physical structure nodes for this logical structure?
                    if (array_key_exists($id, $this->smLinks['l2p'])) {
                        // Yes. That's what we're looking for.
                        $this->toplevelId = $id;
                        break;
                    } elseif (empty($this->toplevelId)) {
                        // No. Remember this anyway, but keep looking for a better one.
                        $this->toplevelId = $id;
                    }
                }
            }
        }
        return $this->toplevelId;
    }

    /**
     * This magic method is executed prior to any serialization of the object
     * @see __wakeup()
     *
     * @access public
     *
     * @return array Properties to be serialized
     */
    public function __sleep()
    {
        // \SimpleXMLElement objects can't be serialized, thus save the XML as string for serialization
        $this->asXML = $this->xml->asXML();
        return ['uid', 'pid', 'recordId', 'parentId', 'asXML'];
    }

    /**
     * This magic method is used for setting a string value for the object
     *
     * @access public
     *
     * @return string String representing the METS object
     */
    public function __toString()
    {
        $xml = new \DOMDocument('1.0', 'utf-8');
        $xml->appendChild($xml->importNode(dom_import_simplexml($this->mets), true));
        $xml->formatOutput = true;
        return $xml->saveXML();
    }

    /**
     * This magic method is executed after the object is deserialized
     * @see __sleep()
     *
     * @access public
     *
     * @return void
     */
    public function __wakeup()
    {
        $xml = Helper::getXmlFileAsString($this->asXML);
        if ($xml !== false) {
            $this->asXML = '';
            $this->xml = $xml;
            // Rebuild the unserializable properties.
            $this->init('');
        } else {
            $this->logger = GeneralUtility::makeInstance(LogManager::class)->getLogger(static::class);
            $this->logger->error('Could not load XML after deserialization');
        }
    }
}
