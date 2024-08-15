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
use Kitodo\Dlf\Command\BaseCommand;
use Kitodo\Dlf\Common\Indexer;
use Kitodo\Dlf\Domain\Model\Document;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;

/**
 * CLI Command for deleting single document from database and Solr.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class DeleteCommand extends BaseCommand
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
            ->setDescription('Delete single document from database and Solr.')
            ->setHelp('')
            ->addOption(
                'doc',
                'd',
                InputOption::VALUE_REQUIRED,
                'UID or URL of the document.'
            )
            ->addOption(
                'pid',
                'p',
                InputOption::VALUE_REQUIRED,
                'UID of the page the document should be added to.'
            )
            ->addOption(
                'solr',
                's',
                InputOption::VALUE_REQUIRED,
                '[UID|index_name] of the Solr core the document should be added to.'
            )
            ->addOption(
                'softCommit',
                null,
                InputOption::VALUE_NONE,
                'If this option is set, documents are just deleted from the index by a soft commit.'
            );
    }

    /**
     * Executes the command to delete the given document to DB and SOLR.
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

        if (
            empty($input->getOption('doc'))
            || is_array($input->getOption('doc'))
            || (
                !MathUtility::canBeInterpretedAsInteger($input->getOption('doc'))
                && !GeneralUtility::isValidUrl($input->getOption('doc'))
            )
        ) {
            $io->error('ERROR: Required parameter --doc|-d is not a valid document UID or URL.');
            return BaseCommand::FAILURE;
        }

        $this->deleteFromDatabase($input, $io);
        $this->deleteFromSolr($input, $io, $solrCoreUid);

        return BaseCommand::SUCCESS;
    }

    /**
     * Delete document from database.
     *
     * @access private
     *
     * @param InputInterface $input The input parameters
     * @param SymfonyStyle $io
     *
     * @return void
     */
    private function deleteFromDatabase($input, $io): void
    {
        $document = $this->getDocument($input);

        if ($document === null) {
            $io->info('INFO: Document with UID "' . $input->getOption('doc') . '" could not be found on PID ' . $this->storagePid . '. It is probably already deleted from DB.');
        } else {
            if ($io->isVerbose()) {
                $io->section('Deleting ' . $document->getUid() . ' ("' . $document->getLocation() . '") on PID ' . $this->storagePid . '.');
            }
            $this->documentRepository->remove($document);
            $this->persistenceManager->persistAll();
            if ($io->isVerbose()) {
                $io->success('Deleted ' . $document->getUid() . ' ("' . $document->getLocation() . '") on PID ' . $this->storagePid . '.');
            }
        }
    }

    /**
     * Delete document from SOLR.
     *
     * @access private
     *
     * @param InputInterface $input The input parameters
     * @param SymfonyStyle $io
     * @param int $solrCoreUid
     *
     * @return void
     */
    private function deleteFromSolr($input, $io, $solrCoreUid): void
    {
        if ($io->isVerbose()) {
            $io->section('Deleting ' . $input->getOption('doc') . ' on Solr core ' . $solrCoreUid . '.');
        }

        $isDeleted = false;
        if (MathUtility::canBeInterpretedAsInteger($input->getOption('doc'))) {
            $isDeleted = Indexer::delete($input, 'uid', $solrCoreUid, $input->getOption('softCommit'));

        } elseif (GeneralUtility::isValidUrl($input->getOption('doc'))) {
            $isDeleted = Indexer::delete($input, 'location', $solrCoreUid, $input->getOption('softCommit'));
        }

        if ($isDeleted) {
            if ($io->isVerbose()) {
                $io->success('Deleted ' . $input->getOption('doc') . ' on Solr core ' . $solrCoreUid . '.');
            }
            $io->success('All done!');
        } else {
            $io->error('Document was not deleted - check log file for more details!');
        }
    }

    /**
     * Get document from given URL. Find it in database, if not found create the new one.
     *
     * @access private
     *
     * @param InputInterface $input The input parameters
     *
     * @return ?Document
     */
    private function getDocument($input): ?Document
    {
        $document = null;

        if (MathUtility::canBeInterpretedAsInteger($input->getOption('doc'))) {
            $document = $this->documentRepository->findByUid($input->getOption('doc'));
        } elseif (GeneralUtility::isValidUrl($input->getOption('doc'))) {
            $doc = AbstractDocument::getInstance($input->getOption('doc'), 0, ['storagePid' => $this->storagePid], true);

            if ($doc->recordId) {
                $document = $this->documentRepository->findOneByRecordId($doc->recordId);
            } else {
                $document = $this->documentRepository->findOneByLocation($input->getOption('doc'));
            }
        }

        return $document;
    }
}
