/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

class dlfNavigation {
    /**
     *
     * @param {object} config
     * @param {Record<string, boolean | undefined>} config.features Which navigation features should
     * be handled by this instance.
     * @param {number} config.basePageSteps Number of pages to skip for long step (not yet considering
     * single/double page mode).
     */
    constructor(config) {
        /** @private */
        this.config = config;

        /**
         * @private
         */
        this.navigationButtons = {
            pageStepBack: {
                button: document.querySelector('.page-step-back'),
                getPage: (prevPageNo) => prevPageNo - this.getLongStep(),
            },
            pageBack: {
                button: document.querySelector('.page-back'),
                // When we're on second page in double-page mode, make sure the "back" button is still shown
                getPage: (prevPageNo) => Math.max(1, prevPageNo - tx_dlf_loaded.state.simultaneousPages),
            },
            pageFirst: {
                button: document.querySelector('.page-first'),
                getPage: (prevPageNo) => 1,
            },
            pageStepForward: {
                button: document.querySelector('.page-step-forward'),
                getPage: (prevPageNo) => prevPageNo + this.getLongStep(),
            },
            pageForward: {
                button: document.querySelector('.page-forward'),
                getPage: (prevPageNo) => prevPageNo + tx_dlf_loaded.state.simultaneousPages,
            },
            pageLast: {
                button: document.querySelector('.page-last'),
                getPage: (prevPageNo) => tx_dlf_loaded.document.pages.length - (tx_dlf_loaded.simultaneousPages - 1),
            },
        }

        /** @private */
        this.pageSelect = document.querySelector('.page-select')

        this.registerEvents();
        this.updateNavigationControls();
    }

    /**
     * @private
     */
    registerEvents() {
        for (const [key, value] of Object.entries(this.navigationButtons)) {
            if (this.config.features[key]) {
                value.button.addEventListener('click', e => {
                    e.preventDefault();

                    const pageNo = value.getPage(tx_dlf_loaded.state.page);
                    const clampedPageNo = Math.max(1, Math.min(tx_dlf_loaded.document.pages.length, pageNo));
                    this.changePage(clampedPageNo, e);
                });
            }
        }

        this.pageSelect.addEventListener('change', e => {
            e.preventDefault();

            const pageNo = e.target.value;
            const clampedPageNo = Math.max(1, Math.min(tx_dlf_loaded.document.pages.length, pageNo));
            this.changePage(clampedPageNo, e);
        });

        document.body.addEventListener('tx-dlf-pageChanged', this.onPageChanged.bind(this));
        document.body.addEventListener('tx-dlf-configChanged', this.onConfigChanged.bind(this));
    }

    /**
     *
     * @param {dlf.PageChangeEvent} e
     */
    onPageChanged(e) {
        this.updateNavigationControls();
    }

    /**
     *
     * @param {dlf.ConfigChangeEvent} e
     */
    onConfigChanged(e) {
        this.updateNavigationControls();
    }

    /**
     * @param {number} pageNo
     * @param {MouseEvent} e
     * @private
     */
    changePage(pageNo, e) {
        if (pageNo !== tx_dlf_loaded.state.page) {
            // TODO: Avoid redundancy to Controller
            tx_dlf_loaded.state.page = pageNo;
            document.body.dispatchEvent(
                new CustomEvent(
                    'tx-dlf-pageChanged',
                    {
                        'detail': {
                            'source': 'navigation',
                            'page': pageNo,
                        }
                    }
                )
            );
        }
    }

    /**
     * Number of pages to jump in long step (e.g., 10 pages in single page mode
     * vs. 20 pages in double page mode).
     *
     * @protected
     * @returns {number}
     */
    getLongStep() {
        return this.config.basePageSteps * tx_dlf_loaded.state.simultaneousPages;
    }

    /**
     * Update DOM state of navigation buttons and dropdown. (For example,
     * enable/disable the buttons depending on current page.)
     *
     * @private
     */
    updateNavigationControls() {
        for (const [key, value] of Object.entries(this.navigationButtons)) {
            const btnPageNo = value.getPage(tx_dlf_loaded.state.page);
            if (btnPageNo !== tx_dlf_loaded.state.page && 1 <= btnPageNo && btnPageNo <= tx_dlf_loaded.document.pages.length) {
                value.button.classList.remove('disabled');
            } else {
                value.button.classList.add('disabled');
            }
            // TODO: check if it needs to be done always or only for not disabled buttons
            this.updateUrl(value.button, value.getPage(tx_dlf_loaded.state.page));

            const textTemplate = value.button.getAttribute('data-text');
            if (textTemplate) {
                value.button.textContent = textTemplate.replace(/PAGE_STEPS/, this.getLongStep());
            }
        }

        if (this.pageSelect instanceof HTMLSelectElement) {
            this.pageSelect.value = tx_dlf_loaded.state.page;
        }
    }

    /**
     * Update URLs of navigation buttons.
     *
     * @private
     */
    updateUrl(button, page) {
        var currentLink = button.getAttribute('href');
        var queryParams = this.getQueryParams(currentLink);
        var queryParam;
        var pageParamIndex = -1;

        for (var i = 0; i < queryParams.length; i++) {
            queryParam = queryParams[i].split('=');

            if (queryParam[0].indexOf('page') != -1) {
                pageParamIndex = i;
                queryParam[1] = page;
                break;
            }
        }

        // update page number if it was found and assigned
        if (pageParamIndex > -1) {
            queryParams[pageParamIndex] = queryParam[0] + '=' + queryParam[1];
        }

        const url = currentLink.split("?");
        if (url.length > 1) {
            currentLink = url[0] + '?';
            // overwrite all query params
            for (var i = 0; i < queryParams.length; i++) {
                currentLink += queryParams[i] + '&';
            }
        }

        button.setAttribute('href', currentLink);
    }

    /**
     * Get  URLs of navigation buttons.
     *
     * @private
     */
    getQueryParams(baseUrl) {
        if (baseUrl.indexOf('?') > 0) {
            return baseUrl.slice(baseUrl.indexOf('?') + 1).split('&');
        }

        return [];
    }
}
