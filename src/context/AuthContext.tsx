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
            console.log(`AuthContext: onAuthStateChange event=${event}`, session?.user?.email);
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
        setAuthError(null);
        console.log('AuthContext: fetchOrCreateProfile', currentUser.id);
        try {
            // Check if profile exists
            console.log('AuthContext: checking for existing profile...');

            // Add timeout to detect hang
            const queryPromise = supabase
                .from('user_profiles')
                .select('*')
                .eq('uuid', currentUser.id)
                .maybeSingle();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT_CHECKING_PROFILE')), 5000)
            );

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

            if (error) {
                console.error('AuthContext: Profile Check Error', error);
                if (error.message === 'TIMEOUT_CHECKING_PROFILE') {
                    alert('Database connection timed out. Please check your connection.');
                    return;
                }
            }

            if (data) {
                // Scenario B: Profile Exists
                const userProfile = data as UserProfile;
                if (userProfile.user_role === 7) {
                    console.log('User has Role 7 (Unassigned). Signing out...');
                    await supabase.auth.signOut();
                    setAuthError('UNASSIGNED_ROLE');
                    // throw new Error('UNASSIGNED_ROLE'); // Optional, mainly for flow control if needed
                    return;
                }
                setProfile(userProfile);
            } else {
                // Scenario A: Profile Does Not Exist (First Login)
                // Auto-insert profile with Role 7
                const newProfile: UserProfile = {
                    uuid: currentUser.id,
                    email: currentUser.email!,
                    user_role: 7, // Default Unassigned
                    wh_id: null,
                    real_name: null,
                    // created_at is handled by DB default
                };

                const { error: insertError } = await supabase
                    .from('user_profiles')
                    .insert(newProfile as any);

                if (insertError) {
                    console.error('Error creating profile:', insertError);
                } else {
                    console.log('Profile auto-created with Role 7. Signing out...');
                    await supabase.auth.signOut();
                    setAuthError('UNASSIGNED_ROLE');
                }
            }
        } catch (err: any) {
            console.error('Error in profile logic:', err);
        } finally {
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
