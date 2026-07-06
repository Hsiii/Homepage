import React, { useEffect, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import {
    LogIn,
    LogOut,
    Mail,
    Settings as SettingsIcon,
    UserRound,
    UserRoundPlus,
} from 'lucide-react';

import type { BookmarkControls } from '@/hooks/useBookmarks';
import { useLocale } from '@/hooks/useLocale';
import type { InitialAppPreferences } from '@/types/preferences';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { SettingsMenu } from './SettingsMenu';
import { WallpaperSettingsMenu } from './WallpaperSettingsMenu';

interface UserFloatingBarProps {
    bookmarkControls: BookmarkControls;
    className?: string;
    closeMenusSignal?: number;
    initialPreferences: InitialAppPreferences;
    initialWallpaper: WallpaperAsset | undefined;
    isClerkEnabled: boolean;
    onWallpaperChange: (wallpaper: WallpaperAsset | undefined) => void;
    settingsPlacement?: 'above' | 'mobile';
    showSettingsInMenu?: boolean;
}

interface CloseableMenuProps {
    bookmarkControls: BookmarkControls;
    className?: string;
    closeMenusSignal?: number;
    initialPreferences: InitialAppPreferences;
    initialWallpaper?: WallpaperAsset | undefined;
    onWallpaperChange?: (wallpaper: WallpaperAsset | undefined) => void;
    settingsPlacement?: 'above' | 'mobile';
    showSettingsInMenu?: boolean;
}

const getDisplayName = (emailAddress?: string, name?: string | null) => {
    if (name !== undefined && name !== null && name.trim() !== '') {
        return name;
    }

    if (emailAddress !== undefined) {
        return emailAddress.split('@')[0];
    }

    return 'Guest';
};

const UserFloatingBarContent: React.FC<CloseableMenuProps> = ({
    bookmarkControls,
    className,
    closeMenusSignal,
    initialPreferences,
    initialWallpaper,
    onWallpaperChange,
    settingsPlacement = 'above',
    showSettingsInMenu = false,
}) => {
    const { isSignedIn, user } = useUser();
    const { openSignIn, openSignUp, signOut } = useClerk();
    const { t } = useLocale(initialPreferences.locale);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const emailAddress = user?.primaryEmailAddress?.emailAddress;
    const displayName = getDisplayName(
        emailAddress,
        user?.username ?? user?.fullName ?? user?.firstName
    );
    const profileLabel = isSignedIn === true ? displayName : 'Guest';

    useEffect(() => {
        if (!isMenuOpen) {
            return undefined;
        }

        const onClickOutside = (event: MouseEvent) => {
            if (menuRef.current?.contains(event.target as Node) === false) {
                setIsMenuOpen(false);
            }
        };

        globalThis.document.addEventListener('click', onClickOutside);
        return () => {
            globalThis.document.removeEventListener('click', onClickOutside);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (closeMenusSignal === undefined) {
            return;
        }

        setIsMenuOpen(false);
        setIsSettingsOpen(false);
    }, [closeMenusSignal]);

    return (
        <div
            className={['user-floating-bar', className]
                .filter(Boolean)
                .join(' ')}
        >
            <div className='user-menu-control' ref={menuRef}>
                <button
                    className='user-menu-trigger'
                    type='button'
                    aria-label='Open user menu'
                    aria-haspopup='menu'
                    aria-expanded={isMenuOpen}
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsMenuOpen((current) => !current);
                    }}
                >
                    <span className='user-avatar' aria-hidden>
                        {user?.imageUrl !== undefined &&
                        user.imageUrl !== '' ? (
                            <img src={user.imageUrl} alt='' />
                        ) : (
                            <UserRound className='icon' size={20} />
                        )}
                    </span>
                    <span className='user-card-name'>{profileLabel}</span>
                </button>
                {isMenuOpen ? (
                    <div className='user-menu' role='menu'>
                        {isSignedIn ? (
                            <>
                                <div className='user-menu-email'>
                                    <Mail className='icon' size={16} />
                                    <span>
                                        {emailAddress ?? 'No email address'}
                                    </span>
                                </div>
                                {showSettingsInMenu ? (
                                    <button
                                        className='user-menu-action'
                                        type='button'
                                        role='menuitem'
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsSettingsOpen(true);
                                        }}
                                    >
                                        <SettingsIcon
                                            className='icon'
                                            size={16}
                                        />
                                        <span>{t.settings}</span>
                                    </button>
                                ) : undefined}
                                <button
                                    className='user-menu-action'
                                    type='button'
                                    role='menuitem'
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        signOut().catch(() => undefined);
                                    }}
                                >
                                    <LogOut className='icon' size={16} />
                                    <span>Log out</span>
                                </button>
                            </>
                        ) : (
                            <>
                                {showSettingsInMenu ? (
                                    <button
                                        className='user-menu-action'
                                        type='button'
                                        role='menuitem'
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsSettingsOpen(true);
                                        }}
                                    >
                                        <SettingsIcon
                                            className='icon'
                                            size={16}
                                        />
                                        <span>{t.settings}</span>
                                    </button>
                                ) : undefined}
                                <button
                                    className='user-menu-action'
                                    type='button'
                                    role='menuitem'
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        openSignIn();
                                    }}
                                >
                                    <LogIn className='icon' size={16} />
                                    <span>Sign in</span>
                                </button>
                                <button
                                    className='user-menu-action'
                                    type='button'
                                    role='menuitem'
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        openSignUp();
                                    }}
                                >
                                    <UserRoundPlus className='icon' size={16} />
                                    <span>Create account</span>
                                </button>
                            </>
                        )}
                    </div>
                ) : undefined}
            </div>
            <WallpaperSettingsMenu
                bookmarkControls={bookmarkControls}
                closeSignal={closeMenusSignal}
                isOpen={showSettingsInMenu ? isSettingsOpen : undefined}
                isTriggerHidden={showSettingsInMenu}
                initialPreferences={initialPreferences}
                initialWallpaper={initialWallpaper}
                onOpenChange={
                    showSettingsInMenu ? setIsSettingsOpen : undefined
                }
                onWallpaperChange={onWallpaperChange}
                placement={settingsPlacement}
            />
        </div>
    );
};

