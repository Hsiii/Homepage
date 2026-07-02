import React from 'react';

import type { BookmarkControls } from '@/hooks/useBookmarks';
import { useWallpaper } from '@/hooks/useWallpaper';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { SettingsMenu } from './SettingsMenu';

interface WallpaperSettingsMenuProps {
    bookmarkControls: BookmarkControls;
    closeSignal?: number;
    initialWallpaper: WallpaperAsset | undefined;
    onWallpaperChange?: (wallpaper: WallpaperAsset | undefined) => void;
    placement?: 'above' | 'below';
}

export const WallpaperSettingsMenu: React.FC<WallpaperSettingsMenuProps> = ({
    closeSignal,
    bookmarkControls,
    initialWallpaper,
    onWallpaperChange,
    placement,
}) => {
    const wallpaperControls = useWallpaper(initialWallpaper, onWallpaperChange);

    return (
        <SettingsMenu
            bookmarkControls={bookmarkControls}
            closeSignal={closeSignal}
            placement={placement}
            wallpaperControls={wallpaperControls}
        />
    );
};
