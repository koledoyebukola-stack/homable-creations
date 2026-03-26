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
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate('/vendor/dashboard');
    } catch {
      setErrorMessage('Incorrect email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-[#111111]">Homable Creations</div>
        </div>

        <h1 className="text-2xl font-bold text-[#111111] mb-2">Vendor Portal</h1>
        <p className="text-[#555555] mb-6">Manage your storefront</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-email" className="text-[#111111]">
              Email
            </Label>
            <Input
              id="vendor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-12"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-password" className="text-[#111111]">
              Password
            </Label>
            <Input
              id="vendor-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-12"
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white hover:bg-gray-900 h-12 rounded-xl"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </Button>

          {errorMessage && (
            <p className="text-sm text-red-600 mt-2" role="alert">
              {errorMessage}
            </p>
          )}

          <p className="text-sm text-[#555555] text-center pt-2">
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
  );
}

