import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AuthUser, UserOrgMembership } from '@taskflow/shared';
import { LoginInput, RegisterInput } from '@taskflow/validation';
import { api } from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  organizations: UserOrgMembership[];
  activeOrg: UserOrgMembership | null;
  setActiveOrg: (org: UserOrgMembership) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<UserOrgMembership[]>([]);
  const [activeOrg, setActiveOrg] = useState<UserOrgMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const token = await api.refresh();
      if (token) {
        const me = await api.getMe();
        setUser(me.user);
        setOrganizations(me.organizations);
        if (me.organizations.length > 0) {
          setActiveOrg(me.organizations[0]);
        }
      } else {
        setUser(null);
        setOrganizations([]);
        setActiveOrg(null);
      }
    } catch {
      setUser(null);
      setOrganizations([]);
      setActiveOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = async (credentials: LoginInput) => {
    setIsLoading(true);
    try {
      await api.login(credentials);
      const me = await api.getMe();
      setUser(me.user);
      setOrganizations(me.organizations);
      if (me.organizations.length > 0) {
        setActiveOrg(me.organizations[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      await api.register(data);
      const me = await api.getMe();
      setUser(me.user);
      setOrganizations(me.organizations);
      if (me.organizations.length > 0) {
        setActiveOrg(me.organizations[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setUser(null);
      setOrganizations([]);
      setActiveOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        activeOrg,
        setActiveOrg,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
