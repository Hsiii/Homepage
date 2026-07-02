export interface BookmarkLinkData {
    id: string;
    title: string;
    url: string;
}

export interface BookmarkCategoryData {
    category: string;
    links: BookmarkLinkData[];
}
