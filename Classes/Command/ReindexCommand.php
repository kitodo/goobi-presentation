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

namespace Kitodo\Dlf\Command;

use Kitodo\Dlf\Common\AbstractDocument;
use Kitodo\Dlf\Common\DocumentCacheManager;
use Kitodo\Dlf\Common\Indexer;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;

/**
 * CLI Command for re-indexing collections into database and Solr.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class ReindexCommand extends BaseCommand
{
    /**
     * Configure the command by defining the name, options and arguments
     *
     * @access public
     *
     * @return void
     */
    public function configure(): void
    {
        $this
            ->setDescription('Reindex a collection into database and Solr.')
            ->setHelp('')
            ->addOption(
                'dry-run',
                null,
                InputOption::VALUE_NONE,
                'If this option is set, the files will not actually be processed but the location URI is shown.'
            )
            ->addOption(
                'coll',
                'c',
                InputOption::VALUE_REQUIRED,
                'UID of the collection.'
            )
            ->addOption(
                'pid',
                'p',
                InputOption::VALUE_REQUIRED,
                'UID of the page the documents should be added to.'
            )
            ->addOption(
                'solr',
                's',
                InputOption::VALUE_REQUIRED,
                '[UID|index_name] of the Solr core the document should be added to.'
            )
            ->addOption(
                'owner',
                'o',
                InputOption::VALUE_OPTIONAL,
                '[UID|index_name] of the Library which should be set as owner of the documents.'
            )
            ->addOption(
                'all',
                'a',
                InputOption::VALUE_NONE,
                'Reindex all documents on the given page.'
            )
            ->addOption(
                'index-limit',
                'l',
                InputOption::VALUE_OPTIONAL,
                'Reindex the given amount of documents on the given page.'
            )
            ->addOption(
                'index-begin',
                'b',
                InputOption::VALUE_OPTIONAL,
                'Reindex documents on the given page starting from the given value.'
            )
            ->addOption(
                'softCommit',
                null,
                InputOption::VALUE_NONE,
                'If this option is set, documents are just added to the index with a soft commit.'
            );
    }

    /**
     * Executes the command to index the given document to DB and SOLR.
     *
     * @access protected
     *
     * @param InputInterface $input The input parameters
     * @param OutputInterface $output The Symfony interface for outputs on console
     *
     * @return int
     */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $dryRun = $input->getOption('dry-run') != false ? true : false;

        $io = new SymfonyStyle($input, $output);
        $io->title($this->getDescription());

        $this->initializeRepositories((int) $input->getOption('pid'));

        if ($this->storagePid == 0) {
            $io->error('ERROR: No valid PID (' . $this->storagePid . ') given.');
            return BaseCommand::FAILURE;
        }

        if (
            !empty($input->getOption('solr'))
            && !is_array($input->getOption('solr'))
        ) {
            $allSolrCores = $this->getSolrCores($this->storagePid);
            $solrCoreUid = $this->getSolrCoreUid($allSolrCores, $input->getOption('solr'));

            // Abort if solrCoreUid is empty or not in the array of allowed solr cores.
            if (empty($solrCoreUid) || !in_array($solrCoreUid, $allSolrCores)) {
                $outputSolrCores = [];
                foreach ($allSolrCores as $indexName => $uid) {
                    $outputSolrCores[] = $uid . ' : ' . $indexName;
                }
                if (empty($outputSolrCores)) {
                    $io->error('ERROR: No valid Solr core ("' . $input->getOption('solr') . '") given. No valid cores found on PID ' . $this->storagePid . ".\n");
                    return BaseCommand::FAILURE;
                } else {
                    $io->error('ERROR: No valid Solr core ("' . $input->getOption('solr') . '") given. ' . "Valid cores are (<uid>:<index_name>):\n" . implode("\n", $outputSolrCores) . "\n");
                    return BaseCommand::FAILURE;
                }
            }
        } else {
            $io->error('ERROR: Required parameter --solr|-s is missing or array.');
            return BaseCommand::FAILURE;
        }

        if (!empty($input->getOption('owner'))) {
            if (MathUtility::canBeInterpretedAsInteger($input->getOption('owner'))) {
                $this->owner = $this->libraryRepository->findByUid(MathUtility::forceIntegerInRange((int) $input->getOption('owner'), 1));
            } else {
                $this->owner = $this->libraryRepository->findOneByIndexName((string) $input->getOption('owner'));
            }
        } else {
            $this->owner = null;
        }

        if (!empty($input->getOption('all'))) {
            if (
                !empty($input->getOption('index-limit'))
                && $input->getOption('index-begin') >= 0
            ) {
                // Get all documents for given limit and start.
                $documents = $this->documentRepository->findAll()
                    ->getQuery()
                    ->setLimit((int) $input->getOption('index-limit'))
                    ->setOffset((int) $input->getOption('index-begin'))
                    ->execute();
                $io->writeln($input->getOption('index-limit') . ' documents starting from ' . $input->getOption('index-begin') . ' will be indexed.');
            } else {
                // Get all documents.
                $documents = $this->documentRepository->findAll();
            }
        } elseif (
            !empty($input->getOption('coll'))
            && !is_array($input->getOption('coll'))
        ) {
            $collections = GeneralUtility::intExplode(',', $input->getOption('coll'), true);
            // "coll" may be a single integer or a comma-separated list of integers.
            if (empty(array_filter($collections))) {
                $io->error('ERROR: Parameter --coll|-c is not a valid comma-separated list of collection UIDs.');
                return BaseCommand::FAILURE;
            }

            if (
                !empty($input->getOption('index-limit'))
                && $input->getOption('index-begin') >= 0
            ) {
                $documents = $this->documentRepository->findAllByCollectionsLimited($collections, (int) $input->getOption('index-limit'), (int) $input->getOption('index-begin'));

                $io->writeln($input->getOption('index-limit') . ' documents starting from ' . $input->getOption('index-begin') . ' will be indexed.');
            } else {
                // Get all documents of given collections.
                $documents = $this->documentRepository->findAllByCollectionsLimited($collections, 0);
            }
        } else {
            $io->error('ERROR: One of parameters --all|-a or --coll|-c must be given.');
            return BaseCommand::FAILURE;
        }

        foreach ($documents as $id => $document) {
            $doc = AbstractDocument::getInstance($document->getLocation(), 0, ['storagePid' => $this->storagePid], true);

            if ($doc === null) {
                $io->warning('WARNING: Document "' . $document->getLocation() . '" could not be loaded. Skip to next document.');
                continue;
            }

            if ($dryRun) {
                $io->writeln('DRY RUN: Would index ' . ($id + 1) . '/' . count($documents) . '  with UID "' . $document->getUid() . '" ("' . $document->getLocation() . '") on PID ' . $this->storagePid . ' and Solr core ' . $solrCoreUid . '.');
            } else {
                if ($io->isVerbose()) {
                    $io->writeln(date('Y-m-d H:i:s') . ' Indexing ' . ($id + 1) . '/' . count($documents) . ' with UID "' . $document->getUid() . '" ("' . $document->getLocation() . '") on PID ' . $this->storagePid . ' and Solr core ' . $solrCoreUid . '.');
                }
                $document->setCurrentDocument($doc);
                // save to database
                $this->saveToDatabase($document, $input->getOption('softCommit'));
                // add to index
                Indexer::add($document, $this->documentRepository, $input->getOption('softCommit'));
            }
            // Clear document cache to prevent memory exhaustion.
            GeneralUtility::makeInstance(DocumentCacheManager::class)->flush();
        }

        // Clear state of persistence manager to prevent memory exhaustion.
        $this->persistenceManager->clearState();

        $io->success('All done!');

        return BaseCommand::SUCCESS;
    }
}
