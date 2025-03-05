import { QueryClient, QueryFunction } from "@tanstack/react-query";

type UnauthorizedBehavior = "returnNull" | "throw";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const API_BASE_URL = 'http://localhost:5000';

async function handleTokenError(error: any) {
  // Clear all auth data
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('token_expiry');
  localStorage.removeItem('google_token');
  
  // Clear query cache
  queryClient.clear();
  
  // Redirect to login page
  window.location.href = '/auth?error=' + encodeURIComponent(error.message);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh_token = localStorage.getItem('refresh_token');
  if (!refresh_token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/refresh-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refresh_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'token_expired' || error.code === 'token_invalid') {
        await handleTokenError(error);
      }
      throw new Error(error.error || 'Failed to refresh token');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('token_expiry', (Date.now() + data.expires_in * 1000).toString());
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    await handleTokenError(error);
    return null;
  }
}

async function handleTokenExpiry(): Promise<string | null> {
  const tokenExpiry = localStorage.getItem('token_expiry');
  const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : 0;
  const now = Date.now();

  // If token is about to expire (within 5 minutes) or has expired
  if (expiryTime - now < 300000) {
    return await refreshAccessToken();
  }

  return localStorage.getItem('access_token');
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Ensure URL starts with API base URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Get and check access token
  let access_token = await handleTokenExpiry();
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  if (access_token) {
    headers['Authorization'] = `Bearer ${access_token}`;
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle token errors
  if (res.status === 401) {
    const error = await res.json();
    if (error.code === 'token_expired' || error.code === 'token_invalid') {
      // Try to refresh the token
      access_token = await refreshAccessToken();
      if (access_token) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${access_token}`;
        const retryRes = await fetch(fullUrl, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        if (retryRes.ok) {
          return retryRes;
        }
        
        // If retry fails, handle token error
        const retryError = await retryRes.json();
        await handleTokenError(retryError);
        throw new Error(retryError.error || 'API request failed after token refresh');
      }
    }
    await handleTokenError(error);
    throw new Error(error.error || 'API request failed');
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'API request failed');
  }

  return res;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Ensure URL starts with API base URL
    const url = (queryKey[0] as string).startsWith('http') 
      ? queryKey[0] as string 
      : `${API_BASE_URL}${queryKey[0]}`;

    // Get and check access token
    let access_token = await handleTokenExpiry();
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (access_token) {
      headers['Authorization'] = `Bearer ${access_token}`;
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    // Handle token errors
    if (res.status === 401) {
      const error = await res.json();
      if (error.code === 'token_expired' || error.code === 'token_invalid') {
        // Try to refresh the token
        access_token = await refreshAccessToken();
        if (access_token) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${access_token}`;
          const retryRes = await fetch(url, {
            headers,
            credentials: "include",
          });
          
          if (retryRes.ok) {
            return await retryRes.json();
          }
          
          // If retry fails and we're supposed to return null, do so
          if (unauthorizedBehavior === "returnNull") {
            return null;
          }
          
          // Otherwise, handle token error
          const retryError = await retryRes.json();
          await handleTokenError(retryError);
          throw new Error(retryError.error || 'API request failed after token refresh');
        }
      }
      
      // If we're supposed to return null on 401, do so
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      // Otherwise, handle token error
      await handleTokenError(error);
      throw new Error(error.error || 'API request failed');
    }

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'API request failed');
    }

    return await res.json();
  };
