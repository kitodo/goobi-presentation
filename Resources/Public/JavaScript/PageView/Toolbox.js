/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

class dlfToolbox {
    /**
     *
     * @param {dlfController} docController
     */
    constructor(docController) {
        /** @private */
        this.docController = docController;
        /** @private */
        this.pageLinks = document.querySelectorAll('[data-page-link]');

        docController.eventTarget.addEventListener('tx-dlf-stateChanged', this.onStateChanged.bind(this));
        this.updatePageLinks(this.docController.currentPageNo);
    }

    /**
     * @private
     * @param {dlf.StateChangeEvent} e
     */
    onStateChanged(e) {
        if (e.detail.page !== undefined) {
            this.updatePageLinks(e.detail.page);
        }
    }

    /**
     * @private
     * @param {number} firstPageNo
     */
    updatePageLinks(firstPageNo) {
        this.pageLinks.forEach(element => {
            const offset = Number(element.getAttribute('data-page-link'));
            const pageNo = firstPageNo + offset;

            const fileGroups = this.getFileGroups(element);
            const file = fileGroups !== null
                ? this.docController.findFileByGroup(pageNo, fileGroups)
                : this.docController.findFileByKind(pageNo, 'download');

            if (file === undefined) {
                $(element).hide();
                return;
            }
            $(element).show();

            if (element instanceof HTMLAnchorElement) {
                element.href = file.url;
            } else {
                element.querySelectorAll('a').forEach(linkEl => {
                    linkEl.href = file.url;
                });
            }

            const mimetypeLabelEl = element.querySelector('.dlf-mimetype-label');
            if (mimetypeLabelEl !== null) {
                // Transliterated from ToolboxController
                let mimetypeLabel = '';
                switch (file.mimetype) {
                    case 'image/jpeg':
                        mimetypeLabel = ' (JPG)';
                        break;

                    case 'image/tiff':
                        mimetypeLabel = ' (TIFF)';
                        break;
                }

                mimetypeLabelEl.textContent = mimetypeLabel;
            }
        });
    }

    /**
     * @private
     * @param {Element} element
     * @return {string[] | null}
     */
    getFileGroups(element) {
        const fileGroupsJson = element.getAttribute('data-file-groups');
        try {
            const fileGroups = JSON.parse(fileGroupsJson);
            if (Array.isArray(fileGroups) && fileGroups.every(entry => typeof entry === 'string')) {
                return fileGroups;
            }
        } catch (e) {
            //
        }

        return null;
    }
}
