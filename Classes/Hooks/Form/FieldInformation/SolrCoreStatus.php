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

namespace Kitodo\Dlf\Hooks\Form\FieldInformation;

use IntlDateFormatter;
use Kitodo\Dlf\Common\Helper;
use Kitodo\Dlf\Common\Solr\Solr;
use TYPO3\CMS\Backend\Form\AbstractNode;
use TYPO3\CMS\Core\Localization\DateFormatter;
use TYPO3\CMS\Core\Messaging\FlashMessage;

/**
 * FieldInformation renderType for TYPO3 FormEngine
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class SolrCoreStatus extends AbstractNode
{
    /**
     * Shows Solr core status for given 'index_name'
     *
     * @access public
     *
     * @return array As defined in initializeResultArray() of AbstractNode. Allowed tags are: "<a><br><br/><div><em><i><p><strong><span><code>"
     */
    public function render(): array
    {
        $result = $this->initializeResultArray();
        $dateFormatter = new DateFormatter();
        // Show only when editing existing records.
        if ($this->data['command'] !== 'new') {
            $core = $this->data['databaseRow']['index_name'];
            // Load localization file.
            Helper::getLanguageService()->includeLLFile('EXT:dlf/Resources/Private/Language/locallang_be.xlf');
            // Get Solr instance.
            $solr = Solr::getInstance($core);
            if ($solr->ready) {
                // Get core data.
                $coreAdminQuery = $solr->service->createCoreAdmin();
                $action = $coreAdminQuery->createStatus();
                $action->setCore($core);
                $coreAdminQuery->setAction($action);
                $response = $solr->service->coreAdmin($coreAdminQuery)->getStatusResult();
                if ($response) {
                    $uptimeInSeconds = floor($response->getUptime() / 1000);
                    $dateTimeFrom = new \DateTime('@0');
                    $dateTimeTo = new \DateTime("@$uptimeInSeconds");
                    $uptime = $dateTimeFrom->diff($dateTimeTo)->format('%a ' . Helper::getLanguageService()->getLL('flash.days') . ', %H:%I:%S');
                    $numDocuments = $response->getNumberOfDocuments();
                    $startTime = $response->getStartTime() ? $dateFormatter->strftime('%c', $response->getStartTime()->getTimestamp(), Helper::getLanguageService()->lang) : 'N/A';
                    $lastModified = $response->getLastModified() ? $dateFormatter->strftime('%c', $response->getLastModified()->getTimestamp(), Helper::getLanguageService()->lang) : 'N/A';
                    // Create flash message.
                    Helper::addMessage(
                        sprintf(Helper::getLanguageService()->getLL('flash.coreStatus'), $startTime, $uptime, $lastModified, $numDocuments),
                        '', // We must not set a title/header, because <h4> isn't allowed in FieldInformation.
                        FlashMessage::INFO
                    );
                }
            } else {
                // Could not fetch core status.
                Helper::addMessage(
                    Helper::getLanguageService()->getLL('solr.error'),
                    '', // We must not set a title/header, because <h4> isn't allowed in FieldInformation.
                    FlashMessage::ERROR
                );
            }
            // Add message to result array.
            $result['html'] = Helper::renderFlashMessages();
        }
        return $result;
    }
}
