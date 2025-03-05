import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      console.log('User already authenticated, redirecting to profile page');
      setLocation('/dashboard/profile');
    }
  }, [user, setLocation]);

  // Check for error parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const message = params.get('message');
    
    if (error) {
      let errorMessage = 
        error === 'authentication_failed' ? 'Authentication failed. Please try again.' :
        error === 'server_error' ? 'Server error. Please try again later.' :
        error === 'invalid_response' ? 'Invalid response from authentication provider.' :
        'Authentication error: ' + error;
        
      // Add the specific error message if available
      if (message) {
        errorMessage += ` (${message})`;
      }
      
      setAuthError(errorMessage);
    }
  }, []);

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "" }
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "" }
  });

  const handleGoogleLogin = () => {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/auth");
    authUrl.searchParams.append("client_id", "300845750505-9oh2tmiep0esng3opj7me5sbu62r0g9b.apps.googleusercontent.com");
    authUrl.searchParams.append("redirect_uri", "http://localhost:5173/callback.html");
    authUrl.searchParams.append("response_type", "token");
    authUrl.searchParams.append("scope", "email profile");
    authUrl.searchParams.append("access_type", "online");
    authUrl.searchParams.append("include_granted_scopes", "true");
    
    // Try to skip the account selection screen if possible
    if (localStorage.getItem('google_user_info')) {
      authUrl.searchParams.append("prompt", "none");
    }
    
    window.location.href = authUrl.toString();
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            {authError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                <span className="block sm:inline">{authError}</span>
              </div>
            )}
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                    <div className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Username</Label>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Password</Label>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}>
                    <div className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Username</Label>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Password</Label>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Register"
                        )}
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleLogin}
                      >
                        <SiGoogle className="mr-2 h-4 w-4" />
                        Sign up with Google
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex items-center justify-center bg-muted p-8">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to iMageWiz
          </h1>
          <p className="text-muted-foreground text-lg">
            Get started with our AI-powered background removal tool. Perfect for designers, marketers, and creators looking to enhance their images instantly.
          </p>
        </div>
      </div>
    </div>
  );
}