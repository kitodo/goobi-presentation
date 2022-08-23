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
        this.updateNavigationButtons();
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

    }

    /**
     * @param {number} pageNo
     * @param {MouseEvent} e
     * @private
     */
    changePage(pageNo, e) {
        if (pageNo !== tx_dlf_loaded.state.page) {
            tx_dlf_loaded.state.page = pageNo;
            document.body.dispatchEvent(
                new CustomEvent(
                    'tx-dlf-pageChanged',
                    {
                        'detail': {
                            'page': pageNo,
                            'pageObj': tx_dlf_loaded.document[pageNo - 1],
                            'target': e.target
                        }
                    }
                )
            );
            this.updateNavigationButtons();
        }
    }

    /**
     * Update DOM state of navigation buttons, for example, to enable/disable
     * them depending on current page.
     *
     * @private
     */
    updateNavigationButtons() {
        for (const [key, value] of Object.entries(this.navigationButtons)) {
            const btnPageNo = value.getPage(tx_dlf_loaded.state.page);
            if (btnPageNo !== tx_dlf_loaded.state.page && 1 <= btnPageNo && btnPageNo <= tx_dlf_loaded.document.length) {
                value.button.classList.remove('disabled');
            } else {
                value.button.classList.add('disabled');
            }
        }
    }
}
