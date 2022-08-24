namespace dlf {
    type ResourceLocator = {
        url: string;
        mimetype: string;
    };

    type ImageDesc = ResourceLocator;
    type FulltextDesc = ResourceLocator;

    type PageObject = {
        /**
         * IDs of the logical structures that the page belongs to, ordered by depth.
         */
        logSections: string[];
        files: Record<string, dlf.FulltextDesc>;
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
