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
use Kitodo\Dlf\Common\Indexer;
use Kitodo\Dlf\Command\DbDocs\Generator;
use Kitodo\Dlf\Domain\Model\Document;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\MathUtility;

/**
 * CLI Command for generating the reStructuredText file containing documentation 
 * about the database schema.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class DbDocsCommand extends Command
{

    protected Generator $generator;

    public function __construct(
        Generator $generator
    ) {
        parent::__construct();

       $this->generator = $generator;
    }

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
            ->setDescription('Generate database rst file.')
            ->setHelp('')
            ->addArgument('outputPath', InputArgument::OPTIONAL, 'the path to the output rst file');
    }

    /**
     * Executes the command to generate the documentation.
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

        $outputPath = "kitodo-presentation/Documentation/Developers/Database.rst";
        if ($input->getArgument('outputPath')) {
            $outputPath = $input->getArgument('outputPath');
        }

        // $generator = GeneralUtility::makeInstance(\Kitodo\Dlf\Command\DbDocs\Generator::class);
        $tables = $this->generator->collectTables();
        $page = $this->generator->generatePage($tables);
        // file_put_contents($outputPath, $page->render());

        file_put_contents($outputPath, $page->render());
    
        $io->write("Database documentation written to output file:\n" . $outputPath . "\n");
        return Command::SUCCESS;
    }
    
}
