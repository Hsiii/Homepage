import React from 'react';

import { useWallpaper } from '@/hooks/useWallpaper';
import { SettingsMenu } from './SettingsMenu';

interface WallpaperSettingsMenuProps {
    placement?: 'above' | 'below';
}

export const WallpaperSettingsMenu: React.FC<WallpaperSettingsMenuProps> = ({
    placement,
}) => {
    const wallpaperControls = useWallpaper();

    return (
        <SettingsMenu
            placement={placement}
            wallpaperControls={wallpaperControls}
        />
    );
};
