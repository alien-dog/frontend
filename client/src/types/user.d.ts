// Type definition for the user object returned from the backend
export interface User {
  id: number;
  username: string;
  email?: string;
  credits: number;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
} 