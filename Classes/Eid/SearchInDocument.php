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

namespace Kitodo\Dlf\Eid;

use Kitodo\Dlf\Common\Helper;
use Kitodo\Dlf\Common\Solr\Solr;
use Kitodo\Dlf\Common\Solr\SearchResult\ResultDocument;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * eID search in document for plugin 'Search' of the 'dlf' extension
 *
 * @author Alexander Bigga <alexander.bigga@slub-dresden.de>
 * @package TYPO3
 * @subpackage dlf
 * @access public
 */
class SearchInDocument
{
    /**
     * The main method of the eID script
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface JSON response of search suggestions
     */
    public function main(ServerRequestInterface $request)
    {
        $output = [
            'documents' => [],
            'numFound' => 0
        ];
        // Get input parameters and decrypt core name.
        $parameters = $request->getParsedBody();
        if ($parameters === null) {
            throw new \InvalidArgumentException('No parameters passed!', 1632322297);
        }
        $encrypted = (string) $parameters['encrypted'];
        $start = intval($parameters['start']);
        if (empty($encrypted)) {
            throw new \InvalidArgumentException('No valid parameter passed!', 1580585079);
        }

        $core = Helper::decrypt($encrypted);

        // Perform Solr query.
        $solr = Solr::getInstance($core);
        $fields = Solr::getFields();

        if ($solr->ready) {
            $query = $solr->service->createSelect();
            $query->setFields([$fields['id'], $fields['uid'], $fields['page']]);
            $query->setQuery($this->getQuery($fields, $parameters));
            $query->setStart($start)->setRows(20);
            $query->addSort($fields['page'], $query::SORT_ASC);
            $query->getHighlighting();
            $solrRequest = $solr->service->createRequest($query);

            // it is necessary to add the custom parameters to the request
            // because query object doesn't allow custom parameters

            // field for which highlighting is going to be performed,
            // is required if you want to have OCR highlighting
            $solrRequest->addParam('hl.ocr.fl', $fields['fulltext']);
            // return the coordinates of highlighted search as absolute coordinates
            $solrRequest->addParam('hl.ocr.absoluteHighlights', 'on');
            // max amount of snippets for a single page
            $solrRequest->addParam('hl.snippets', 40);
            // we store the fulltext on page level and can disable this option
            $solrRequest->addParam('hl.ocr.trackPages', 'off');

            $response = $solr->service->executeRequest($solrRequest);
            $result = $solr->service->createResult($query, $response);
            /** @scrutinizer ignore-call */
            $output['numFound'] = $result->getNumFound();
            $data = $result->getData();
            $highlighting = $data['ocrHighlighting'];

            foreach ($result as $record) {
                $resultDocument = new ResultDocument($record, $highlighting, $fields);

                $document = [
                    'id' => $resultDocument->getId(),
                    'uid' => !empty($resultDocument->getUid()) ? $resultDocument->getUid() : $parameters['uid'],
                    'page' => $resultDocument->getPage(),
                    'snippet' => $resultDocument->getSnippets(),
                    'highlight' => $resultDocument->getHighlightsIds()
                ];
                $output['documents'][] = $document;
            }
        }
        // Create response object.
        /** @var Response $response */
        $response = GeneralUtility::makeInstance(Response::class);
        $response->getBody()->write(json_encode($output));
        return $response;
    }

    /**
     * Build SOLR query for given fields and parameters.
     *
     * @access private
     *
     * @param array $fields array of SOLR index fields
     * @param array|object $parameters parsed from request body
     *
     * @return string SOLR query
     */
    private function getQuery($fields, $parameters)
    {
        return $fields['fulltext'] . ':(' . Solr::escapeQuery((string) $parameters['q']) . ') AND ' . $fields['uid'] . ':' . $this->getUid($parameters['uid']);
    }

    /**
     * Check if uid is number, if yes convert it to int,
     * otherwise leave uid not changed.
     *
     * @access private
     *
     * @param string $uid of the document
     *
     * @return int|string uid of the document
     */
    private function getUid($uid)
    {
        return is_numeric($uid) ? intval($uid) : $uid;
    }
}
