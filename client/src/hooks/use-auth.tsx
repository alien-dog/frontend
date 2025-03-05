import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/user";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthResponse, Error, InsertUser>;
  googleAuthMutation: UseMutationResult<AuthResponse, Error, string>;
  refreshCredits: () => void;
};

type LoginData = {
  username: string;
  password: string;
};

type TokenData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type AuthResponse = {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  message?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

// Function to handle token refresh
async function refreshAccessToken(refresh_token: string): Promise<TokenData> {
  const response = await fetch('http://localhost:5000/api/refresh-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refresh_token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: refresh_token, // Keep the existing refresh token
    expires_in: data.expires_in
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Check for tokens and user data in localStorage on initialization
  useEffect(() => {
    const access_token = localStorage.getItem('access_token');
    const refresh_token = localStorage.getItem('refresh_token');
    const userData = localStorage.getItem('user_data');
    const tokenExpiry = localStorage.getItem('token_expiry');
    const google_token = localStorage.getItem('google_token');
    
    if (google_token && !access_token) {
      console.log('Found Google token, exchanging for access token...');
      googleAuthMutation.mutate(google_token);
    }
    
    if (access_token && userData) {
      try {
        const user = JSON.parse(userData);
        queryClient.setQueryData(["/api/user"], user);
        
        // Check if token is about to expire (within 5 minutes)
        const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : 0;
        const now = Date.now();
        if (expiryTime - now < 300000 && refresh_token) { // 5 minutes in milliseconds
          refreshAccessToken(refresh_token)
            .then((tokenData) => {
              localStorage.setItem('access_token', tokenData.access_token);
              localStorage.setItem('token_expiry', (Date.now() + tokenData.expires_in * 1000).toString());
            })
            .catch((error) => {
              console.error('Error refreshing token:', error);
              // Clear auth data if refresh fails
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_data');
              localStorage.removeItem('token_expiry');
              queryClient.setQueryData(["/api/user"], null);
            });
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refreshCredits
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!localStorage.getItem('access_token'), // Only run if we have an access token
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: { user: User; access_token: string; refresh_token: string; expires_in: number }) => {
      // Store tokens and expiry
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token_expiry', (Date.now() + data.expires_in * 1000).toString());
      
      // Store user data
      localStorage.setItem('user_data', JSON.stringify(data.user));
      
      // Update the query cache
      queryClient.setQueryData(["/api/user"], data.user);
      
      toast({
        title: "Welcome back!",
        description: `You have ${data.user.credits} credits available.`,
      });

      window.location.href = '/dashboard';
    },
    onError: (error: Error) => {
      // Clear any stale data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('token_expiry');
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (data: { user: User; access_token: string; refresh_token: string; expires_in: number }) => {
      // Store tokens and expiry
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token_expiry', (Date.now() + data.expires_in * 1000).toString());
      
      // Store user data
      localStorage.setItem('user_data', JSON.stringify(data.user));
      
      // Update the query cache
      queryClient.setQueryData(["/api/user"], data.user);
      
      toast({
        title: "Welcome to iMagenWiz!",
        description: `Your account is ready with ${data.user.credits} free credits.`,
      });
      
      window.location.href = '/dashboard/profile?newLogin=true';
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "http://localhost:5000/api/logout");
    },
    onSuccess: () => {
      // Clear all auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('token_expiry');
      
      // Clear query cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Goodbye!",
        description: "You've been successfully logged out.",
      });
      
      window.location.href = '/';
    },
    onError: (error: Error) => {
      // Clear all auth data even if logout fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('token_expiry');
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout failed",
        description: error.message + " - But you've been logged out locally.",
        variant: "destructive",
      });
      
      window.location.href = '/';
    },
  });

  const googleAuthMutation = useMutation({
    mutationFn: async (google_token: string) => {
      console.log('Exchanging Google token for access token...');
      const response = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ access_token: google_token })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to authenticate with Google');
      }

      return response.json();
    },
    onSuccess: async (data: AuthResponse) => {
      console.log('Successfully exchanged Google token');
      
      // Store tokens and user data
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token_expiry', (Date.now() + data.expires_in * 1000).toString());
      localStorage.setItem('user_data', JSON.stringify(data.user));
      
      // Remove Google token as it's no longer needed
      localStorage.removeItem('google_token');

      // Update query cache with user data
      queryClient.setQueryData(["/api/user"], data.user);
      
      // Verify token by making a direct fetch call to /api/user
      try {
        const userResponse = await fetch('http://localhost:5000/api/user', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to verify user data');
        }

        const userData = await userResponse.json();
        
        // Update cache with verified user data
        queryClient.setQueryData(["/api/user"], userData);
        
        toast({
          title: "Welcome!",
          description: `You have ${userData.credits} credits available.`,
        });

        // Redirect to dashboard after successful verification
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Failed to verify user:', error);
        // Clear auth data on verification failure
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('token_expiry');
        
        queryClient.setQueryData(["/api/user"], null);
        
        toast({
          title: "Authentication failed",
          description: "Failed to verify user data",
          variant: "destructive",
        });
        
        window.location.href = '/auth?error=verification_failed';
      }
    },
    onError: (error: Error) => {
      console.error('Failed to exchange Google token:', error);
      // Clear any stale data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('google_token');
      
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
      
      // Redirect to auth page with error
      window.location.href = `/auth?error=${encodeURIComponent(error.message)}`;
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        googleAuthMutation,
        refreshCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}