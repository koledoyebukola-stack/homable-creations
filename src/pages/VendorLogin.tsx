import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

export default function VendorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roomImageUrl =
    'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Gist%20and%20Chill%20Living%20Room.png';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage('Incorrect email or password. Please try again.');
        return;
      }
      window.location.href = '/vendor/dashboard';
    } catch {
      setErrorMessage('Incorrect email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="relative w-full h-[180px] md:h-auto md:w-1/2 overflow-hidden bg-[#1a1a1a]">
        <img src={roomImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />

        <div className="absolute left-4 bottom-4">
          <div className="text-white text-[14px] font-medium">Homable Creations</div>
          <div className="mt-1 text-[#c9b99a] text-[12px] leading-[1.6] max-w-[90%]">
            Nigeria&apos;s home setup assistant. Reach thousands of homeowners actively setting up
            their spaces.
          </div>
        </div>
      </div>

      <div className="md:w-1/2 bg-white flex items-center justify-center">
        <div className="w-full px-6 py-6 md:px-0 md:py-0 md:max-w-[360px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[hsl(var(--color-text-secondary))] mb-4">
            VENDOR PORTAL
          </p>

          <h1 className="text-[22px] font-medium text-[#111111] mb-1">Welcome back</h1>
          <p className="text-[13px] text-[hsl(var(--color-text-secondary))] mb-6">
            Sign in to manage your storefront
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="vendor-email"
                className="text-[12px] text-[hsl(var(--color-text-secondary))] mb-1.5"
              >
                Email
              </Label>
              <Input
                id="vendor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-11 min-h-[44px]"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="vendor-password"
                className="text-[12px] text-[hsl(var(--color-text-secondary))] mb-1.5"
              >
                Password
              </Label>
              <Input
                id="vendor-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 min-h-[44px]"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white hover:bg-gray-900 h-11 rounded-xl border-0 font-medium text-[14px]"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </Button>

            {errorMessage && (
              <p className="text-sm text-red-600 mt-2" role="alert">
                {errorMessage}
              </p>
            )}

            <p className="text-[13px] text-[hsl(var(--color-text-secondary))] text-center mt-4">
              New vendor?{' '}
              <a
                href="/vendor/signup"
                className="text-[#111111] font-medium hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/vendor/signup');
                }}
              >
                Set up your account →
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

