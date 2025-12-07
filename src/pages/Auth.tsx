import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signup';
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectPath = searchParams.get('redirect') || '/upload';

  useEffect(() => {
    // Update isSignUp when mode changes
    setIsSignUp(mode === 'signup');
  }, [mode]);

  useEffect(() => {
    // Add blur effect to body
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        toast.success('Password reset email sent! Check your inbox.');
        setIsForgotPassword(false);
        setEmail('');
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        toast.success('Account created successfully!');
        navigate(redirectPath);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast.success('Welcome back!');
        navigate(redirectPath);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#111111] mb-2">
              {isForgotPassword 
                ? 'Reset Your Password' 
                : isSignUp 
                ? 'Create Your Free Account' 
                : 'Welcome Back'}
            </h2>
            <p className="text-[#555555]">
              {isForgotPassword
                ? 'Enter your email and we\'ll send you a reset link.'
                : isSignUp 
                ? 'Sign up to save your inspiration boards and get personalized results.'
                : 'Sign in to access your saved boards and continue shopping.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#111111]">Email</Label>
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

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#111111]">Password</Label>
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
            )}

            {!isSignUp && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-[#555555] hover:text-[#111111] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full bg-[#111111] hover:bg-[#333333] text-white text-lg py-6 rounded-full"
            >
              {loading 
                ? 'Loading...' 
                : isForgotPassword 
                ? 'Send Reset Link'
                : isSignUp 
                ? 'Create Free Account' 
                : 'Sign In'}
            </Button>

            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setEmail('');
                }}
                className="w-full text-center text-sm text-[#555555] hover:text-[#111111] transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-center text-sm text-[#555555] hover:text-[#111111] transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
