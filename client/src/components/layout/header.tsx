import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  History,
  CreditCard,
  Settings,
  LogOut,
  LayoutDashboard,
  Image,
  ChevronDown,
  CircleUserRound,
  Menu,
  X,
  Upload
} from "lucide-react";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (location === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <header className="fixed w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
                ) : (
                  <Image className="h-6 w-6 text-primary" />
                )}
                <div>
                  <span className="text-xl font-bold text-gray-900">iMagenWiz</span>
                  <p className="text-sm text-gray-600">AI image background removal</p>
                </div>
              </a>
            </Link>

            {user?.id === 1 && (
              <div className="hidden md:flex items-center">
                <label className="cursor-pointer text-sm text-gray-600 hover:text-primary flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Logo
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
            )}

            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-900 font-medium hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-gray-50"
              >
                Features
              </button>

              <button
                onClick={() => scrollToSection('pricing')}
                className="text-gray-900 font-medium hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-gray-50"
              >
                Pricing
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="text-gray-900 font-medium hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-gray-50 flex items-center gap-1">
                  Resources
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <Link href="/resources/use-cases">
                    <DropdownMenuItem className="cursor-pointer">
                      Use Cases
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/resources/guides">
                    <DropdownMenuItem className="cursor-pointer">
                      Guides
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/resources/blog">
                    <DropdownMenuItem className="cursor-pointer">
                      Blog
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-900 hover:text-primary p-2"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 pl-3 pr-8 rounded-full">
                    <div className="flex items-center gap-2">
                      <CircleUserRound className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-gray-900">{user.username}</span>
                      <span className="text-xs text-primary font-medium">
                        {user.credits} credits
                      </span>
                      <Avatar className="h-8 w-8 bg-primary/10 absolute right-0">
                        <AvatarFallback className="text-primary">
                          {user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.credits} credits available
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/dashboard">
                    <DropdownMenuItem className="cursor-pointer">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/dashboard/history">
                    <DropdownMenuItem className="cursor-pointer">
                      <History className="h-4 w-4 mr-2" />
                      <span>Image History</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/dashboard/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/dashboard/credits">
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <a href="/dashboard/credits" onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/dashboard/credits';
                      }}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        <span>Credits & Billing</span>
                      </a>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/dashboard/settings">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button className="button-primary">
                  Get Started Free
                </Button>
              </Link>
            )}
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => {
                  scrollToSection('features');
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-gray-900 font-medium hover:text-primary hover:bg-gray-50 rounded-md"
              >
                Features
              </button>
              <button
                onClick={() => {
                  scrollToSection('pricing');
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-gray-900 font-medium hover:text-primary hover:bg-gray-50 rounded-md"
              >
                Pricing
              </button>
              <Link href="/resources/use-cases">
                <a className="block px-3 py-2 text-gray-900 font-medium hover:text-primary hover:bg-gray-50 rounded-md">
                  Use Cases
                </a>
              </Link>
              <Link href="/resources/guides">
                <a className="block px-3 py-2 text-gray-900 font-medium hover:text-primary hover:bg-gray-50 rounded-md">
                  Guides
                </a>
              </Link>
              <Link href="/resources/blog">
                <a className="block px-3 py-2 text-gray-900 font-medium hover:text-primary hover:bg-gray-50 rounded-md">
                  Blog
                </a>
              </Link>
              {!user && (
                <Link href="/auth">
                  <a className="block px-3 py-2 text-gray-900 font-medium hover:text-primary hover:bg-gray-50 rounded-md">
                    Sign In
                  </a>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}