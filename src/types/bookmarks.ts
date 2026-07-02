export interface BookmarkLinkData {
    id: string;
    title: string;
    url: string;
}

export interface BookmarkCategoryData {
    category: string;
    icon?: string;
    links: BookmarkLinkData[];
}
