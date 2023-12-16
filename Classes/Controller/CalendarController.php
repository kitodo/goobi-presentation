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

namespace Kitodo\Dlf\Controller;

use Generator;
use Kitodo\Dlf\Domain\Model\Document;
use Kitodo\Dlf\Domain\Repository\StructureRepository;
use TYPO3\CMS\Extbase\Persistence\QueryResultInterface;

/**
 * Controller class for the plugin 'Calendar'.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class CalendarController extends AbstractController
{
    /**
     * @access protected
     * @var StructureRepository
     */
    protected StructureRepository $structureRepository;

    /**
     * @access public
     *
     * @param StructureRepository $structureRepository
     *
     * @return void
     */
    public function injectStructureRepository(StructureRepository $structureRepository): void
    {
        $this->structureRepository = $structureRepository;
    }

    /**
     * @access protected
     * @var array This holds all issues for the list view.
     */
    protected array $allIssues = [];

    /**
     * The main method of the plugin
     *
     * @access public
     *
     * @return void
     */
    public function mainAction(): void
    {
        // Set initial document (anchor or year file) if configured.
        if (empty($this->requestData['id']) && !empty($this->settings['initialDocument'])) {
            $this->requestData['id'] = $this->settings['initialDocument'];
        }

        // Load current document.
        $this->loadDocument();
        if ($this->document === null) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $metadata = $this->document->getCurrentDocument()->getToplevelMetadata();
        if (!empty($metadata['type'][0])) {
            $type = $metadata['type'][0];
        } else {
            return;
        }

        switch ($type) {
            case 'newspaper':
            case 'ephemera':
                $this->forward('years', null, null, $this->requestData);
            case 'year':
                $this->forward('calendar', null, null, $this->requestData);
            case 'issue':
            default:
                break;
        }

    }

    /**
     * The Calendar Method
     *
     * @access public
     *
     * @return void
     */
    public function calendarAction(): void
    {
        // access arguments passed by the mainAction()
        $mainRequestData = $this->request->getArguments();

        // merge both arguments together --> passing id by GET parameter tx_dlf[id] should win
        $this->requestData = array_merge($this->requestData, $mainRequestData);

        // Load current document.
        $this->loadDocument();
        if ($this->isDocMissing()) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        $calendarData = $this->buildCalendar();

        // Prepare list as alternative view.
        $issueData = [];
        foreach ($this->allIssues as $dayTimestamp => $issues) {
            $issueData[$dayTimestamp]['dateString'] = strftime('%A, %x', $dayTimestamp);
            $issueData[$dayTimestamp]['items'] = [];
            foreach ($issues as $issue) {
                $issueData[$dayTimestamp]['items'][] = $issue;
            }
        }
        $this->view->assign('issueData', $issueData);

        // Link to current year.
        $linkTitleData = $this->document->getCurrentDocument()->getToplevelMetadata();
        $yearLinkTitle = !empty($linkTitleData['mets_orderlabel'][0]) ? $linkTitleData['mets_orderlabel'][0] : $linkTitleData['mets_label'][0];

        $this->view->assign('calendarData', $calendarData);
        $this->view->assign('documentId', $this->document->getUid());
        $this->view->assign('yearLinkTitle', $yearLinkTitle);
        $this->view->assign('parentDocumentId', $this->document->getPartof() ?: $this->document->getCurrentDocument()->tableOfContents[0]['points']);
        $this->view->assign('allYearDocTitle', $this->document->getCurrentDocument()->getTitle($this->document->getPartof()) ?: $this->document->getCurrentDocument()->tableOfContents[0]['label']);
    }

    /**
     * The Years Method
     *
     * @access public
     *
     * @return void
     */
    public function yearsAction(): void
    {
        // access arguments passed by the mainAction()
        $mainRequestData = $this->request->getArguments();

        // merge both arguments together --> passing id by GET parameter tx_dlf[id] should win
        $this->requestData = array_merge($this->requestData, $mainRequestData);

        // Load current document.
        $this->loadDocument();
        if ($this->isDocMissing()) {
            // Quit without doing anything if required variables are not set.
            return;
        }

        // Get all children of anchor. This should be the year anchor documents
        $documents = $this->documentRepository->getChildrenOfYearAnchor($this->document->getUid(), $this->structureRepository->findOneByIndexName('year'));

        $years = [];
        // Process results.
        if (count($documents) === 0) {
            foreach ($this->document->getCurrentDocument()->tableOfContents[0]['children'] as $id => $year) {
                $yearLabel = empty($year['label']) ? $year['orderlabel'] : $year['label'];

                if (empty($yearLabel)) {
                    // if neither order nor orderlabel is set, use the id...
                    $yearLabel = (string)$id;
                }

                $years[] = [
                    'title' => $yearLabel,
                    'uid' => $year['points'],
                ];
            }
        } else {
            /** @var Document $document */
            foreach ($documents as $document) {
                $years[] = [
                    'title' => !empty($document->getMetsLabel()) ? $document->getMetsLabel() : (!empty($document->getMetsOrderlabel()) ? $document->getMetsOrderlabel() : $document->getTitle()),
                    'uid' => $document->getUid()
                ];
            }
        }

        $yearArray = [];
        if (count($years) > 0) {
            foreach ($years as $year) {
                $yearArray[] = [
                    'documentId' => $year['uid'],
                    'title' => $year['title']
                ];
            }
            // create an array that includes years without issues
            if (!empty($this->settings['showEmptyYears'])) {
                $yearFilled = [];
                $min = $yearArray[0]['title'];
                // round the starting decade down to zero for equal rows
                $min = (int) substr_replace($min, "0", -1);
                $max = (int) $yearArray[count($yearArray) - 1]['title'];
                // if we have an actual documentId it should be used, otherwise leave empty
                for ($i = 0; $i < $max - $min + 1; $i++) {
                    $key = array_search($min + $i, array_column($yearArray, 'title'));
                    if (is_int($key)) {
                        $yearFilled[] = $yearArray[$key];
                    } else {
                        $yearFilled[] = ['title' => $min + $i, 'documentId' => ''];
                    }
                }
                $yearArray = $yearFilled;
            }

            $this->view->assign('yearName', $yearArray);
        }

        $this->view->assign('documentId', $this->document->getUid());
        $this->view->assign('allYearDocTitle', $this->document->getCurrentDocument()->getTitle((int) $this->document->getUid()) ?: $this->document->getCurrentDocument()->tableOfContents[0]['label']);
    }

    /**
     * Build calendar for a certain year
     *
     * @access protected
     *
     * @param array $calendarData Output array containing the result calendar data that is passed to Fluid template
     * @param array $calendarIssuesByMonth All issues sorted by month => day
     * @param int $year Gregorian year
     * @param int $firstMonth 1 for January, 2 for February, ... 12 for December
     * @param int $lastMonth 1 for January, 2 for February, ... 12 for December
     *
     * @return void
     */
    protected function getCalendarYear(array &$calendarData, array $calendarIssuesByMonth, int $year, int $firstMonth = 1, int $lastMonth = 12): void
    {
        for ($i = $firstMonth; $i <= $lastMonth; $i++) {
            $key = $year . '-' . $i;

            $calendarData[$key] = [
                'DAYMON_NAME' => strftime('%a', strtotime('last Monday')),
                'DAYTUE_NAME' => strftime('%a', strtotime('last Tuesday')),
                'DAYWED_NAME' => strftime('%a', strtotime('last Wednesday')),
                'DAYTHU_NAME' => strftime('%a', strtotime('last Thursday')),
                'DAYFRI_NAME' => strftime('%a', strtotime('last Friday')),
                'DAYSAT_NAME' => strftime('%a', strtotime('last Saturday')),
                'DAYSUN_NAME' => strftime('%a', strtotime('last Sunday')),
                'MONTHNAME'  => strftime('%B', strtotime($year . '-' . $i . '-1')) . ' ' . $year,
                'CALYEAR' => ($i == $firstMonth) ? $year : ''
            ];

            $firstOfMonth = strtotime($year . '-' . $i . '-1');
            $lastOfMonth = strtotime('last day of', ($firstOfMonth));
            $firstOfMonthStart = strtotime('last Monday', $firstOfMonth);
            // There are never more than 6 weeks in a month.
            for ($j = 0; $j <= 5; $j++) {
                $firstDayOfWeek = strtotime('+ ' . $j . ' Week', $firstOfMonthStart);

                $calendarData[$key]['week'][$j] = [
                    'DAYMON' => ['dayValue' => '&nbsp;'],
                    'DAYTUE' => ['dayValue' => '&nbsp;'],
                    'DAYWED' => ['dayValue' => '&nbsp;'],
                    'DAYTHU' => ['dayValue' => '&nbsp;'],
                    'DAYFRI' => ['dayValue' => '&nbsp;'],
                    'DAYSAT' => ['dayValue' => '&nbsp;'],
                    'DAYSUN' => ['dayValue' => '&nbsp;'],
                ];
                // Every week has seven days. ;-)
                for ($k = 0; $k <= 6; $k++) {
                    $currentDayTime = strtotime('+ ' . $k . ' Day', $firstDayOfWeek);
                    if (
                        $currentDayTime >= $firstOfMonth
                        && $currentDayTime <= $lastOfMonth
                    ) {
                        $dayLinks = '';
                        $dayLinksText = [];
                        $dayLinkDiv = [];
                        $currentMonth = date('n', $currentDayTime);
                        if (is_array($calendarIssuesByMonth[$currentMonth])) {
                            foreach ($calendarIssuesByMonth[$currentMonth] as $id => $day) {
                                if ($id == date('j', $currentDayTime)) {
                                    $dayLinks = $id;
                                    foreach ($day as $issue) {
                                        $dayLinkLabel = empty($issue['title']) ? strftime('%x', $currentDayTime) : $issue['title'];

                                        $dayLinksText[] = [
                                            'documentId' => $issue['uid'],
                                            'text' => $dayLinkLabel
                                        ];

                                        // Save issue for list view.
                                        $this->allIssues[$currentDayTime][] = [
                                            'documentId' => $issue['uid'],
                                            'text' => $dayLinkLabel
                                        ];
                                    }
                                }
                            }
                            $dayLinkDiv = $dayLinksText;
                        }
                        switch (strftime('%w', strtotime('+ ' . $k . ' Day', $firstDayOfWeek))) {
                            case '0':
                                $calendarData[$key]['week'][$j]['DAYSUN']['dayValue'] = strftime('%d', $currentDayTime);
                                if ((int) $dayLinks === (int) date('j', $currentDayTime)) {
                                    $calendarData[$key]['week'][$j]['DAYSUN']['issues'] = $dayLinkDiv;
                                }
                                break;
                            case '1':
                                $calendarData[$key]['week'][$j]['DAYMON']['dayValue'] = strftime('%d', $currentDayTime);
                                if ((int) $dayLinks === (int) date('j', $currentDayTime)) {
                                    $calendarData[$key]['week'][$j]['DAYMON']['issues'] = $dayLinkDiv;
                                }
                                break;
                            case '2':
                                $calendarData[$key]['week'][$j]['DAYTUE']['dayValue'] = strftime('%d', $currentDayTime);
                                if ((int) $dayLinks === (int) date('j', $currentDayTime)) {
                                    $calendarData[$key]['week'][$j]['DAYTUE']['issues'] = $dayLinkDiv;
                                }
                                break;
                            case '3':
                                $calendarData[$key]['week'][$j]['DAYWED']['dayValue'] = strftime('%d', $currentDayTime);
                                if ((int) $dayLinks === (int) date('j', $currentDayTime)) {
                                    $calendarData[$key]['week'][$j]['DAYWED']['issues'] = $dayLinkDiv;
                                }
                                break;
                            case '4':
                                $calendarData[$key]['week'][$j]['DAYTHU']['dayValue'] = strftime('%d', $currentDayTime);
                                if ((int) $dayLinks === (int) date('j', $currentDayTime)) {
                                    $calendarData[$key]['week'][$j]['DAYTHU']['issues'] = $dayLinkDiv;
                                }
                                break;
                            case '5':
                                $calendarData[$key]['week'][$j]['DAYFRI']['dayValue'] = strftime('%d', $currentDayTime);
                                if ((int) $dayLinks === (int) date('j', $currentDayTime)) {
                                    $calendarData[$key]['week'][$j]['DAYFRI']['issues'] = $dayLinkDiv;
                                }
                                break;
                            case '6':
                                $calendarData[$key]['week'][$j]['DAYSAT']['dayValue'] = strftime('%d', $currentDayTime);
                                if ((int) $dayLinks === (int) date('j', $currentDayTime)) {
                                    $calendarData[$key]['week'][$j]['DAYSAT']['issues'] = $dayLinkDiv;
                                }
                                break;
                        }
                    }
                }
            }
        }
    }

    /**
     * Build calendar for year (default) or season.
     *
     * @access private
     *
     * @return array
     */
    private function buildCalendar(): array
    {
        $issuesByYear = $this->getIssuesByYear();

        $calendarData = [];
        $iteration = 1;
        foreach ($issuesByYear as $year => $issuesByMonth) {
            // Sort by months.
            ksort($issuesByMonth);
            // Default: First month is January, last month is December.
            $firstMonth = 1;
            $lastMonth = 12;
            // Show calendar from first issue up to end of season if applicable.
            if (
                empty($this->settings['showEmptyMonths'])
                && count($issuesByYear) > 1
            ) {
                if ($iteration == 1) {
                    $firstMonth = (int) key($issuesByMonth);
                } elseif ($iteration == count($issuesByYear)) {
                    end($issuesByMonth);
                    $lastMonth = (int) key($issuesByMonth);
                }
            }
            $this->getCalendarYear($calendarData, $issuesByMonth, $year, $firstMonth, $lastMonth);
            $iteration++;
        }

        return $calendarData;
    }

    /**
     * Get issues by year
     *
     * @access private
     *
     * @return array
     */
    private function getIssuesByYear(): array
    {
        //  We need an array of issues with year => month => day number as key.
        $issuesByYear = [];

        foreach ($this->getIssues() as $issue) {
            $dateTimestamp = strtotime($issue['year']);
            if ($dateTimestamp !== false) {
                $_year = date('Y', $dateTimestamp);
                $_month = date('n', $dateTimestamp);
                $_day = date('j', $dateTimestamp);
                $issuesByYear[$_year][$_month][$_day][] = $issue;
            } else {
                $this->logger->warning('Document with UID ' . $issue['uid'] . 'has no valid date of publication');
            }
        }
        // Sort by years.
        ksort($issuesByYear);

        return $issuesByYear;
    }

    /**
     * Gets issues from table of contents or documents.
     *
     * @access private
     *
     * @return Generator
     */
    private function getIssues(): Generator
    {
        $documents = $this->documentRepository->getChildrenOfYearAnchor($this->document->getUid(), $this->structureRepository->findOneByIndexName('issue'));

        // Process results.
        if ($documents->count() === 0) {
            return $this->getIssuesFromTableOfContents();
        }

        return $this->getIssuesFromDocuments($documents);
    }

    /**
     * Gets issues from table of contents.
     *
     * @access private
     *
     * @return Generator
     */
    private function getIssuesFromTableOfContents(): Generator
    {
        $toc = $this->document->getCurrentDocument()->tableOfContents;

        foreach ($toc[0]['children'] as $year) {
            foreach ($year['children'] as $month) {
                foreach ($month['children'] as $day) {
                    foreach ($day['children'] as $issue) {
                        $title = $issue['label'] ?: $issue['orderlabel'];
                        if (strtotime($title) !== false) {
                            $title = strftime('%x', strtotime($title));
                        }

                        yield [
                            'uid' => $issue['points'],
                            'title' => $title,
                            'year' => $day['orderlabel'],
                        ];
                    }
                }
            }
        }
    }

    /**
     * Gets issues from documents.
     *
     * @access private
     *
     * @param array|QueryResultInterface $documents to create issues
     *
     * @return Generator
     */
    private function getIssuesFromDocuments($documents): Generator
    {
        /** @var Document $document */
        foreach ($documents as $document) {
            // Set title for display in calendar view.
            if (!empty($document->getTitle())) {
                $title = $document->getTitle();
            } else {
                $title = !empty($document->getMetsLabel()) ? $document->getMetsLabel() : $document->getMetsOrderlabel();
                if (strtotime($title) !== false) {
                    $title = strftime('%x', strtotime($title));
                }
            }
            yield [
                'uid' => $document->getUid(),
                'title' => $title,
                'year' => $document->getYear()
            ];
        }
    }
}
