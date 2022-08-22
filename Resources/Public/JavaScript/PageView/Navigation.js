/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('.page-first')
        .addEventListener('click', function (e) {
            e.preventDefault();
            document.body.dispatchEvent(
                new CustomEvent(
                    'tx-dlf-pageChanged',
                    {
                        'detail': {
                            'page': 1,
                            'target': e.target
                        }
                    }
                )
            );
        });
});
