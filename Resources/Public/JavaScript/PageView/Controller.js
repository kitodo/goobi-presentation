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
    constructor(doc) {
        /** @private */
        this.doc = doc;

        document.body.addEventListener('tx-dlf-stateChanged', this.onStateChanged.bind(this));
        window.addEventListener('popstate', this.onPopState.bind(this));

        // Set initial state, so that browser navigation also works initial page
        history.replaceState(/** @type {dlf.PageHistoryState} */({
            type: 'tx-dlf-page-state',
            documentId: this.doc.state.documentId,
            page: this.doc.state.page,
            simultaneousPages: this.doc.state.simultaneousPages,
        }), '');

        this.updateMultiPage(this.doc.state.simultaneousPages);
    }

    getVisiblePages(firstPageNo = this.doc.state.page) {
        const result = [];
        for (let i = 0; i < this.doc.state.simultaneousPages; i++) {
            const pageNo = firstPageNo + i;
            const pageObj = this.doc.document.pages[pageNo - 1];
            if (pageObj !== undefined) {
                result.push({ pageNo, pageObj });
            }
        }
        return result;
    };

    /**
     * @param {dlf.StateChangeDetail} detail
     */
    changeState(detail) {
        if (detail.page !== undefined) {
            this.doc.state.page = detail.page;
        }
        if (detail.simultaneousPages !== undefined) {
            this.doc.state.simultaneousPages = detail.simultaneousPages;
        }
        document.body.dispatchEvent(new CustomEvent('tx-dlf-stateChanged', { detail }));
    }

    /**
     * @param {number} pageNo
     * @param {boolean} pageGrid
     */
    makePageUrl(pageNo, pageGrid = false) {
        const doublePage = this.doc.state.simultaneousPages >= 2 ? 1 : 0;
        return this.doc.urlTemplate
            .replace(/DOUBLE_PAGE/, doublePage)
            .replace(/PAGE_NO/, pageNo)
            .replace(/PAGE_GRID/, pageGrid ? "1" : "0");
    }

    /**
     * @private
     * @param {dlf.StateChangeEvent} e
     */
    onStateChanged(e) {
        this.pushHistory(e);

        if (e.detail.simultaneousPages !== undefined) {
            this.updateMultiPage(e.detail.simultaneousPages);
        }
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
        if (state.documentId !== this.doc.state.documentId) {
            return;
        }

        if (state.page !== this.doc.state.page) {
            e.preventDefault();

            this.changeState({
                'source': 'history',
                'page': state.page,
            });
        }

        if (state.simultaneousPages !== this.doc.state.simultaneousPages) {
            e.preventDefault();
            this.changeState({
                'source': 'history',
                'simultaneousPages': state.simultaneousPages,
            });
        }
    }

    /**
     * @private
     * @param {dlf.StateChangeEvent} e
     */
    pushHistory(e) {
        // Avoid loop of pushState/dispatchEvent
        if (e.detail.source === 'history') {
            return;
        }

        history.pushState(/** @type {dlf.PageHistoryState} */({
            type: 'tx-dlf-page-state',
            documentId: this.doc.state.documentId,
            page: this.doc.state.page,
            simultaneousPages: this.doc.state.simultaneousPages,
        }), '', this.makePageUrl(this.doc.state.page));
    }

    /**
     * @private
     * @param {number} simultaneousPages
     */
    updateMultiPage(simultaneousPages) {
        if (simultaneousPages === 1) {
            document.body.classList.add('page-single');
            document.body.classList.remove('page-double');
        } else if (simultaneousPages === 2) {
            document.body.classList.remove('page-single');
            document.body.classList.add('page-double');
        }
    }
}
