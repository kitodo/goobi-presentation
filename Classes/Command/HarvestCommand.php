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
use Phpoaipmh\Endpoint;
use Phpoaipmh\Exception\BaseOaipmhException;

/**
 * CLI Command for harvesting OAI-PMH interfaces into database and Solr.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class HarvestCommand extends BaseCommand
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
            ->setDescription('Harvest OAI-PMH contents into database and Solr.')
            ->setHelp('')
            ->addOption(
                'dry-run',
                null,
                InputOption::VALUE_NONE,
                'If this option is set, the files will not actually be processed but the location URIs are shown.'
            )
            ->addOption(
                'lib',
                'l',
                InputOption::VALUE_REQUIRED,
                'UID of the library to harvest.'
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
                'from',
                null,
                InputOption::VALUE_OPTIONAL,
                'Datestamp (YYYY-MM-DD) to begin harvesting from.'
            )
            ->addOption(
                'until',
                null,
                InputOption::VALUE_OPTIONAL,
                'Datestamp (YYYY-MM-DD) to end harvesting on.'
            )
            ->addOption(
                'set',
                null,
                InputOption::VALUE_OPTIONAL,
                'Name of the set to limit harvesting to.'
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
            if (MathUtility::canBeInterpretedAsInteger($input->getOption('solr'))) {
                $solrCoreUid = MathUtility::forceIntegerInRange((int) $input->getOption('solr'), 0);
            } else {
                $solrCoreUid = $allSolrCores[$input->getOption('solr')];
            }
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

        if (MathUtility::canBeInterpretedAsInteger($input->getOption('lib'))) {
            $this->owner = $this->libraryRepository->findByUid(MathUtility::forceIntegerInRange((int) $input->getOption('lib'), 1));
        }

        if ($this->owner) {
            $baseUrl = $this->owner->getOaiBase();
        } else {
            $io->error('ERROR: Required parameter --lib|-l is not a valid UID.');
            return BaseCommand::FAILURE;
        }
        if (!GeneralUtility::isValidUrl($baseUrl)) {
            $io->error('ERROR: No valid OAI Base URL set for library with given UID ("' . $input->getOption('lib') . '").');
            return BaseCommand::FAILURE;
        } else {
            try {
                $oai = Endpoint::build($baseUrl);
            } catch (BaseoaipmhException $e) {
                $this->handleOaiError($e, $io);
            }
        }

        if (
            !is_array($input->getOption('from'))
            && preg_match('/^\d{4}-\d{2}-\d{2}$/', $input->getOption('from'))
        ) {
            $from = new \DateTime($input->getOption('from'));
        } else {
            $from = null;
        }

        if (
            !is_array($input->getOption('until'))
            && preg_match('/^\d{4}-\d{2}-\d{2}$/', $input->getOption('until'))
        ) {
            $until = new \DateTime($input->getOption('until'));
        } else {
            $until = null;
        }

        $set = null;
        if (
            !is_array($input->getOption('set'))
            && !empty($input->getOption('set'))
            && !empty($oai)
        ) {
            $setsAvailable = $oai->listSets();
            foreach ($setsAvailable as $setAvailable) {
                if ((string) $setAvailable->setSpec === $input->getOption('set')) {
                    $set = $input->getOption('set');
                    break;
                }
            }
            if (empty($set)) {
                $io->error('ERROR: OAI interface does not provide a set with given setSpec ("' . $input->getOption('set') . '").');
                return BaseCommand::FAILURE;
            }
        }

        $identifiers = [];
        // Get OAI record identifiers to process.
        try {
            if (!empty($oai)) {
                $identifiers = $oai->listIdentifiers('mets', $from, $until, $set);
            } else {
                $io->error('ERROR: OAI interface does not exist.');
            }
        } catch (BaseoaipmhException $exception) {
            $this->handleOaiError($exception, $io);
        }

        // Process all identifiers.
        $baseLocation = $baseUrl . (parse_url($baseUrl, PHP_URL_QUERY) ? '&' : '?');
        foreach ($identifiers as $identifier) {
            // Build OAI GetRecord URL...
            $params = [
                'verb' => 'GetRecord',
                'metadataPrefix' => 'mets',
                'identifier' => (string) $identifier->identifier
            ];
            $docLocation = $baseLocation . http_build_query($params);
            // ...index the document...
            $document = null;
            $doc = AbstractDocument::getInstance($docLocation, 0, ['storagePid' => $this->storagePid], true);

            if ($doc === null) {
                $io->warning('WARNING: Document "' . $docLocation . '" could not be loaded. Skip to next document.');
                continue;
            }

            if ($doc->recordId) {
                $document = $this->documentRepository->findOneByRecordId($doc->recordId);
            }

            if ($document === null) {
                // create new Document object
                $document = GeneralUtility::makeInstance(Document::class);
            }

            $document->setLocation($docLocation);
            $document->setSolrcore($solrCoreUid);

            if ($dryRun) {
                $io->writeln('DRY RUN: Would index ' . $document->getUid() . ' ("' . $document->getLocation() . '") on PID ' . $this->storagePid . ' and Solr core ' . $solrCoreUid . '.');
            } else {
                if ($io->isVerbose()) {
                    $io->writeln(date('Y-m-d H:i:s') . ' Indexing ' . $document->getUid() . ' ("' . $document->getLocation() . '") on PID ' . $this->storagePid . ' and Solr core ' . $solrCoreUid . '.');
                }
                $document->setCurrentDocument($doc);
                // save to database
                $this->saveToDatabase($document, $input->getOption('softCommit'));
                // add to index
                Indexer::add($document, $this->documentRepository, $input->getOption('softCommit'));
            }
        }

        $io->success('All done!');

        return BaseCommand::SUCCESS;
    }

    /**
     * Handles OAI errors
     *
     * @access protected
     *
     * @param BaseoaipmhException $exception Instance of exception thrown
     * @param SymfonyStyle $io
     *
     * @return void
     */
    protected function handleOaiError(BaseoaipmhException $exception, SymfonyStyle $io): void
    {
        $io->error('ERROR: Trying to retrieve data from OAI interface resulted in error:' . "\n    " . $exception->getMessage());
    }
}
