/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

class dlfTableOfContents {
    constructor() {
        /** @private */
        this.tocLinks = document.querySelectorAll('[data-toc-link]');
        this.tocLinks.forEach( link => {
            const documentId = link.getAttribute('data-document-id');
            if (documentId && documentId !== tx_dlf_loaded.state.documentId) {
                return;
            }

            const pageNo = Number(link.getAttribute('data-page'));
            link.addEventListener('click', e => {
                e.preventDefault();
                // TODO: Avoid redundancy to Controller
                tx_dlf_loaded.state.page = pageNo;
                document.body.dispatchEvent(new CustomEvent('tx-dlf-stateChanged', {
                    'detail': {
                        'source': 'navigation',
                        'page': pageNo,
                    }
                }));
            });
        });
    }

}
