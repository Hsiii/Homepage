'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Mail, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

interface HomepageAuth {
    getToken: () => Promise<string | undefined>;
    isLoaded: boolean;
    isSignedIn: boolean;
    openSignIn: () => void;
    signOut: () => Promise<void>;
    user: User | undefined;
    userId: string | undefined;
}

const AuthContext = createContext<HomepageAuth | undefined>(undefined);

const SignInDialog: React.FC<{
    close: () => void;
    isOpen: boolean;
}> = ({ close, isOpen }) => {
    const supabase = useMemo(() => createClient(), []);
    const emailId = useId();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string>();
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    if (!isOpen) {
        return undefined;
    }

    return (
        <div
            className='auth-dialog-backdrop'
            role='presentation'
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    close();
                }
            }}
        >
            <div
                className='auth-dialog'
                role='dialog'
                aria-labelledby={`${emailId}-title`}
                aria-modal='true'
            >
                <div className='auth-dialog-header'>
                    <div>
                        <span className='auth-dialog-eyebrow'>Homepage</span>
                        <h2 id={`${emailId}-title`}>Sign in by email</h2>
                    </div>
                    <button
                        className='auth-dialog-close'
                        type='button'
                        aria-label='Close sign-in'
                        onClick={close}
                    >
                        <X className='icon' size={20} />
                    </button>
                </div>
                {isSent ? (
                    <div className='auth-dialog-message' role='status'>
                        <Mail className='icon' size={20} />
                        <div>
                            <strong>Check your inbox</strong>
                            <span>
                                Use the secure link sent to {email.trim()}.
                            </span>
                        </div>
                    </div>
                ) : (
                    <form
                        className='auth-dialog-form'
                        onSubmit={(event) => {
                            event.preventDefault();
                            setError(undefined);
                            setIsSending(true);

                            supabase.auth
                                .signInWithOtp({
                                    email: email.trim(),
                                    options: {
                                        emailRedirectTo: `${globalThis.location.origin}/auth/callback`,
                                        shouldCreateUser: false,
                                    },
                                })
                                .then(({ error: signInError }) => {
                                    if (signInError !== null) {
                                        throw signInError;
                                    }
                                    setIsSent(true);
                                })
                                .catch((signInError: unknown) => {
                                    setError(
                                        signInError instanceof Error
                                            ? signInError.message
                                            : 'Sign-in email could not be sent.'
                                    );
                                })
                                .finally(() => {
                                    setIsSending(false);
                                });
                        }}
                    >
                        <label htmlFor={emailId}>Email address</label>
                        <input
                            id={emailId}
                            type='email'
                            autoComplete='email'
                            required
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                            }}
                        />
                        {error === undefined ? undefined : (
                            <p className='auth-dialog-error' role='alert'>
                                {error}
                            </p>
                        )}
                        <button
                            className='auth-dialog-submit'
                            type='submit'
                            disabled={isSending}
                        >
                            {isSending ? 'Sending…' : 'Email me a sign-in link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const supabase = useMemo(() => createClient(), []);
    const [session, setSession] = useState<Session | false>();
    const [isSignInOpen, setIsSignInOpen] = useState(false);

    useEffect(() => {
        let isCurrent = true;

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (isCurrent) {
                    setSession(data.session ?? false);
                }
            })
            .catch(() => {
                if (isCurrent) {
                    setSession(false);
                }
            });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession ?? false);
            if (nextSession) {
                setIsSignInOpen(false);
            }
        });

        return () => {
            isCurrent = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const openSignIn = useCallback(() => {
        setIsSignInOpen(true);
    }, []);
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, [supabase]);
    const value = useMemo<HomepageAuth>(
        () => ({
            getToken: async () => {
                await Promise.resolve();
                return session ? session.access_token : undefined;
            },
            isLoaded: session !== undefined,
            isSignedIn: Boolean(session),
            openSignIn,
            signOut,
            user: session ? session.user : undefined,
            userId: session ? session.user.id : undefined,
        }),
        [openSignIn, session, signOut]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
            <SignInDialog
                close={() => {
                    setIsSignInOpen(false);
                }}
                isOpen={isSignInOpen}
            />
        </AuthContext.Provider>
    );
};

export const useHomepageAuth = (): HomepageAuth => {
    const auth = useContext(AuthContext);

    if (auth === undefined) {
        throw new Error('Homepage AuthProvider is missing.');
    }

    return auth;
};
