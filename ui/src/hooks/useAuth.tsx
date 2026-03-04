import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { api } from '@/api/client';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
    email: string;
}

interface AuthContextValue {
    /** Currently authenticated user, or null if not logged in. */
    user: AuthUser | null;
    /** True while the initial auth check is still running. */
    loading: boolean;
    /** Authenticate. Stores token + user in localStorage. Throws on failure. */
    login: (email: string, password: string) => Promise<void>;
    /** Register a new account. Stores token + user in localStorage. Throws on failure. */
    signup: (email: string, password: string, alias: string) => Promise<void>;
    /** Clear all auth state and navigate to /login. */
    logout: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'faas_token';
const EMAIL_KEY = 'faas_user_email';

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Rehydrate from localStorage on first mount
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const email = localStorage.getItem(EMAIL_KEY);
        if (token && email) {
            setUser({ email });
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const token = await api.login(email, password); // throws on error
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EMAIL_KEY, email);
        setUser({ email });
    }, []);

    const signup = useCallback(async (email: string, password: string, alias: string) => {
        const token = await api.signup(email, password, alias); // throws on error
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EMAIL_KEY, email);
        setUser({ email });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
        setUser(null);
        window.location.href = '/login';
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, signup, logout }),
        [user, loading, login, signup, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the current auth context.
 * Must be called inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
