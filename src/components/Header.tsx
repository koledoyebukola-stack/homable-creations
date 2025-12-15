import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Upload, History, LogOut, LogIn, UserPlus } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="bg-black sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        {/* Desktop Layout: Single row with centered pill */}
        <div className="hidden md:block">
          <div className="relative flex items-center justify-between max-w-7xl mx-auto">
            {/* Left: Logo */}
            <button
              onClick={() => navigate('/')}
              className="text-2xl lg:text-3xl font-bold text-white hover:text-white/80 transition-colors whitespace-nowrap"
            >
              Homable Creations
            </button>

            {/* Center: Holiday Badge (absolutely positioned) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium whitespace-nowrap">
                <span>🎄 Holiday Decor Beta</span>
              </div>
            </div>

            {/* Right: Auth Buttons */}
            <nav className="flex items-center gap-3">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/checklists')}
                    className="text-white hover:text-white/80 hover:bg-white/10 relative"
                  >
                    Shopping List
                    <Badge 
                      className="ml-2 bg-[#E0E0E0] text-[#333333] text-[10px] px-1.5 py-0.5 h-auto rounded-xl font-normal hover:bg-[#E0E0E0]"
                    >
                      New
                    </Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/history')}
                    className="text-white hover:text-white/80 hover:bg-white/10"
                  >
                    My History
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="text-white hover:text-white/80 hover:bg-white/10"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/auth?mode=signin')}
                    className="text-white hover:text-white/80 hover:bg-white/10"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate('/auth?mode=signup')}
                    className="bg-transparent border-[1.5px] border-white text-white hover:bg-white hover:text-black transition-all whitespace-nowrap"
                  >
                    Create Free Account
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Mobile Layout: Brand + Shopping List (NO "New" pill) + Menu */}
        <div className="md:hidden flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-lg font-bold text-white hover:text-white/80 transition-colors whitespace-nowrap"
          >
            Homable Creations
          </button>

          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/checklists')}
                  className="text-white hover:text-white/80 hover:bg-white/10 text-xs px-2"
                >
                  Shopping List
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:text-white/80 hover:bg-white/10 h-9 w-9 p-0"
                    >
                      <img 
                        src="/assets/menu-icon.png" 
                        alt="Menu" 
                        className="h-8 w-8"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/upload')}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Inspiration
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/history')}>
                      <History className="mr-2 h-4 w-4" />
                      My History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:text-white/80 hover:bg-white/10 h-9 w-9 p-0"
                  >
                    <img 
                      src="/assets/menu-icon_variant_1.png" 
                      alt="Menu" 
                      className="h-8 w-8"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/upload')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Inspiration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/auth?mode=signin')}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/auth?mode=signup')}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Free Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}