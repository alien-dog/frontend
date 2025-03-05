import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ReactNode, useEffect } from "react";

type ProtectedRouteProps = {
  path?: string;
  component?: () => React.JSX.Element;
  children?: ReactNode;
  adminOnly?: boolean;
};

export function ProtectedRoute({
  path,
  component: Component,
  children,
  adminOnly = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page.",
        variant: "destructive",
      });
    }
  }, [user, isLoading, toast]);

  const LoadingComponent = () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );

  // Handle loading state
  if (isLoading) {
    return path ? (
      <Route path={path}>
        <LoadingComponent />
      </Route>
    ) : (
      <LoadingComponent />
    );
  }

  // Handle unauthorized access
  if (!user || (adminOnly && user.username !== 'admin')) {
    if (path) {
      return (
        <Route path={path}>
          <Redirect to="/auth" />
        </Route>
      );
    }
    return <Redirect to="/auth" />;
  }

  // Render authorized content
  if (path && Component) {
    return <Route path={path} component={Component} />;
  }

  return <>{children}</>;
}