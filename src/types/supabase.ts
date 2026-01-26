export interface UserRole {
    id: number;
    role_name: string;
    created_at?: string;
}

export interface UserProfile {
    id: string; // uuid
    email: string;
    role_id: number | null;
    full_name?: string;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Database {
    public: {
        Tables: {
            user_profiles: {
                Row: UserProfile;
                Insert: UserProfile;
                Update: Partial<UserProfile>;
            };
            user_roles: {
                Row: UserRole;
                Insert: UserRole;
                Update: Partial<UserRole>;
            };
        };
    };
}
