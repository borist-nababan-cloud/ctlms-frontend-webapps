import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
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
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchOrCreateProfile(session.user);
            } else {
                setLoading(false);
            }
        }).catch(() => {
            setLoading(false);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                setLoading(true);
                await fetchOrCreateProfile(session.user);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchOrCreateProfile = async (currentUser: User) => {
        // PERF: Prevent redundant fetching
        if (profile && profile.uuid === currentUser.id) {
            setLoading(false);
            return;
        }

        setAuthError(null);
        console.log('AuthContext: fetchOrCreateProfile', currentUser.id);

        try {
            console.log('AuthContext: checking for existing profile...');

            // Create the query promise
            const queryPromise = supabase
                .from('user_profiles')
                .select('*')
                .eq('uuid', currentUser.id)
                .maybeSingle();

            // Create a timeout promise (10 seconds)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT_CHECKING_PROFILE')), 10000)
            );

            // Race them
            const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

            if (error) {
                console.error('AuthContext: Profile Check Error', error);
                // Don't block the app on profile error, but show a message
                setAuthError(`Profile Error: ${error.message}`);
                // Proceed without profile? Or retry?
                // For now, allow rendering but profile will be null
            } else if (data) {
                // Scenario B: Profile Exists
                const userProfile = data as UserProfile;
                if (userProfile.user_role === 7) {
                    // Role 7 logic...
                    // Note: You can keep the auto-logout if strict, or just warn
                    await supabase.auth.signOut();
                    setAuthError('UNASSIGNED_ROLE');
                    return;
                }
                setProfile(userProfile);
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
                    console.error('Error creating profile:', insertError);
                    setAuthError('PROFILE_CREATION_FAILED');
                } else {
                    await supabase.auth.signOut();
                    setAuthError('UNASSIGNED_ROLE');
                }
            }
        } catch (err: any) {
            console.error('Error in profile logic:', err);
            // Specifically handle timeout to inform user but unblock UI
            if (err.message === 'TIMEOUT_CHECKING_PROFILE') {
                console.warn('Profile fetch timed out. Proceeding with limited access.');
                setAuthError('Connection timed out. Some features may be limited.');
            }
        } finally {
            // CRITICAL: Always turn off loading so the app can render
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, authError, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
