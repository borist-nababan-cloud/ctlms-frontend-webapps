import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types/supabase';

export interface UserProfileWithBranding extends UserProfile {
    companyName?: string | null;
    company_name?: string | null;
    hexColor?: string | null;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfileWithBranding | null;
    loading: boolean;
    authError: string | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    authError: null,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSessionState] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfileState] = useState<UserProfileWithBranding | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const fetchingUuidRef = useRef<string | null>(null);

    const sessionRef = useRef<Session | null>(null);
    const profileRef = useRef<UserProfileWithBranding | null>(null);

    const setSession = (s: Session | null) => {
        sessionRef.current = s;
        setSessionState(s);
    };

    const setProfile = (p: UserProfileWithBranding | null) => {
        profileRef.current = p;
        setProfileState(p);
    };

    const fetchOrCreateProfile = async (currentUser: User, isBackground = false) => {
        // PERF: Prevent redundant fetching
        if (profileRef.current && profileRef.current.uuid === currentUser.id) {
            if (!isBackground) setLoading(false);
            return;
        }

        // Prevent concurrent fetching for the same user
        if (fetchingUuidRef.current === currentUser.id) {
            return;
        }
        fetchingUuidRef.current = currentUser.id;

        setAuthError(null);

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select(`
                    *,
                    master_companies (
                        name,
                        hex_color
                    )
                `)
                .eq('uuid', currentUser.id)
                .maybeSingle();

            if (error) {
                console.error('AuthContext: Profile Check Error', error.message, error);
                // Don't block the app on profile error, but show a message
                setAuthError('Gagal memuat profil pengguna.');
                // Proceed without profile? Or retry?
                // For now, allow rendering but profile will be null
            } else if (data) {
                // Scenario B: Profile Exists
                const rawProfile = data as any;

                if (rawProfile.user_role === 7) {
                    // Role 7 logic...
                    // Note: You can keep the auto-logout if strict, or just warn
                    await supabase.auth.signOut();
                    setAuthError('UNASSIGNED_ROLE');
                    return;
                }
                
                const companyData = Array.isArray(rawProfile.master_companies)
                    ? rawProfile.master_companies[0]
                    : rawProfile.master_companies;
                
                const companyName = companyData?.name || null;
                const hexColor = companyData?.hex_color || null;
                
                const userProfile: UserProfileWithBranding = {
                    uuid: rawProfile.uuid,
                    email: rawProfile.email,
                    user_role: rawProfile.user_role,
                    wh_id: rawProfile.wh_id,
                    company_id: rawProfile.company_id,
                    real_name: rawProfile.real_name,
                    created_at: rawProfile.created_at,
                    updated_at: rawProfile.updated_at,
                    companyName,
                    company_name: companyName,
                    hexColor
                };
                setProfile(userProfile);

                // Store in localStorage as requested
                localStorage.setItem('email', rawProfile.email || '');
                localStorage.setItem('user_role', String(rawProfile.user_role ?? ''));
                localStorage.setItem('real_name', rawProfile.real_name || '');
                localStorage.setItem('company_id', rawProfile.company_id || '');
                localStorage.setItem('company_name', companyName || '');
            } else {
                // Scenario A: Profile Does Not Exist (First Login)
                const newProfile: Partial<UserProfile> = {
                    uuid: currentUser.id,
                    email: currentUser.email!,
                    user_role: 7,
                };

                const { error: insertError } = await supabase
                    .from('user_profiles')
                    .insert(newProfile as any);

                if (insertError) {
                    console.error('Error creating profile:', insertError.message, insertError);
                    setAuthError('PROFILE_CREATION_FAILED');
                } else {
                    await supabase.auth.signOut();
                    setAuthError('UNASSIGNED_ROLE');
                }
            }
        } catch (err: any) {
            console.error('Error in profile logic:', err?.message || err, err?.stack);
            // Specifically handle timeout to inform user but unblock UI
            if (err?.message === 'TIMEOUT_CHECKING_PROFILE') {
                setAuthError('Koneksi terputus. Beberapa fitur mungkin terbatas.');
            }
        } finally {
            fetchingUuidRef.current = null;
            // CRITICAL: Always turn off loading so the app can render
            if (!isBackground) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                setTimeout(() => {
                    fetchOrCreateProfile(session.user!, false);
                }, 0);
            } else {
                setLoading(false);
            }
        }).catch((err) => {
            console.error('AuthContext: getSession error', err);
            setLoading(false);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const previousUserId = sessionRef.current?.user?.id ?? null;
            const newUserId = session?.user?.id ?? null;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // If the user changed or we don't have a profile yet, set loading to true
                if (newUserId !== previousUserId || !profileRef.current) {
                    setLoading(true);
                    setTimeout(() => {
                        fetchOrCreateProfile(session.user!, false);
                    }, 0);
                } else {
                    // Same user, and profile already exists, do it in the background silently
                    setTimeout(() => {
                        fetchOrCreateProfile(session.user!, true);
                    }, 0);
                }
            } else {
                setProfile(null);
                localStorage.removeItem('email');
                localStorage.removeItem('user_role');
                localStorage.removeItem('real_name');
                localStorage.removeItem('company_id');
                localStorage.removeItem('company_name');
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        localStorage.removeItem('email');
        localStorage.removeItem('user_role');
        localStorage.removeItem('real_name');
        localStorage.removeItem('company_id');
        localStorage.removeItem('company_name');
        await supabase.auth.signOut();
    };

    useEffect(() => {
        (window as any).authContext = { session, user, profile, loading, authError };
    }, [session, user, profile, loading, authError]);

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, authError, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
