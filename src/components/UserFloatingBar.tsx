import React, { useEffect, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { LogIn, LogOut, Mail, UserRound, UserRoundPlus } from 'lucide-react';

import { SettingsMenu } from './SettingsMenu';

interface UserFloatingBarProps {
    isClerkEnabled: boolean;
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

const UserFloatingBarContent: React.FC = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const { openSignIn, openSignUp, signOut } = useClerk();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const emailAddress = user?.primaryEmailAddress?.emailAddress;
    const displayName = getDisplayName(
        emailAddress,
        user?.username ?? user?.fullName ?? user?.firstName
    );

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

    return (
        <div className='user-floating-bar'>
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
                </button>
                {isMenuOpen ? (
                    <div className='user-menu' role='menu'>
                        <div className='user-menu-profile'>
                            <span className='user-avatar' aria-hidden>
                                {user?.imageUrl !== undefined &&
                                user.imageUrl !== '' ? (
                                    <img src={user.imageUrl} alt='' />
                                ) : (
                                    <UserRound className='icon' size={20} />
                                )}
                            </span>
                            <span className='user-menu-name'>
                                {isLoaded ? displayName : 'Loading'}
                            </span>
                        </div>
                        {isSignedIn ? (
                            <>
                                <div className='user-menu-email'>
                                    <Mail className='icon' size={16} />
                                    <span>
                                        {emailAddress ?? 'No email address'}
                                    </span>
                                </div>
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
            <SettingsMenu placement='above' />
        </div>
    );
};

const UserFloatingBarFallback: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    return (
        <div className='user-floating-bar'>
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
                </button>
                {isMenuOpen ? (
                    <div className='user-menu' role='menu'>
                        <div className='user-menu-profile'>
                            <span className='user-avatar' aria-hidden>
                                <UserRound className='icon' size={20} />
                            </span>
                            <span className='user-menu-name'>Guest</span>
                        </div>
                        <div className='user-menu-email'>
                            <Mail className='icon' size={16} />
                            <span>Missing Clerk publishable key</span>
                        </div>
                    </div>
                ) : undefined}
            </div>
            <SettingsMenu placement='above' />
        </div>
    );
};

export const UserFloatingBar: React.FC<UserFloatingBarProps> = ({
    isClerkEnabled,
}) => {
    if (isClerkEnabled) {
        return <UserFloatingBarContent />;
    }

    return <UserFloatingBarFallback />;
};
