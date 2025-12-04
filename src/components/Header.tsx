import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

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
                    onClick={() => navigate('/my-boards')}
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

        {/* Mobile Layout: Single row only - NO holiday badge */}
        <div className="md:hidden flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-xl font-bold text-white hover:text-white/80 transition-colors whitespace-nowrap"
          >
            Homable Creations
          </button>

          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/my-boards')}
                  className="text-white hover:text-white/80 hover:bg-white/10 text-xs"
                >
                  My History
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-white hover:text-white/80 hover:bg-white/10 text-xs"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/auth?mode=signin')}
                  className="text-white hover:text-white/80 hover:bg-white/10 text-xs"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/auth?mode=signup')}
                  className="bg-transparent border-[1.5px] border-white text-white hover:bg-white hover:text-black transition-all text-xs whitespace-nowrap"
                >
                  Create Account
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}