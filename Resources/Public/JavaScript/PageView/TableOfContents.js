/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

const dlfTocState = {
    Normal: 0,
    Current: 1,
    Active: 2,
};

class dlfTableOfContents {
    /**
     *
     * @param {dlfController} docController
     */
    constructor(docController) {
        /** @private */
        this.docController = docController;
        /** @private */
        this.tocItems = document.querySelectorAll('[data-toc-item]');
        /** @private */
        this.tocLinks = document.querySelectorAll('[data-toc-link]');

        this.tocLinks.forEach((link) => {
            const documentId = link.getAttribute('data-document-id');
            if (documentId && documentId !== this.docController.documentId) {
                return;
            }

            const pageNo = Number(link.getAttribute('data-page'));
            link.addEventListener('click', e => {
                e.preventDefault();
                this.docController.changePage(pageNo);
            });
        });

        docController.eventTarget.addEventListener('tx-dlf-stateChanged', this.onStateChanged.bind(this));
    }

    /**
     * @private
     * @param {dlf.StateChangeEvent} e
     */
    onStateChanged(e) {
        const activeLogSections = [];
        // TODO(client-side): Add toplevel sections
        for (const page of this.docController.getVisiblePages()) {
            activeLogSections.push(...page.pageObj.logSections);
        }

        // TODO(client-side): TOC from DB

        // See TableOfContentsController::getMenuEntry()
        this.tocItems.forEach((tocItem) => {
            let tocItemState = dlfTocState.Normal;
            let isExpanded = Boolean(tocItem.getAttribute('data-toc-expand-always'));

            const isCurrent = activeLogSections.includes(tocItem.getAttribute('data-dlf-section'));
            if (isCurrent) {
                tocItemState = dlfTocState.Current;
            }

            const children = Array.from(tocItem.querySelectorAll('[data-toc-item]'));
            if (children.length > 0 && isCurrent) {
                // TODO(client-side): check depth?
                const isActive = children.some(tocItemChild => activeLogSections.includes(tocItemChild.getAttribute('data-dlf-section')));
                if (isActive) {
                    tocItemState = dlfTocState.Active;
                }

                isExpanded = true;
            }

            if (tocItemState === dlfTocState.Normal) {
                tocItem.classList.add('tx-dlf-toc-no');
            } else {
                tocItem.classList.remove('tx-dlf-toc-no');
            }

            if (tocItemState === dlfTocState.Active) {
                tocItem.classList.add('active', 'tx-dlf-toc-act');
            } else {
                tocItem.classList.remove('active', 'tx-dlf-toc-act');
            }

            if (tocItemState === dlfTocState.Current) {
                tocItem.classList.add('current', 'tx-dlf-toc-cur');
            } else {
                tocItem.classList.remove('current', 'tx-dlf-toc-cur');
            }

            if (isExpanded) {
                tocItem.classList.remove('dlf-toc-collapsed');
            } else {
                tocItem.classList.add('dlf-toc-collapsed');
            }

            // "submenu" class does not change
        });
    }
}
