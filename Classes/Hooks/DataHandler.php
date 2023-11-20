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

namespace Kitodo\Dlf\Hooks;

use Kitodo\Dlf\Common\AbstractDocument;
use Kitodo\Dlf\Common\Helper;
use Kitodo\Dlf\Common\Indexer;
use Kitodo\Dlf\Common\Solr\Solr;
use Kitodo\Dlf\Domain\Repository\DocumentRepository;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\DeletedRestriction;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Hooks and helper for \TYPO3\CMS\Core\DataHandling\DataHandler
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class DataHandler implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * Field post-processing hook for the process_datamap() method.
     *
     * @access public
     *
     * @param string $status 'new' or 'update'
     * @param string $table The destination table
     * @param int|string $id The uid of the record
     * @param array &$fieldArray Array of field values
     *
     * @return void
     */
    public function processDatamap_postProcessFieldArray(string $status, string $table, $id, array &$fieldArray): void // TODO: Add type-hinting for $id when dropping support for PHP 7.
    {
        if ($status == 'new') {
            switch ($table) {
                    // Field post-processing for table "tx_dlf_documents".
                case 'tx_dlf_documents':
                    // Set sorting field if empty.
                    if (
                        empty($fieldArray['title_sorting'])
                        && !empty($fieldArray['title'])
                    ) {
                        $fieldArray['title_sorting'] = $fieldArray['title'];
                    }
                    break;
                    // Field post-processing for table "tx_dlf_metadata".
                    // TODO: Include also subentries if available.
                case 'tx_dlf_metadata':
                    // Store field in index if it should appear in lists.
                    if (!empty($fieldArray['is_listed'])) {
                        $fieldArray['index_stored'] = 1;
                    }
                    // Index field in index if it should be used for auto-completion.
                    if (!empty($fieldArray['index_autocomplete'])) {
                        $fieldArray['index_indexed'] = 1;
                    }
                    // Field post-processing for tables "tx_dlf_metadata", "tx_dlf_collections", "tx_dlf_libraries" and "tx_dlf_structures".
                case 'tx_dlf_collections':
                case 'tx_dlf_libraries':
                case 'tx_dlf_structures':
                    // Set label as index name if empty.
                    if (
                        empty($fieldArray['index_name'])
                        && !empty($fieldArray['label'])
                    ) {
                        $fieldArray['index_name'] = $fieldArray['label'];
                    }
                    // Set index name as label if empty.
                    if (
                        empty($fieldArray['label'])
                        && !empty($fieldArray['index_name'])
                    ) {
                        $fieldArray['label'] = $fieldArray['index_name'];
                    }
                    // Ensure that index names don't get mixed up with sorting values.
                    if (substr($fieldArray['index_name'], -8) == '_sorting') {
                        $fieldArray['index_name'] .= '0';
                    }
                    break;
                    // Field post-processing for table "tx_dlf_solrcores".
                case 'tx_dlf_solrcores':
                    // Create new Solr core.
                    $fieldArray['index_name'] = Solr::createCore($fieldArray['index_name']);
                    if (empty($fieldArray['index_name'])) {
                        $this->logger->error('Could not create new Apache Solr core');
                        // Unset all fields to prevent new database record if Solr core creation failed.
                        unset($fieldArray);
                    }
                    break;
            }
        } elseif ($status == 'update') {
            switch ($table) {
                    // Field post-processing for table "tx_dlf_metadata".
                case 'tx_dlf_metadata':
                    $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                        ->getQueryBuilderForTable($table);

                    // Store field in index if it should appear in lists.
                    if (!empty($fieldArray['is_listed'])) {
                        $fieldArray['index_stored'] = 1;
                    }
                    if (
                        isset($fieldArray['index_stored'])
                        && $fieldArray['index_stored'] == 0
                        && !isset($fieldArray['is_listed'])
                    ) {
                        // Get current configuration.
                        $result = $queryBuilder
                            ->select($table . '.is_listed AS is_listed')
                            ->from($table)
                            ->where(
                                $queryBuilder->expr()->eq($table . '.uid', (int) $id),
                                Helper::whereExpression($table)
                            )
                            ->setMaxResults(1)
                            ->execute();

                        $resArray = $result->fetchAssociative();
                        if (is_array($resArray)) {
                            // Reset storing to current.
                            $fieldArray['index_stored'] = $resArray['is_listed'];
                        }
                    }
                    // Index field in index if it should be used for auto-completion.
                    if (!empty($fieldArray['index_autocomplete'])) {
                        $fieldArray['index_indexed'] = 1;
                    }
                    if (
                        isset($fieldArray['index_indexed'])
                        && $fieldArray['index_indexed'] == 0
                        && !isset($fieldArray['index_autocomplete'])
                    ) {
                        // Get current configuration.
                        $result = $queryBuilder
                            ->select($table . '.index_autocomplete AS index_autocomplete')
                            ->from($table)
                            ->where(
                                $queryBuilder->expr()->eq($table . '.uid', (int) $id),
                                Helper::whereExpression($table)
                            )
                            ->setMaxResults(1)
                            ->execute();

                        if ($resArray = $result->fetchAssociative()) {
                            // Reset indexing to current.
                            $fieldArray['index_indexed'] = $resArray['index_autocomplete'];
                        }
                    }
                    break;
            }
        }
    }

    /**
     * After database operations hook for the process_datamap() method.
     *
     * @access public
     *
     * @param string $status 'new' or 'update'
     * @param string $table The destination table
     * @param int|string $id The uid of the record
     * @param array &$fieldArray Array of field values
     *
     * @return void
     */
    public function processDatamap_afterDatabaseOperations(string $status, string $table, $id, array &$fieldArray): void // TODO: Add type-hinting for $id when dropping support for PHP 7.
    {
        if ($status == 'update') {
            switch ($table) {
                    // After database operations for table "tx_dlf_documents".
                case 'tx_dlf_documents':
                    // Delete/reindex document in Solr if "hidden" status or collections have changed.
                    if (
                        isset($fieldArray['hidden'])
                        || isset($fieldArray['collections'])
                    ) {
                        // Get Solr-Core.
                        $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                            ->getQueryBuilderForTable('tx_dlf_solrcores');

                        $result = $queryBuilder
                            ->select(
                                'tx_dlf_solrcores.uid AS core',
                                'tx_dlf_solrcores.index_name',
                                'tx_dlf_documents_join.hidden AS hidden'
                            )
                            ->innerJoin(
                                'tx_dlf_solrcores',
                                'tx_dlf_documents',
                                'tx_dlf_documents_join',
                                $queryBuilder->expr()->eq(
                                    'tx_dlf_documents_join.solrcore',
                                    'tx_dlf_solrcores.uid'
                                )
                            )
                            ->from('tx_dlf_solrcores')
                            ->where(
                                $queryBuilder->expr()->eq(
                                    'tx_dlf_documents_join.uid',
                                    (int) $id
                                )
                            )
                            ->setMaxResults(1)
                            ->execute();

                        $resArray = $result->fetchAssociative();
                        if (is_array($resArray)) {
                            if ($resArray['hidden']) {
                                $this->deleteDocument($resArray['core'], $id);
                            } else {
                                $this->reindexDocument($id);
                            }
                        }
                    }
                    break;
            }
        }
    }

    /**
     * Post-processing hook for the process_cmdmap() method.
     *
     * @access public
     *
     * @param string $command 'move', 'copy', 'localize', 'inlineLocalizeSynchronize', 'delete' or 'undelete'
     * @param string $table The destination table
     * @param int|string $id The uid of the record
     *
     * @return void
     */
    public function processCmdmap_postProcess(string $command, string $table, $id): void // TODO: Add type-hinting for $id when dropping support for PHP 7.
    {
        if (
            in_array($command, ['move', 'delete', 'undelete'])
            && $table == 'tx_dlf_documents'
        ) {
            // Get Solr core.
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_solrcores');
            // Record in "tx_dlf_documents" is already deleted at this point.
            $queryBuilder
                ->getRestrictions()
                ->removeByType(DeletedRestriction::class);

            $result = $queryBuilder
                ->select(
                    'tx_dlf_solrcores.uid AS core'
                )
                ->innerJoin(
                    'tx_dlf_solrcores',
                    'tx_dlf_documents',
                    'tx_dlf_documents_join',
                    $queryBuilder->expr()->eq(
                        'tx_dlf_documents_join.solrcore',
                        'tx_dlf_solrcores.uid'
                    )
                )
                ->from('tx_dlf_solrcores')
                ->where(
                    $queryBuilder->expr()->eq(
                        'tx_dlf_documents_join.uid',
                        (int) $id
                    )
                )
                ->setMaxResults(1)
                ->execute();

            $resArray = $result->fetchAssociative();
            if (is_array($resArray)) {
                switch ($command) {
                    case 'move':
                    case 'delete':
                        $this->deleteDocument($resArray['core'], $id);
                        if ($command == 'delete') {
                            break;
                        }
                    case 'undelete':
                        $this->reindexDocument($id);
                        break;
                }
            }
        }
        if (
            $command === 'delete'
            && $table == 'tx_dlf_solrcores'
        ) {
            $this->deleteSolrCore($id);
        }
    }

    /**
     * Delete document from index.
     *
     * @access private
     *
     * @param mixed $core
     * @param int|string $id
     *
     * @return void
     */
    private function deleteDocument($core, $id): void
    {
        // Establish Solr connection.
        $solr = Solr::getInstance($core);
        if ($solr->ready) {
            // Delete Solr document.
            $updateQuery = $solr->service->createUpdate();
            $updateQuery->addDeleteQuery('uid:' . (int) $id);
            $updateQuery->addCommit(false);
            $solr->service->update($updateQuery);
        }
    }

    /**
     * Reindex document.
     *
     * @access private
     *
     * @param int|string $id
     *
     * @return void
     */
    private function reindexDocument($id):void
    {
        $documentRepository = GeneralUtility::makeInstance(DocumentRepository::class);
        $document = $documentRepository->findByUid((int) $id);
        $doc = AbstractDocument::getInstance($document->getLocation(), 0, ['storagePid' => $document->getPid()], true);
        if ($document !== null && $doc !== null) {
            $document->setCurrentDocument($doc);
            Indexer::add($document, $documentRepository);
        } else {
            $this->logger->error('Failed to re-index document with UID ' . (string) $id);
        }
    }

    /**
     * Delete SOLR core if deletion is allowed.
     *
     * @access private
     *
     * @param int|string $id
     *
     * @return void
     */
    private function deleteSolrCore($id): void
    {
        // Is core deletion allowed in extension configuration?
        $extConf = GeneralUtility::makeInstance(ExtensionConfiguration::class)->get('dlf', 'solr');
        if (!empty($extConf['allowCoreDelete'])) {
            // Delete core from Apache Solr as well.
            $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
                ->getQueryBuilderForTable('tx_dlf_solrcores');
            // Record in "tx_dlf_solrcores" is already deleted at this point.
            $queryBuilder
                ->getRestrictions()
                ->removeByType(DeletedRestriction::class);

            $result = $queryBuilder
                ->select(
                    'tx_dlf_solrcores.index_name AS core'
                )
                ->from('tx_dlf_solrcores')
                ->where($queryBuilder->expr()->eq('tx_dlf_solrcores.uid', (int) $id))
                ->setMaxResults(1)
                ->execute();

            $resArray = $result->fetchAssociative();
            if (is_array($resArray)) {
                // Establish Solr connection.
                $solr = Solr::getInstance();
                if ($solr->ready) {
                    // Delete Solr core.
                    $query = $solr->service->createCoreAdmin();
                    $action = $query->createUnload();
                    $action->setCore($resArray['core']);
                    $action->setDeleteDataDir(true);
                    $action->setDeleteIndex(true);
                    $action->setDeleteInstanceDir(true);
                    $query->setAction($action);
                    try {
                        $response = $solr->service->coreAdmin($query);
                        if ($response->getWasSuccessful() == false) {
                            $this->logger->warning('Core ' . $resArray['core'] . ' could not be deleted from Apache Solr');
                        }
                    } catch (\Exception $e) {
                        $this->logger->warning($e->getMessage());
                    }
                }
            }
        }
    }
}
