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
        page: number;
        pageObj: PageObject;
    }>;
}
