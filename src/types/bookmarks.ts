export interface BookmarkLinkData {
    id: string;
    title: string;
    type: 'link';
    url: string;
}

export interface BookmarkFolderData {
    children: BookmarkNodeData[];
    id: string;
    title: string;
    type: 'folder';
}

export type BookmarkNodeData = BookmarkFolderData | BookmarkLinkData;

export interface BookmarkCategoryData {
    category: string;
    children: BookmarkNodeData[];
    id: string;
    icon?: string;
    links: BookmarkLinkData[];
}
