import React from 'react';

import type { BookmarkControls } from '@/hooks/useBookmarks';
import { useWallpaper } from '@/hooks/useWallpaper';
import type { InitialAppPreferences } from '@/types/preferences';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { SettingsMenu } from './SettingsMenu';

interface WallpaperSettingsMenuProps {
    bookmarkControls: BookmarkControls;
    closeSignal?: number;
    isOpen?: boolean;
    isTriggerHidden?: boolean;
    initialPreferences: InitialAppPreferences;
    onOpenChange?: (isOpen: boolean) => void;
    initialWallpaper: WallpaperAsset | undefined;
    onWallpaperChange?: (wallpaper: WallpaperAsset | undefined) => void;
    placement?: 'above' | 'below' | 'mobile';
}

export const WallpaperSettingsMenu: React.FC<WallpaperSettingsMenuProps> = ({
    closeSignal,
    isOpen,
    isTriggerHidden,
    bookmarkControls,
    initialPreferences,
    onOpenChange,
    initialWallpaper,
    onWallpaperChange,
    placement,
}) => {
    const wallpaperControls = useWallpaper(initialWallpaper, onWallpaperChange);

    return (
        <SettingsMenu
            bookmarkControls={bookmarkControls}
            closeSignal={closeSignal}
            isOpen={isOpen}
            isTriggerHidden={isTriggerHidden}
            initialPreferences={initialPreferences}
            onOpenChange={onOpenChange}
            placement={placement}
            wallpaperControls={wallpaperControls}
        />
    );
};
