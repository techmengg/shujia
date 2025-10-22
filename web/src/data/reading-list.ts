export interface ReadingListItem {
    id: string;
    mangaId: string;
    title: string;
    altTitles: string[];
    description?: string | null;
    status?: string | null;
    year?: number | null;
    contentRating?: string | null;
    demographic?: string | null;
    latestChapter?: string | null;
    languages: string[];
    tags: string[];
    cover?: string | null;
    url: string;
    progress?: string | null;
    rating?: number | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReadingListResponse {
    data: ReadingListItem[];
}

export interface AddReadingListPayload {
    mangaId: string;
    progress?: string;
    rating?: number;
    notes?: string;
}
