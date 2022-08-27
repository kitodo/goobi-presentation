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
    /**
     *
     * @param {dlf.Loaded} doc
     */
    constructor(doc) {
        /** @private */
        this.doc = doc;

        this.eventTarget.addEventListener('tx-dlf-stateChanged', this.onStateChanged.bind(this));
        window.addEventListener('popstate', this.onPopState.bind(this));

        // Set initial state, so that browser navigation also works initial page
        history.replaceState(/** @type {dlf.PageHistoryState} */({
            type: 'tx-dlf-page-state',
            ...this.doc.state
        }), '');

        this.updateMultiPage(this.simultaneousPages);

        if (doc.metadataUrl !== null) {
            this.metadataPromise = fetch(doc.metadataUrl)
                .then(response => response.text())
                .then(html => ({
                    htmlCode: html,
                }));
        } else {
            this.metadataPromise = Promise.reject();
        }
    }

    /**
     * Get event target on which stateChanged events are dispatched.
     *
     * TODO(client-side): Either make this customizable, e.g. use some top-level wrapper element, or make dlfController the EventTarget
     *
     * @returns {EventTarget}
     */
    get eventTarget() {
        return document.body;
    }

    get documentId() {
        return this.doc.state.documentId;
    }

    get currentPageNo() {
        return this.doc.state.page;
    }

    get simultaneousPages() {
        return this.doc.state.simultaneousPages;
    }

    getVisiblePages(firstPageNo = this.doc.state.page) {
        const result = [];
        for (let i = 0; i < this.simultaneousPages; i++) {
            const pageNo = firstPageNo + i;
            const pageObj = this.doc.document.pages[pageNo - 1];
            if (pageObj !== undefined) {
                result.push({ pageNo, pageObj });
            }
        }
        return result;
    }

    /**
     *
     * @param {number} pageNo
     * @returns {dlf.PageObject | undefined}
     */
    getPageByNo(pageNo) {
        return this.doc.document.pages[pageNo - 1];
    }

    get numPages() {
        return this.doc.document.pages.length;
    }

    /**
     *
     * @param {number} pageNo
     * @param {string[]} fileGroups
     * @returns {dlf.ResourceLocator | undefined}
     */
    findFileByGroup(pageNo, fileGroups) {
        const pageObj = this.getPageByNo(pageNo);
        if (pageObj === undefined) {
            return;
        }

        return dlfUtils.findFirstSet(pageObj.files, fileGroups);
    }

    /**
     *
     * @param {number} pageNo
     * @param {dlf.FileKind} fileKind
     * @returns {dlf.ResourceLocator | undefined}
     */
    findFileByKind(pageNo, fileKind) {
        return this.findFileByGroup(pageNo, this.doc.fileGroups[fileKind]);
    }

    fetchMetadata() {
        return this.metadataPromise;
    }

    /**
     * @param {dlf.StateChangeDetail} detail
     */
    changeState(detail) {
        // TODO(client-side): Consider passing full new state in stateChanged event,
        //                    then reduce usage of currentPageNo and simultaneousPages properties

        if (detail.page !== undefined) {
            this.doc.state.page = detail.page;
        }
        if (detail.simultaneousPages !== undefined) {
            this.doc.state.simultaneousPages = detail.simultaneousPages;
        }
        document.body.dispatchEvent(new CustomEvent('tx-dlf-stateChanged', { detail }));
    }

    /**
     * Navigate to given page.
     *
     * @param {number} pageNo
     */
    changePage(pageNo) {
        const clampedPageNo = Math.max(1, Math.min(this.numPages, pageNo));
        if (clampedPageNo !== this.doc.state.page) {
            this.changeState({
                source: 'navigation',
                page: clampedPageNo,
            });
        }
    }

    /**
     * @param {number} pageNo
     * @param {boolean} pageGrid
     */
    makePageUrl(pageNo, pageGrid = false) {
        const doublePage = this.simultaneousPages >= 2 ? 1 : 0;
        return this.doc.urlTemplate
            .replace(/DOUBLE_PAGE/, doublePage)
            .replace(/PAGE_NO/, pageNo)
            .replace(/PAGE_GRID/, pageGrid ? '1' : '0');
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

        e.preventDefault();
        this.changeState({
            'source': 'history',
            'page': state.page === this.currentPageNo ? undefined : state.page,
            'simultaneousPages': state.simultaneousPages === this.simultaneousPages ? undefined : state.simultaneousPages
        });
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
            ...this.doc.state
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
