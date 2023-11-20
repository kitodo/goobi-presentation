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
 * CLI Command for indexing single documents into database and Solr.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class IndexCommand extends BaseCommand
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
            ->setDescription('Index single document into database and Solr.')
            ->setHelp('')
            ->addOption(
                'dry-run',
                null,
                InputOption::VALUE_NONE,
                'If this option is set, the files will not actually be processed but the location URI is shown.'
            )
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
                'owner',
                'o',
                InputOption::VALUE_OPTIONAL,
                '[UID|index_name] of the Library which should be set as owner of the document.'
            )
            ->addOption(
                'softCommit',
                null,
                InputOption::VALUE_NONE,
                'If this option is set, documents are just added to the index by a soft commit.'
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

        if (!empty($input->getOption('owner'))) {
            if (MathUtility::canBeInterpretedAsInteger($input->getOption('owner'))) {
                $this->owner = $this->libraryRepository->findByUid(MathUtility::forceIntegerInRange((int) $input->getOption('owner'), 1));
            } else {
                $this->owner = $this->libraryRepository->findOneByIndexName((string) $input->getOption('owner'));
            }
        } else {
            $this->owner = null;
        }

        $document = null;
        $doc = null;

        // Try to find existing document in database
        if (MathUtility::canBeInterpretedAsInteger($input->getOption('doc'))) {

            $document = $this->documentRepository->findByUid($input->getOption('doc'));

            if ($document === null) {
                $io->error('ERROR: Document with UID "' . $input->getOption('doc') . '" could not be found on PID ' . $this->storagePid . ' .');
                return BaseCommand::FAILURE;
            } else {
                $doc = AbstractDocument::getInstance($document->getLocation(), 0, ['storagePid' => $this->storagePid], true);
            }

        } else if (GeneralUtility::isValidUrl($input->getOption('doc'))) {
            $doc = AbstractDocument::getInstance($input->getOption('doc'), 0, ['storagePid' => $this->storagePid], true);

            $document = $this->getDocumentFromUrl($doc, $input->getOption('doc'));
        }

        if ($doc === null) {
            $io->error('ERROR: Document "' . $input->getOption('doc') . '" could not be loaded.');
            return BaseCommand::FAILURE;
        }

        $document->setSolrcore($solrCoreUid);

        if ($dryRun) {
            $io->section('DRY RUN: Would index ' . $document->getUid() . ' ("' . $document->getLocation() . '") on PID ' . $this->storagePid . ' and Solr core ' . $solrCoreUid . '.');
            $io->success('All done!');
            return BaseCommand::SUCCESS;
        } else {
            $document->setCurrentDocument($doc);

            if ($io->isVerbose()) {
                $io->section('Indexing ' . $document->getUid() . ' ("' . $document->getLocation() . '") on PID ' . $this->storagePid . '.');
            }
            $isSaved = $this->saveToDatabase($document, $input->getOption('softCommit'));

            if ($isSaved) {
                if ($io->isVerbose()) {
                    $io->section('Indexing ' . $document->getUid() . ' ("' . $document->getLocation() . '") on Solr core ' . $solrCoreUid . '.');
                }
                $isSaved = Indexer::add($document, $this->documentRepository, $input->getOption('softCommit'));
            } else {
                $io->error('ERROR: Document with UID "' . $document->getUid() . '" could not be indexed on PID ' . $this->storagePid . ' . There are missing mandatory fields (at least one of those: ' . $this->extConf['general']['requiredMetadataFields'] . ') in this document.');
                return BaseCommand::FAILURE;
            }

            if ($isSaved) {
                $io->success('All done!');
                return BaseCommand::SUCCESS;
            }

            $io->error('ERROR: Document with UID "' . $document->getUid() . '" could not be indexed on Solr core ' . $solrCoreUid . ' . There are missing mandatory fields (at least one of those: ' . $this->extConf['general']['requiredMetadataFields'] . ') in this document.');
            $io->info('INFO: Document with UID "' . $document->getUid() . '" is already in database. If you want to keep the database and index consistent you need to remove it.');
            return BaseCommand::FAILURE;
        }
    }

    /**
     * Get document from given URL. Find it in database, if not found create the new one.
     *
     * @access private
     *
     * @param AbstractDocument $doc
     * @param string $url
     *
     * @return Document
     */
    private function getDocumentFromUrl($doc, string $url): Document
    {
        $document = null;

        if ($doc->recordId) {
            $document = $this->documentRepository->findOneByRecordId($doc->recordId);
        } else {
            $document = $this->documentRepository->findOneByLocation($url);
        }

        if ($document === null) {
            // create new Document object
            $document = GeneralUtility::makeInstance(Document::class);
        }

        // now there must exist a document object
        if ($document) {
            $document->setLocation($url);
        }

        return $document;
    }
}