const UserFloatingBarFallback: React.FC<CloseableMenuProps> = ({
    bookmarkControls,
    className,
    closeMenusSignal,
    initialPreferences,
    settingsPlacement = 'above',
    showSettingsInMenu = false,
}) => {
    const { t } = useLocale(initialPreferences.locale);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen) {
            return undefined;
        }

        const onClickOutside = (event: MouseEvent) => {
            if (menuRef.current?.contains(event.target as Node) === false) {
                setIsMenuOpen(false);
            }
        };

        globalThis.document.addEventListener('click', onClickOutside);
        return () => {
            globalThis.document.removeEventListener('click', onClickOutside);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (closeMenusSignal === undefined) {
            return;
        }

        setIsMenuOpen(false);
        setIsSettingsOpen(false);
    }, [closeMenusSignal]);

    return (
        <div
            className={['user-floating-bar', className]
                .filter(Boolean)
                .join(' ')}
        >
            <div className='user-menu-control' ref={menuRef}>
                <button
                    className='user-menu-trigger'
                    type='button'
                    aria-label='Open user menu'
                    aria-haspopup='menu'
                    aria-expanded={isMenuOpen}
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsMenuOpen((current) => !current);
                    }}
                >
                    <span className='user-avatar' aria-hidden>
                        <UserRound className='icon' size={20} />
                    </span>
                    <span className='user-card-name'>Guest</span>
                </button>
                {isMenuOpen ? (
                    <div className='user-menu' role='menu'>
                        <div className='user-menu-email'>
                            <Mail className='icon' size={16} />
                            <span>Missing Clerk publishable key</span>
                        </div>
                        {showSettingsInMenu ? (
                            <button
                                className='user-menu-action'
                                type='button'
                                role='menuitem'
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    setIsSettingsOpen(true);
                                }}
                            >
                                <SettingsIcon className='icon' size={16} />
                                <span>{t.settings}</span>
                            </button>
                        ) : undefined}
                    </div>
                ) : undefined}
            </div>
            <SettingsMenu
                bookmarkControls={bookmarkControls}
                closeSignal={closeMenusSignal}
                isOpen={showSettingsInMenu ? isSettingsOpen : undefined}
                isTriggerHidden={showSettingsInMenu}
                initialPreferences={initialPreferences}
                onOpenChange={
                    showSettingsInMenu ? setIsSettingsOpen : undefined
                }
                placement={settingsPlacement}
            />
        </div>
    );
};

export const UserFloatingBar: React.FC<UserFloatingBarProps> = ({
    bookmarkControls,
    className,
    closeMenusSignal,
    initialPreferences,
    initialWallpaper,
    isClerkEnabled,
    onWallpaperChange,
    settingsPlacement,
    showSettingsInMenu,
}) => {
    if (isClerkEnabled) {
        return (
            <UserFloatingBarContent
                bookmarkControls={bookmarkControls}
                className={className}
                closeMenusSignal={closeMenusSignal}
                initialPreferences={initialPreferences}
                initialWallpaper={initialWallpaper}
                onWallpaperChange={onWallpaperChange}
                settingsPlacement={settingsPlacement}
                showSettingsInMenu={showSettingsInMenu}
            />
        );
    }

    return (
        <UserFloatingBarFallback
            bookmarkControls={bookmarkControls}
            className={className}
            closeMenusSignal={closeMenusSignal}
            initialPreferences={initialPreferences}
            settingsPlacement={settingsPlacement}
            showSettingsInMenu={showSettingsInMenu}
        />
    );
};
