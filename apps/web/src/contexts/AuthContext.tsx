"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { socket } from '@/lib/socket';
import { useSettingsStore } from '@/store/settingsStore';
import { useFriendStore } from '@/store/friendStore';
import { useDMStore } from '@/store/dmStore';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio?: string | null;
  customStatus?: string | null;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (!socket.connected) socket.connect();
        useSettingsStore.getState().fetchPreferences();
        
        const friendStore = useFriendStore.getState();
        friendStore.setupSocketListeners();
        friendStore.fetchFriends();
        friendStore.fetchRequests();
        friendStore.fetchBlocks();

        const dmStore = useDMStore.getState();
        dmStore.setupSocketListeners();
        dmStore.fetchConversations();
      } else {
        setUser(null);
        if (socket.connected) socket.disconnect();
        useSettingsStore.setState({ preferences: null });
        useFriendStore.getState().cleanupSocketListeners();
        useDMStore.getState().cleanupSocketListeners();
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = pathname === '/login' || pathname === '/register' || pathname === '/';
      
      if (!user && !isPublicPath) {
        // Redireciona usuários não autenticados para login se tentarem acessar rotas protegidas
        router.push('/login');
      } else if (user && isPublicPath) {
        // Redireciona usuários logados para a aplicação principal se tentarem acessar login/registro
        router.push('/app');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = (newUser: User) => {
    setUser(newUser);
    if (!socket.connected) socket.connect();
    useSettingsStore.getState().fetchPreferences();
    
    const friendStore = useFriendStore.getState();
    friendStore.setupSocketListeners();
    friendStore.fetchFriends();
    friendStore.fetchRequests();
    friendStore.fetchBlocks();
    
    router.push('/app');
  };

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      setUser(null);
      if (socket.connected) socket.disconnect();
      useSettingsStore.setState({ preferences: null });
      useFriendStore.getState().cleanupSocketListeners();
      router.push('/login');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
