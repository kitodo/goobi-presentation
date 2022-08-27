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
     * @param {dlfController} docController
     * @param {object} config
     * @param {Record<string, boolean | undefined>} config.features Which navigation features should
     * be handled by this instance.
     * @param {number} config.basePageSteps Number of pages to skip for long step (not yet considering
     * single/double page mode).
     */
    constructor(docController, config) {
        /** @private */
        this.docController = docController;

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
                getPage: (prevPageNo) => Math.max(1, prevPageNo - this.docController.simultaneousPages),
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
                getPage: (prevPageNo) => prevPageNo + this.docController.simultaneousPages,
            },
            pageLast: {
                button: document.querySelector('.page-last'),
                getPage: (prevPageNo) => this.docController.numPages - (this.docController.simultaneousPages - 1),
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
                value.button.addEventListener('click', (e) => {
                    e.preventDefault();

                    const pageNo = value.getPage(this.docController.currentPageNo);
                    this.docController.changePage(pageNo);
                });
            }
        }

        this.pageSelect.addEventListener('change', (e) => {
            e.preventDefault();

            const pageNo = Number(e.target.value);
            this.docController.changePage(pageNo);
        });

        this.docController.eventTarget.addEventListener('tx-dlf-stateChanged', this.onStateChanged.bind(this));
    }

    /**
     * @private
     * @param {dlf.StateChangeEvent} e
     */
    onStateChanged(e) {
        this.updateNavigationControls();
    }

    /**
     * Number of pages to jump in long step (e.g., 10 pages in single page mode
     * vs. 20 pages in double page mode).
     *
     * @protected
     * @returns {number}
     */
    getLongStep() {
        return this.config.basePageSteps * this.docController.simultaneousPages;
    }

    /**
     * Update DOM state of navigation buttons and dropdown. (For example,
     * enable/disable the buttons depending on current page.)
     *
     * @param {number} pageNo
     * @private
     */
    updateNavigationControls() {
        const currentPageNo = this.docController.currentPageNo;

        for (const [key, value] of Object.entries(this.navigationButtons)) {
            const btnPageNo = value.getPage(currentPageNo);
            const isBtnPageVisible = this.docController.getVisiblePages(btnPageNo).some(page => page.pageNo === currentPageNo);
            if (!isBtnPageVisible && 1 <= btnPageNo && btnPageNo <= this.docController.numPages) {
                value.button.classList.remove('disabled');
            } else {
                value.button.classList.add('disabled');
            }
            // TODO(client-side): Check if it needs to be done always or only for not disabled buttons
            this.updateUrl(value.button, btnPageNo);

            const textTemplate = value.button.getAttribute('data-text');
            if (textTemplate) {
                value.button.textContent = textTemplate.replace(/PAGE_STEPS/, this.getLongStep());
            }
        }

        if (this.pageSelect instanceof HTMLSelectElement) {
            this.pageSelect.value = currentPageNo.toString();
        }
    }

    /**
     * Update URLs of navigation buttons.
     *
     * @private
     */
    updateUrl(button, page) {
        button.setAttribute('href', this.docController.makePageUrl(page));
    }
}
