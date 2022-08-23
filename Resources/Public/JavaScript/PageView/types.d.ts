namespace dlf {
    type PageObject = {
        url?: string;
        mimetype?: string;
        /**
         * IDs of the logical structures that the page belongs to, ordered by depth.
         */
        logSections: string[];
    };

    type PageChangeEvent = CustomEvent<{
        page: number;
        pageObj: PageObject;
    }>;
}
