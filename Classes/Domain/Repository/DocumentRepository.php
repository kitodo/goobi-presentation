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

namespace Kitodo\Dlf\Domain\Repository;

use Doctrine\DBAL\Result;
use Kitodo\Dlf\Common\AbstractDocument;
use Kitodo\Dlf\Common\Helper;
use Kitodo\Dlf\Common\Solr\SolrSearch;
use Kitodo\Dlf\Domain\Model\Collection;
use Kitodo\Dlf\Domain\Model\Document;
use Kitodo\Dlf\Domain\Model\Structure;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;
use TYPO3\CMS\Extbase\Persistence\Generic\QueryResult;
use TYPO3\CMS\Extbase\Persistence\Repository;
use TYPO3\CMS\Extbase\Persistence\QueryInterface;
use TYPO3\CMS\Extbase\Persistence\QueryResultInterface;

/**
 * Document repository.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class DocumentRepository extends Repository
{
    /**
     * @access protected
     * @var array The controller settings passed to the repository for some special actions.
     */
    protected $settings;

    /**
     * Find one document by given parameters
     *
     * GET parameters may be:
     *
     * - 'id': the uid of the document
     * - 'location': the URL of the location of the XML file
     * - 'recordId': the record_id of the document
     *
     * Currently used by EXT:slub_digitalcollections
     *
     * @access public
     *
     * @param array $parameters
     *
     * @return Document|null
     */
    public function findOneByParameters($parameters)
    {
        $doc = null;
        $document = null;

        if (isset($parameters['id']) && MathUtility::canBeInterpretedAsInteger($parameters['id'])) {

            $document = $this->findOneByIdAndSettings($parameters['id']);

        } else if (isset($parameters['recordId'])) {

            $document = $this->findOneByRecordId($parameters['recordId']);

        } else if (isset($parameters['location']) && GeneralUtility::isValidUrl($parameters['location'])) {

            $doc = AbstractDocument::getInstance($parameters['location'], [], true);

            if ($doc->recordId) {
                $document = $this->findOneByRecordId($doc->recordId);
            }

            if ($document === null) {
                // create new (dummy) Document object
                $document = GeneralUtility::makeInstance(Document::class);
                $document->setLocation($parameters['location']);
            }

        }

        if ($document !== null && $doc === null) {
            $doc = AbstractDocument::getInstance($document->getLocation(), [], true);
        }

        if ($doc !== null) {
            $document->setCurrentDocument($doc);
        }

        return $document;
    }

    /**
     * Find the oldest document
     *
     * @access public
     *
     * @return Document|null
     */
    public function findOldestDocument()
    {
        $query = $this->createQuery();

        $query->setOrderings(['tstamp' => QueryInterface::ORDER_ASCENDING]);
        $query->setLimit(1);

        return $query->execute()->getFirst();
    }

    /**
     * @access public
     *
     * @param int $partOf
     * @param Structure $structure
     *
     * @return array|\TYPO3\CMS\Extbase\Persistence\QueryResultInterface
     */
    public function getChildrenOfYearAnchor($partOf, $structure)
    {
        $query = $this->createQuery();

        $query->matching($query->equals('structure', $structure));
        $query->matching($query->equals('partof', $partOf));

        $query->setOrderings([
            'mets_orderlabel' => QueryInterface::ORDER_ASCENDING
        ]);

        return $query->execute();
    }

    /**
     * Finds all documents for the given settings
     *
     * @access public
     *
     * @param int $uid
     * @param array $settings
     *
     * @return Document|null
     */
    public function findOneByIdAndSettings($uid, $settings = [])
    {
        $settings = ['documentSets' => $uid];

        return $this->findDocumentsBySettings($settings)->getFirst();
    }

    /**
     * Finds all documents for the given settings
     *
     * @access public
     *
     * @param array $settings
     *
     * @return array|\TYPO3\CMS\Extbase\Persistence\QueryResultInterface
     */
    public function findDocumentsBySettings($settings = [])
    {
        $query = $this->createQuery();

        $constraints = [];

        if ($settings['documentSets'] ?? false) {
            $constraints[] = $query->in('uid', GeneralUtility::intExplode(',', ((string) $settings['documentSets'])));
        }

        if (isset($settings['excludeOther']) && (int) $settings['excludeOther'] === 0) {
            $query->getQuerySettings()->setRespectStoragePage(false);
        }

        if (count($constraints)) {
            $query->matching(
                $query->logicalAnd(...$constraints)
            );
        }

        return $query->execute();
    }

    /**
     * Finds all documents for the given collections and conditions
     *
     * @access public
     *
     * @param array $collections
     * @param int $limit
     * @param int $offset
     *
     * @return array|\TYPO3\CMS\Extbase\Persistence\QueryResultInterface
     */
    public function findAllByCollectionsLimited($collections, int $limit = 50, int $offset = 0)
    {
        $query = $this->createQuery();

        // order by start_date -> start_time...
        $query->setOrderings(
            ['tstamp' => QueryInterface::ORDER_DESCENDING]
        );

        $constraints = [];
        if ($collections) {
            $constraints[] = $query->in('collections.uid', $collections);
        }

        if (count($constraints)) {
            $query->matching(
                $query->logicalAnd(...$constraints)
            );
        }

        if ($limit > 0) {
            $query->setLimit((int) $limit);
            $query->setOffset($offset);
        }

        return $query->execute();
    }

    /**
     * Count the titles and volumes for statistics
     *
     * Volumes are documents that are both
     *  a) "leaf" elements i.e. partof != 0
     *  b) "root" elements that are not referenced by other documents ("root" elements that have no descendants)
     *
     * @access public
     *
     * @param array $settings
     *
     * @return array
     */
    public function getStatisticsForSelectedCollection($settings)
    {
        if ($settings['collections']) {
            // Include only selected collections.
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
            ->getQueryBuilderForTable('tx_dlf_documents');

            $countTitles = $queryBuilder
                ->count('tx_dlf_documents.uid')
                ->from('tx_dlf_documents')
                ->innerJoin(
                    'tx_dlf_documents',
                    'tx_dlf_relations',
                    'tx_dlf_relations_joins',
                    $queryBuilder->expr()->eq(
                        'tx_dlf_relations_joins.uid_local',
                        'tx_dlf_documents.uid'
                    )
                )
                ->innerJoin(
                    'tx_dlf_relations_joins',
                    'tx_dlf_collections',
                    'tx_dlf_collections_join',
                    $queryBuilder->expr()->eq(
                        'tx_dlf_relations_joins.uid_foreign',
                        'tx_dlf_collections_join.uid'
                    )
                )
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_documents.pid', intval($settings['storagePid'])),
                    $queryBuilder->expr()->eq('tx_dlf_collections_join.pid', intval($settings['storagePid'])),
                    $queryBuilder->expr()->eq('tx_dlf_documents.partof', 0),
                    $queryBuilder->expr()->in('tx_dlf_collections_join.uid', $queryBuilder->createNamedParameter(GeneralUtility::intExplode(',', $settings['collections']), Connection::PARAM_INT_ARRAY)),
                    $queryBuilder->expr()->eq('tx_dlf_relations_joins.ident', $queryBuilder->createNamedParameter('docs_colls'))
                )
                ->execute()
                ->fetchFirstColumn();

                $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                    ->getQueryBuilderForTable('tx_dlf_documents');
                $subQueryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                    ->getQueryBuilderForTable('tx_dlf_documents');

                $subQuery = $subQueryBuilder
                    ->select('tx_dlf_documents.partof')
                    ->from('tx_dlf_documents')
                    ->where(
                        $subQueryBuilder->expr()->neq('tx_dlf_documents.partof', 0)
                    )
                    ->groupBy('tx_dlf_documents.partof')
                    ->getSQL();

                $countVolumes = $queryBuilder
                    ->count('tx_dlf_documents.uid')
                    ->from('tx_dlf_documents')
                    ->innerJoin(
                        'tx_dlf_documents',
                        'tx_dlf_relations',
                        'tx_dlf_relations_joins',
                        $queryBuilder->expr()->eq(
                            'tx_dlf_relations_joins.uid_local',
                            'tx_dlf_documents.uid'
                        )
                    )
                    ->innerJoin(
                        'tx_dlf_relations_joins',
                        'tx_dlf_collections',
                        'tx_dlf_collections_join',
                        $queryBuilder->expr()->eq(
                            'tx_dlf_relations_joins.uid_foreign',
                            'tx_dlf_collections_join.uid'
                        )
                    )
                    ->where(
                        $queryBuilder->expr()->eq('tx_dlf_documents.pid', intval($settings['storagePid'])),
                        $queryBuilder->expr()->eq('tx_dlf_collections_join.pid', intval($settings['storagePid'])),
                        $queryBuilder->expr()->notIn('tx_dlf_documents.uid', $subQuery),
                        $queryBuilder->expr()->in('tx_dlf_collections_join.uid', $queryBuilder->createNamedParameter(GeneralUtility::intExplode(',', $settings['collections']), Connection::PARAM_INT_ARRAY)),
                        $queryBuilder->expr()->eq('tx_dlf_relations_joins.ident', $queryBuilder->createNamedParameter('docs_colls'))
                    )
                    ->execute()
                    ->fetchFirstColumn();
        } else {
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_documents');

            // Include all collections.
            $countTitles = $queryBuilder
                ->count('tx_dlf_documents.uid')
                ->from('tx_dlf_documents')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_documents.pid', intval($settings['storagePid'])),
                    $queryBuilder->expr()->eq('tx_dlf_documents.partof', 0),
                    Helper::whereExpression('tx_dlf_documents')
                )
                ->execute()
                ->fetchFirstColumn();

            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_documents');
            $subQueryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_documents');

            $subQuery = $subQueryBuilder
                ->select('tx_dlf_documents.partof')
                ->from('tx_dlf_documents')
                ->where(
                    $subQueryBuilder->expr()->neq('tx_dlf_documents.partof', 0)
                )
                ->groupBy('tx_dlf_documents.partof')
                ->getSQL();

            $countVolumes = $queryBuilder
                ->count('tx_dlf_documents.uid')
                ->from('tx_dlf_documents')
                ->where(
                    $queryBuilder->expr()->eq('tx_dlf_documents.pid', intval($settings['storagePid'])),
                    $queryBuilder->expr()->notIn('tx_dlf_documents.uid', $subQuery)
                )
                ->execute()
                ->fetchFirstColumn();
        }

        return ['titles' => $countTitles[0] ?? 0, 'volumes' => $countVolumes[0] ?? 0];
    }

    /**
     * Build table of contents
     *
     * @access public
     *
     * @param int $uid
     * @param int $pid
     * @param array $settings
     *
     * @return Result
     */
    public function getTableOfContentsFromDb($uid, $pid, $settings)
    {
        // Build table of contents from database.
        $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
            ->getQueryBuilderForTable('tx_dlf_documents');

        $excludeOtherWhere = '';
        if ($settings['excludeOther']) {
            $excludeOtherWhere = 'tx_dlf_documents.pid=' . intval($settings['storagePid']);
        }
        // Check if there are any metadata to suggest.
        return $queryBuilder
            ->select(
                'tx_dlf_documents.uid AS uid',
                'tx_dlf_documents.title AS title',
                'tx_dlf_documents.volume AS volume',
                'tx_dlf_documents.year AS year',
                'tx_dlf_documents.mets_label AS mets_label',
                'tx_dlf_documents.mets_orderlabel AS mets_orderlabel',
                'tx_dlf_structures_join.index_name AS type'
            )
            ->innerJoin(
                'tx_dlf_documents',
                'tx_dlf_structures',
                'tx_dlf_structures_join',
                $queryBuilder->expr()->eq(
                    'tx_dlf_structures_join.uid',
                    'tx_dlf_documents.structure'
                )
            )
            ->from('tx_dlf_documents')
            ->where(
                $queryBuilder->expr()->eq('tx_dlf_documents.partof', intval($uid)),
                $queryBuilder->expr()->eq('tx_dlf_structures_join.pid', intval($pid)),
                $excludeOtherWhere
            )
            ->add('orderBy', 'cast(volume_sorting as UNSIGNED) asc')
            ->addOrderBy('tx_dlf_documents.mets_orderlabel')
            ->execute();
    }

    /**
     * Find one document by given settings and identifier
     *
     * @access public
     *
     * @param array $settings
     * @param array $parameters
     *
     * @return array The found document object
     */
    public function getOaiRecord($settings, $parameters)
    {
        $where = '';

        if (!$settings['show_userdefined']) {
            $where .= 'AND tx_dlf_collections.fe_cruser_id=0 ';
        }

        $connection = GeneralUtility::makeInstance(ConnectionPool::class)
            ->getConnectionForTable('tx_dlf_documents');

        $sql = 'SELECT `tx_dlf_documents`.*, GROUP_CONCAT(DISTINCT `tx_dlf_collections`.`oai_name` ORDER BY `tx_dlf_collections`.`oai_name` SEPARATOR " ") AS `collections` ' .
            'FROM `tx_dlf_documents` ' .
            'INNER JOIN `tx_dlf_relations` ON `tx_dlf_relations`.`uid_local` = `tx_dlf_documents`.`uid` ' .
            'INNER JOIN `tx_dlf_collections` ON `tx_dlf_collections`.`uid` = `tx_dlf_relations`.`uid_foreign` ' .
            'WHERE `tx_dlf_documents`.`record_id` = ? ' .
            'AND `tx_dlf_relations`.`ident`="docs_colls" ' .
            $where;

        $values = [
            $parameters['identifier']
        ];

        $types = [
            Connection::PARAM_STR
        ];

        // Create a prepared statement for the passed SQL query, bind the given params with their binding types and execute the query
        $statement = $connection->executeQuery($sql, $values, $types);

        return $statement->fetchAssociative();
    }

    /**
     * Finds all documents for the given settings
     *
     * @access public
     *
     * @param array $documentsToProcess
     *
     * @return Result The found document objects
     */
    public function getOaiDocumentList($documentsToProcess): Result
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)
            ->getConnectionForTable('tx_dlf_documents');

        $sql = 'SELECT `tx_dlf_documents`.*, GROUP_CONCAT(DISTINCT `tx_dlf_collections`.`oai_name` ORDER BY `tx_dlf_collections`.`oai_name` SEPARATOR " ") AS `collections` ' .
            'FROM `tx_dlf_documents` ' .
            'INNER JOIN `tx_dlf_relations` ON `tx_dlf_relations`.`uid_local` = `tx_dlf_documents`.`uid` ' .
            'INNER JOIN `tx_dlf_collections` ON `tx_dlf_collections`.`uid` = `tx_dlf_relations`.`uid_foreign` ' .
            'WHERE `tx_dlf_documents`.`uid` IN ( ? ) ' .
            'AND `tx_dlf_relations`.`ident`="docs_colls" ' .
            'AND ' . Helper::whereExpression('tx_dlf_collections') . ' ' .
            'GROUP BY `tx_dlf_documents`.`uid` ';

        $values = [
            $documentsToProcess,
        ];

        $types = [
            Connection::PARAM_INT_ARRAY,
        ];

        // Create a prepared statement for the passed SQL query, bind the given params with their binding types and execute the query
        return $connection->executeQuery($sql, $values, $types);
    }

    /**
     * Finds all documents with given uids
     *
     * @access public
     *
     * @param array $uids
     * @param bool $checkPartof Whether or not to also match $uids against partof.
     *
     * @return array
     */
    public function findAllByUids($uids, $checkPartof = false)
    {
        // get all documents from db we are talking about
        $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
        $queryBuilder = $connectionPool->getQueryBuilderForTable('tx_dlf_documents');
        // Fetch document info for UIDs in $documentSet from DB
        $exprDocumentMatchesUid = $queryBuilder->expr()->in('tx_dlf_documents.uid', $uids);
        if ($checkPartof) {
            $exprDocumentMatchesUid = $queryBuilder->expr()->orX(
                $exprDocumentMatchesUid,
                $queryBuilder->expr()->in('tx_dlf_documents.partof', $uids)
            );
        }
        $kitodoDocuments = $queryBuilder
            ->select(
                'tx_dlf_documents.uid AS uid',
                'tx_dlf_documents.title AS title',
                'tx_dlf_documents.structure AS structure',
                'tx_dlf_documents.thumbnail AS thumbnail',
                'tx_dlf_documents.volume_sorting AS volumeSorting',
                'tx_dlf_documents.mets_orderlabel AS metsOrderlabel',
                'tx_dlf_documents.partof AS partOf'
            )
            ->from('tx_dlf_documents')
            ->where(
                $queryBuilder->expr()->in('tx_dlf_documents.pid', $this->settings['storagePid']),
                $exprDocumentMatchesUid
            )
            ->add('orderBy', 'cast(volume_sorting as UNSIGNED) asc')
            ->addOrderBy('tx_dlf_documents.mets_orderlabel', 'asc')
            ->execute();

        $allDocuments = [];
        $documentStructures = Helper::getDocumentStructures($this->settings['storagePid']);
        // Process documents in a usable array structure
        while ($resArray = $kitodoDocuments->fetchAssociative()) {
            $resArray['structure'] = $documentStructures[$resArray['structure']];
            $allDocuments[$resArray['uid']] = $resArray;
        }

        return $allDocuments;
    }

    /**
     * @access public
     *
     * @param array $uids
     *
     * @return array
     */
    public function findChildrenOfEach(array $uids)
    {
        $allDocuments = $this->findAllByUids($uids, true);

        $result = [];
        foreach ($allDocuments as $doc) {
            if ($doc['partOf']) {
                $result[$doc['partOf']][] = $doc;
            }
        }
        return $result;
    }

    /**
     * Find all documents with given collection from Solr
     *
     * @access public
     *
     * @param Collection $collection
     * @param array $settings
     * @param array $searchParams
     * @param QueryResult $listedMetadata
     * @param QueryResult $indexedMetadata
     *
     * @return SolrSearch
     */
    public function findSolrByCollection(Collection $collection, $settings, $searchParams, $listedMetadata = null, $indexedMetadata = null)
    {
        return $this->findSolr([$collection], $settings, $searchParams, $listedMetadata, $indexedMetadata);
    }

    /**
     * Find all documents with given collections from Solr
     *
     * @access public
     *
     * @param array|QueryResultInterface $collections
     * @param array $settings
     * @param array $searchParams
     * @param QueryResult $listedMetadata
     * @param QueryResult $indexedMetadata
     *
     * @return SolrSearch
     */
    public function findSolrByCollections($collections, $settings, $searchParams, $listedMetadata = null, $indexedMetadata = null): SolrSearch
    {
        return $this->findSolr($collections, $settings, $searchParams, $listedMetadata, $indexedMetadata);
    }

    /**
     * Find all documents without given collection from Solr
     *
     * @access public
     *
     * @param array $settings
     * @param array $searchParams
     * @param QueryResult $listedMetadata
     * @param QueryResult $indexedMetadata
     *
     * @return SolrSearch
     */
    public function findSolrWithoutCollection($settings, $searchParams, $listedMetadata = null, $indexedMetadata = null): SolrSearch
    {
        return $this->findSolr([], $settings, $searchParams, $listedMetadata, $indexedMetadata);
    }

    /**
     * Find all documents with from Solr
     *
     * @access private
     *
     * @param array|QueryResultInterface $collections
     * @param array $settings
     * @param array $searchParams
     * @param QueryResult $listedMetadata
     *
     * @return SolrSearch
     */
    private function findSolr($collections, $settings, $searchParams, $listedMetadata = null, $indexedMetadata = null): SolrSearch
    {
        // set settings global inside this repository
        // (may be necessary when SolrSearch calls back)
        $this->settings = $settings;

        $search = new SolrSearch($this, $collections, $settings, $searchParams, $listedMetadata, $indexedMetadata);
        $search->prepare();
        return $search;
    }

    /**
     * Find the uid of the previous document relative to the current document uid.
     * Otherwise backtrack the closest previous leaf node.
     *
     * @access public
     *
     * @param int $uid
     *
     * @return int|null
     */
    public function getPreviousDocumentUid($uid)
    {
        $currentDocument = $this->findOneByUid($uid);
        if ($currentDocument) {
            $currentVolume = '';
            $parentId = $currentDocument->getPartof();

            if ($parentId) {

                $currentVolume = (string) $currentDocument->getVolumeSorting();

                $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
                $queryBuilder = $connectionPool->getQueryBuilderForTable('tx_dlf_documents');

                // Grab previous volume
                $prevDocument = $queryBuilder
                    ->select(
                        'tx_dlf_documents.uid AS uid'
                    )
                    ->from('tx_dlf_documents')
                    ->where(
                        $queryBuilder->expr()->eq('tx_dlf_documents.partof', (int) $parentId),
                        'tx_dlf_documents.volume_sorting < \'' . $currentVolume . '\''
                    )
                    ->add('orderBy', 'volume_sorting desc')
                    ->addOrderBy('tx_dlf_documents.volume_sorting')
                    ->execute()
                    ->fetch();

                if (!empty($prevDocument)) {
                    return $prevDocument['uid'];
                }

                return $this->getLastChild($this->getPreviousDocumentUid($parentId));
            }
        }

        return null;
    }

    /**
     * Find the uid of the next document relative to the current document uid.
     * Otherwise backtrack the closest next leaf node.
     *
     * @access public
     *
     * @param int $uid
     *
     * @return int|null
     */
    public function getNextDocumentUid($uid)
    {
        $currentDocument = $this->findOneByUid($uid);
        if ($currentDocument) {
            $currentVolume = '';
            $parentId = $currentDocument->getPartof();

            if ($parentId) {

                $currentVolume = (string) $currentDocument->getVolumeSorting();

                $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
                $queryBuilder = $connectionPool->getQueryBuilderForTable('tx_dlf_documents');

                // Grab next volume
                $nextDocument = $queryBuilder
                    ->select(
                        'tx_dlf_documents.uid AS uid'
                    )
                    ->from('tx_dlf_documents')
                    ->where(
                        $queryBuilder->expr()->eq('tx_dlf_documents.partof', (int) $parentId),
                        'tx_dlf_documents.volume_sorting > \'' . $currentVolume . '\''
                    )
                    ->add('orderBy', 'volume_sorting asc')
                    ->addOrderBy('tx_dlf_documents.volume_sorting')
                    ->execute()
                    ->fetch();

                if (!empty($nextDocument)) {
                    return $nextDocument['uid'];
                }

                return $this->getFirstChild($this->getNextDocumentUid($parentId));
            }
        }

        return null;
    }

    /**
     * Find the uid of the first leaf node
     *
     * @access public
     *
     * @param int $uid
     *
     * @return int
     */
    public function getFirstChild($uid)
    {
        $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
        $queryBuilder = $connectionPool->getQueryBuilderForTable('tx_dlf_documents');

        $child = $queryBuilder
            ->select(
                'tx_dlf_documents.uid AS uid'
            )
            ->from('tx_dlf_documents')
            ->where(
                $queryBuilder->expr()->eq('tx_dlf_documents.partof', (int) $uid)
            )
            ->add('orderBy', 'volume_sorting asc')
            ->addOrderBy('tx_dlf_documents.volume_sorting')
            ->execute()
            ->fetch();

        if (empty($child['uid'])) {
            return $uid;
        }

        return $this->getFirstChild($child['uid']);
    }

    /**
     * Find the uid of the last leaf node
     *
     * @access public
     *
     * @param int $uid
     *
     * @return int
     */
    public function getLastChild($uid)
    {
        $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
        $queryBuilder = $connectionPool->getQueryBuilderForTable('tx_dlf_documents');

        $child = $queryBuilder
            ->select(
                'tx_dlf_documents.uid AS uid'
            )
            ->from('tx_dlf_documents')
            ->where(
                $queryBuilder->expr()->eq('tx_dlf_documents.partof', (int) $uid)
            )
            ->add('orderBy', 'volume_sorting desc')
            ->addOrderBy('tx_dlf_documents.volume_sorting')
            ->execute()
            ->fetch();

        if (empty($child['uid'])) {
            return $uid;
        }

        return $this->getFirstChild($child['uid']);
    }
}
