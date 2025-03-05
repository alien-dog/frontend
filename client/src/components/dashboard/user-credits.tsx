import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from '@/lib/queryClient';
import { User } from '@/types/user';
import { useEffect } from "react";

declare const Stripe: any; // Declare the global Stripe object

const stripe = Stripe('pk_test_51Q38qCAGgrMJnivhKhP3M0pG1Z6omOTWZgJcOxHwLql8i7raQ1IuDhTDk4SOHHjjKmijuyO5gTRkT6JhUw3kHDF600BjMLjeRz');

const creditPackages = [
  {
    name: "Basic",
    credits: 100,
    price: "$9.99",
    priceId: "price_H5ggYwtDq8jf99",
    description: "Perfect for small projects"
  },
  {
    name: "Pro",
    credits: 300,
    price: "$24.99",
    priceId: "price_H5ggYwtDq8jf98",
    description: "Most popular choice",
    popular: true
  },
  {
    name: "Business",
    credits: 1000,
    price: "$49.99",
    priceId: "price_H5ggYwtDq8jf97",
    description: "Best value for high volume"
  }
];

// Debug logging function
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log('Data:', data);
  }
};

// Debug storage function
const debugStorage = () => {
  const allStorage: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            // Try to parse JSON values
            allStorage[key] = JSON.parse(value);
          } catch {
            // If not JSON, store as is
            allStorage[key] = value;
          }
        }
      } catch (e) {
        debugLog(`Error reading storage key ${key}:`, e);
      }
    }
  }
  
  debugLog('Full localStorage contents:', allStorage);
};

// Token debugging function
const debugToken = () => {
  const access_token = localStorage.getItem('access_token');
  const refresh_token = localStorage.getItem('refresh_token');
  const token_expiry = localStorage.getItem('token_expiry');
  const google_token = localStorage.getItem('google_token');
  const auth_token = localStorage.getItem('auth_token');
  const user_data = localStorage.getItem('user_data');
  
  debugLog('Token Debug Info:', {
    has_access_token: !!access_token,
    access_token_preview: access_token ? `${access_token.substring(0, 10)}...` : null,
    has_refresh_token: !!refresh_token,
    refresh_token_preview: refresh_token ? `${refresh_token.substring(0, 10)}...` : null,
    token_expiry: token_expiry ? new Date(parseInt(token_expiry)).toISOString() : null,
    has_google_token: !!google_token,
    google_token_preview: google_token ? `${google_token.substring(0, 10)}...` : null,
    has_auth_token: !!auth_token,
    auth_token_value: auth_token,
    has_user_data: !!user_data,
    user_data: user_data ? JSON.parse(user_data) : null,
    localStorage_keys: Object.keys(localStorage)
  });
};

interface Transaction {
  id: string;
  amount: number;
  type: 'purchase' | 'usage';
  description: string;
  created_at: string;
}

export function UserCredits() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: userData, error: userError, isLoading: userLoading } = useQuery<{
    user: User;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!localStorage.getItem('access_token'),
    retry: 1,
    staleTime: 300000, // 5 minutes
    refetchOnMount: 'always'
  });

  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useQuery<Transaction[], Error>({
    queryKey: ['/api/transactions'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!localStorage.getItem('access_token'),
    retry: 1,
    staleTime: 300000, // 5 minutes
  });

  // Handle transaction errors
  useEffect(() => {
    if (transactionsError) {
      toast({
        title: "Error",
        description: "Failed to load transaction history. Please try again later.",
        variant: "destructive"
      });
    }
  }, [transactionsError, toast]);

  const handlePurchaseClick = () => {
    // Implement Stripe checkout redirect or modal
    toast({
      title: "Coming Soon",
      description: "Credit purchase functionality will be available soon!",
      variant: "default"
    });
  };

  // Show loading state
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user data and not loading, show error state
  if (!userLoading && !userData?.user) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Error Loading Credits</CardTitle>
          <CardDescription>
            Unable to load your credit information. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Credits Display Section */}
      <Card>
        <CardHeader>
          <CardTitle>Available Credits</CardTitle>
          <CardDescription>
            {userData?.user?.credits !== undefined 
              ? `You currently have ${userData.user.credits} credits`
              : 'Loading credits...'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Charge Button Section */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Credits</CardTitle>
          <CardDescription>Add more credits to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            size="lg"
            onClick={handlePurchaseClick}
          >
            Purchase Credits
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History Section */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="text-center text-gray-500 py-4">
              Loading transactions...
            </div>
          ) : transactionsError ? (
            <div className="text-center text-gray-500 py-4">
              Error loading transactions. Please try again later.
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No transactions found
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`font-medium ${
                    transaction.type === 'purchase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'purchase' ? '+' : '-'}{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}