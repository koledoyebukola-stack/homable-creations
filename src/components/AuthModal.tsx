import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthModalProps {
  onSuccess: () => void;
  redirectPath?: string;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up with auto-confirm enabled
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        toast.success('Account created successfully!');
        onSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success('Welcome back!');
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" style={{ pointerEvents: 'none' }} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#111111] mb-2">
              {isSignUp ? 'Your Decor Matches Are Ready' : 'Welcome Back'}
            </h2>
            <p className="text-[#555555]">
              {isSignUp 
                ? 'Create a free account to see your personalized results.'
                : 'Sign in to see your personalized results.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#111111]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#111111]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full bg-[#111111] hover:bg-[#333333] text-white text-lg py-6 rounded-full"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Free Account' : 'Sign In'}
            </Button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-sm text-[#555555] hover:text-[#111111] transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}