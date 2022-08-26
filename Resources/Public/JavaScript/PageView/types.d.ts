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

    type StateChangeEvent = CustomEvent<StateChangeDetail>;

    type StateChangeDetail = {
        /**
         * Who triggered the event.
         * * `history`: Event is trigerred due to history popstate. This is used
         *   to avoid pushing a popped state again.
         * * `history`: Event is triggered by user navigation.
         */
        source: 'history' | 'navigation';
        page?: number;
        simultaneousPages?: number;
    };

    /**
     * State of document stored in `window.history`.
     */
    type PageHistoryState = {
        type: 'tx-dlf-page-state';
        documentId: string | number;
        page: number;
        simultaneousPages: number;
    };
}
