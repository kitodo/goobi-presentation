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
     * @param {number} config.pageSteps Number of pages to skip for long step (currently calculated for
     * double page mode)
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
                getPage: (prevPageNo) => prevPageNo - this.config.pageSteps,
            },
            pageBack: {
                button: document.querySelector('.page-back'),
                getPage: (prevPageNo) => prevPageNo - 1,
            },
            pageFirst: {
                button: document.querySelector('.page-first'),
                getPage: (prevPageNo) => 1,
            },
            pageStepForward: {
                button: document.querySelector('.page-step-forward'),
                getPage: (prevPageNo) => prevPageNo + this.config.pageSteps,
            },
            pageForward: {
                button: document.querySelector('.page-forward'),
                getPage: (prevPageNo) => prevPageNo + 1,
            },
            pageLast: {
                button: document.querySelector('.page-last'),
                getPage: (prevPageNo) => tx_dlf_loaded.document.length,
            },
        }

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
                    const clampedPageNo = Math.max(1, Math.min(tx_dlf_loaded.document.length, pageNo));
                    this.changePage(clampedPageNo, e);
                });
            }
        }

        this.pageSelect.addEventListener('change', e => {
            e.preventDefault();

            const pageNo = e.target.value;
            const clampedPageNo = Math.max(1, Math.min(tx_dlf_loaded.document.length, pageNo));
            this.changePage(clampedPageNo, e);
        });

        document.body.addEventListener('tx-dlf-pageChanged', this.onPageChanged.bind(this));
    }

    /**
     *
     * @param {dlf.PageChangeEvent} e
     */
    onPageChanged(e) {
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
                            'pageObj': tx_dlf_loaded.document[pageNo - 1],
                            'target': e.target
                        }
                    }
                )
            );
        }
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
            if (btnPageNo !== tx_dlf_loaded.state.page && 1 <= btnPageNo && btnPageNo <= tx_dlf_loaded.document.length) {
                value.button.classList.remove('disabled');
            } else {
                value.button.classList.add('disabled');
            }
            // TODO: check if it needs to be done always or only for not disabled buttons
            this.updateUrl(value.button, value.getPage(tx_dlf_loaded.state.page));
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
        if(baseUrl.indexOf('?') > 0) {
            return baseUrl.slice(baseUrl.indexOf('?') + 1).split('&');
        }

        return [];
    }
}
