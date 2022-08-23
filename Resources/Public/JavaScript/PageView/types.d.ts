namespace dlf {
    type PageObject = {
        url?: string;
        mimetype?: string;
        /**
         * IDs of the logical structures that the page belongs to, ordered by depth.
         */
        logSections: string[];
        fulltext?: {
            url: string;
            mimetype: string;
        };
    };

    type PageChangeEvent = CustomEvent<{
        source: string;
        page: number;
        pageObj: PageObject;
    }>;

    /**
     * State of document stored in `window.history`.
     */
    type PageHistoryState = {
        type: 'tx-dlf-page-state';
        documentId: string | number;
        page: number;
    };
}
