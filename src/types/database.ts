export type Json =
    | boolean
    | null
    | number
    | string
    | Json[]
    | { [key: string]: Json | undefined };

export interface Database {
    public: {
        CompositeTypes: Record<never, never>;
        Enums: Record<never, never>;
        Functions: Record<never, never>;
        Tables: {
            user_bookmarks: {
                Insert: {
                    categories: Json;
                    created_at?: string;
                    updated_at?: string;
                    user_id: string;
                    version?: number;
                };
                Relationships: [];
                Row: {
                    categories: Json;
                    created_at: string;
                    updated_at: string;
                    user_id: string;
                    version: number;
                };
                Update: {
                    categories?: Json;
                    created_at?: string;
                    updated_at?: string;
                    user_id?: string;
                    version?: number;
                };
            };
            user_wallpapers: {
                Insert: {
                    content_type: string;
                    created_at?: string;
                    height: number;
                    object_key: string;
                    size_bytes: number;
                    updated_at?: string;
                    user_id: string;
                    width: number;
                };
                Relationships: [];
                Row: {
                    content_type: string;
                    created_at: string;
                    height: number;
                    object_key: string;
                    size_bytes: number;
                    updated_at: string;
                    user_id: string;
                    width: number;
                };
                Update: {
                    content_type?: string;
                    created_at?: string;
                    height?: number;
                    object_key?: string;
                    size_bytes?: number;
                    updated_at?: string;
                    user_id?: string;
                    width?: number;
                };
            };
        };
        Views: Record<never, never>;
    };
}
