import React from 'react';

import { useWallpaper } from '@/hooks/useWallpaper';
import { SettingsMenu } from './SettingsMenu';

interface WallpaperSettingsMenuProps {
    closeSignal?: number;
    placement?: 'above' | 'below';
}

export const WallpaperSettingsMenu: React.FC<WallpaperSettingsMenuProps> = ({
    closeSignal,
    placement,
}) => {
    const wallpaperControls = useWallpaper();

    return (
        <SettingsMenu
            closeSignal={closeSignal}
            placement={placement}
            wallpaperControls={wallpaperControls}
        />
    );
};
