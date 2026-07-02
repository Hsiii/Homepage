import React from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

import type { BookmarkControls } from '@/hooks/useBookmarks';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { UserFloatingBar } from './UserFloatingBar';

interface ControlsProps {
    bookmarkControls: BookmarkControls;
    initialWallpaper: WallpaperAsset | undefined;
    isClerkEnabled: boolean;
    isLinkPanelLocked: boolean;
    onWallpaperChange: (wallpaper: WallpaperAsset | undefined) => void;
    onToggleLinkPanelLocked: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
    bookmarkControls,
    initialWallpaper,
    isClerkEnabled,
    isLinkPanelLocked,
    onWallpaperChange,
    onToggleLinkPanelLocked,
}) => (
    <>
        <div className='panel-lock-control'>
            <button
                className='panel-lock-trigger'
                type='button'
                aria-label={
                    isLinkPanelLocked
                        ? 'Unlock bookmark panel'
                        : 'Lock bookmark panel open'
                }
                aria-pressed={isLinkPanelLocked}
                onClick={onToggleLinkPanelLocked}
            >
                {isLinkPanelLocked ? (
                    <PanelLeftClose className='icon' size={20} />
                ) : (
                    <PanelLeft className='icon' size={20} />
                )}
            </button>
        </div>
        <UserFloatingBar
            bookmarkControls={bookmarkControls}
            initialWallpaper={initialWallpaper}
            isClerkEnabled={isClerkEnabled}
            onWallpaperChange={onWallpaperChange}
        />
    </>
);
