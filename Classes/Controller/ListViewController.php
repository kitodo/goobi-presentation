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

use Kitodo\Dlf\Common\SolrPaginator;
use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Core\Pagination\SimplePagination;
use Kitodo\Dlf\Domain\Repository\MetadataRepository;
use Kitodo\Dlf\Domain\Repository\CollectionRepository;

/**
 * Controller class for the plugin 'ListView'.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class ListViewController extends AbstractController
{
    /**
     * @access protected
     * @var CollectionRepository
     */
    protected CollectionRepository $collectionRepository;

    /**
     * @access public
     *
     * @param CollectionRepository $collectionRepository
     * 
     * @return void
     */
    public function injectCollectionRepository(CollectionRepository $collectionRepository): void
    {
        $this->collectionRepository = $collectionRepository;
    }

    /**
     * @access protected
     * @var MetadataRepository
     */
    protected MetadataRepository $metadataRepository;

    /**
     * @access public
     *
     * @param MetadataRepository $metadataRepository
     *
     * @return void
     */
    public function injectMetadataRepository(MetadataRepository $metadataRepository): void
    {
        $this->metadataRepository = $metadataRepository;
    }

    /**
     * @access protected
     * @var array The current search parameter
     */
    protected $searchParams;

    /**
     * The main method of the plugin
     *
     * @access public
     *
     * @return ResponseInterface the response
     */
    public function mainAction(): ResponseInterface
    {
        $this->searchParams = $this->getParametersSafely('searchParameter');
        $this->searchParams = is_array($this->searchParams) ? array_filter($this->searchParams, 'strlen') : [];

        // extract collection(s) from collection parameter
        $collections = [];
        if (array_key_exists('collection', $this->searchParams)) {
            foreach(explode(',', $this->searchParams['collection']) as $collectionEntry) {
                $collections[] = $this->collectionRepository->findByUid((int) $collectionEntry);
            }
        }

        // Get current page from request data because the parameter is shared between plugins
        $currentPage = $this->requestData['page'] ?? 1;

        // get all sortable metadata records
        $sortableMetadata = $this->metadataRepository->findByIsSortable(true);

        // get all metadata records to be shown in results
        $listedMetadata = $this->metadataRepository->findByIsListed(true);

        // get all indexed metadata fields
        $indexedMetadata = $this->metadataRepository->findByIndexIndexed(true);

        $solrResults = null;
        $numResults = 0;
        if (!empty($this->searchParams)) {
            $solrResults = $this->documentRepository->findSolrByCollections($collections, $this->settings, $this->searchParams, $listedMetadata, $indexedMetadata);
            $numResults = $solrResults->getNumFound();

            $itemsPerPage = $this->settings['list']['paginate']['itemsPerPage'];
            if (empty($itemsPerPage)) {
                $itemsPerPage = 25;
            }
            $solrPaginator = new SolrPaginator($solrResults, $currentPage, $itemsPerPage);
            $simplePagination = new SimplePagination($solrPaginator);

            $pagination = $this->buildSimplePagination($simplePagination, $solrPaginator);
            $this->view->assignMultiple([ 'pagination' => $pagination, 'paginator' => $solrPaginator ]);
        }

        $this->view->assign('viewData', $this->viewData);
        $this->view->assign('documents', $solrResults);
        $this->view->assign('numResults', $numResults);
        $this->view->assign('page', $currentPage);
        $this->view->assign('lastSearch', $this->searchParams);
        $this->view->assign('sortableMetadata', $sortableMetadata);
        $this->view->assign('listedMetadata', $listedMetadata);

        return $this->htmlResponse();
    }
}
