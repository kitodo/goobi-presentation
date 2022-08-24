/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

class dlfController {
    constructor() {
        document.body.addEventListener('tx-dlf-pageChanged', this.onPageChanged.bind(this));
        document.body.addEventListener('tx-dlf-configChanged', this.onConfigChanged.bind(this));
        window.addEventListener('popstate', this.onPopState.bind(this));

        // Set initial state, so that browser navigation also works initial page
        history.replaceState(/** @type {dlf.PageHistoryState} */({
            type: 'tx-dlf-page-state',
            documentId: tx_dlf_loaded.state.documentId,
            page: tx_dlf_loaded.state.page,
            simultaneousPages: tx_dlf_loaded.state.simultaneousPages,
        }), '');

        this.updateMultiPage();
    }

    /**
     * @private
     * @param {dlf.PageChangeEvent} e
     */
    onPageChanged(e) {
        this.pushHistory(e);
    }

    /**
     * @private
     * @param {dlf.ConfigChangeEvent} e
     */
    onConfigChanged(e) {
        this.pushHistory(e);
        this.updateMultiPage();
    }

    /**
     * @private
     * @param {PopStateEvent} e
     */
    onPopState(e) {
        if (e.state == null || e.state.type !== 'tx-dlf-page-state') {
            return;
        }

        const state = /** @type {dlf.PageHistoryState} */(e.state);
        if (state.documentId !== tx_dlf_loaded.state.documentId) {
            return;
        }

        if (state.page !== tx_dlf_loaded.state.page) {
            e.preventDefault();

            // TODO: Avoid redundancy to Navigation
            tx_dlf_loaded.state.page = state.page;
            document.body.dispatchEvent(
                new CustomEvent(
                    'tx-dlf-pageChanged',
                    {
                        'detail': {
                            'source': 'history',
                            'page': state.page,
                        }
                    }
                )
            );
        }

        if (state.simultaneousPages !== tx_dlf_loaded.state.simultaneousPages) {
            e.preventDefault();

            tx_dlf_loaded.state.simultaneousPages = state.simultaneousPages;
            document.body.dispatchEvent(
                new CustomEvent(
                    'tx-dlf-configChanged',
                    {
                        'detail': {
                            'source': 'history',
                            'simultaneousPages': state.simultaneousPages,
                        }
                    }
                )
            );
        }
    }

    /**
     * @private
     * @param {dlf.PageChangeEvent | dlf.ConfigChangeEvent} e
     */
    pushHistory(e) {
        // Avoid loop of pushState/dispatchEvent
        if (e.detail.source === 'history') {
            return;
        }

        // TODO: Set URL
        history.pushState(/** @type {dlf.PageHistoryState} */({
            type: 'tx-dlf-page-state',
            documentId: tx_dlf_loaded.state.documentId,
            page: tx_dlf_loaded.state.page,
            simultaneousPages: tx_dlf_loaded.state.simultaneousPages,
        }), '');
    }

    /**
     * @private
     */
    updateMultiPage() {
        const { simultaneousPages } = tx_dlf_loaded.state;

        if (simultaneousPages === 1) {
            document.body.classList.add('page-single');
            document.body.classList.remove('page-double');
        } else if (simultaneousPages === 2) {
            document.body.classList.remove('page-single');
            document.body.classList.add('page-double');
        }
    }
}
