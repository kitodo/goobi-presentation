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
    constructor() {
        /** @private */
        this.pageLinks = document.querySelectorAll('[data-page-link]');

        document.body.addEventListener('tx-dlf-pageChanged', this.onPageChanged.bind(this));
    }

    /**
     * @private
     * @param {dlf.PageChangeEvent} e
     */
    onPageChanged(e) {
        this.pageLinks.forEach(element => {
            const offset = Number(element.getAttribute('data-page-link'));
            const pageObj = tx_dlf_loaded.document.pages[e.detail.page - 1 + offset];
            if (pageObj && pageObj.download) {
                element.href = pageObj.download.url;
            }
        });
    }
}
