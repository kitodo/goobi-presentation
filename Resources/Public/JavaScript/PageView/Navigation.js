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

        this.registerEvents();
    }

    /**
     * @private
     */
    registerEvents() {
        if (this.config.features.pageStepBack) {
            const btn = document.querySelector('.page-step-back');
            if (btn !== null) {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.changePage(tx_dlf_loaded.state.page - this.config.pageSteps, e);
                });
            }
        }

        if (this.config.features.pageBack) {
            const btn = document.querySelector('.page-back');
            if (btn !== null) {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.changePage(tx_dlf_loaded.state.page - 1, e);
                });
            }
        }

        if (this.config.features.pageFirst) {
            const btn = document.querySelector('.page-first');
            if (btn !== null) {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.changePage(1, e);
                });
            }
        }

        if (this.config.features.pageStepForward) {
            const btn = document.querySelector('.page-step-forward');
            if (btn !== null) {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.changePage(tx_dlf_loaded.state.page + this.config.pageSteps, e);
                });
            }
        }

        if (this.config.features.pageForward) {
            const btn = document.querySelector('.page-forward');
            if (btn !== null) {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.changePage(tx_dlf_loaded.state.page + 1, e);
                });
            }
        }

        if (this.config.features.pageLast) {
            const btn = document.querySelector('.page-last');
            if (btn !== null) {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    this.changePage(tx_dlf_loaded.document.length, e);
                });
            }
        }
    }

    /**
     * @param {number} pageNo
     * @param {MouseEvent} e
     * @private
     */
    changePage(pageNo, e) {
        const pageNoClamped = Math.max(1, Math.min(tx_dlf_loaded.document.length, pageNo));

        tx_dlf_loaded.state.page = pageNoClamped;
        document.body.dispatchEvent(
            new CustomEvent(
                'tx-dlf-pageChanged',
                {
                    'detail': {
                        'page': pageNoClamped,
                        'target': e.target
                    }
                }
            )
        );
    }
}
