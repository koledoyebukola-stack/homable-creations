import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface AuthModalProps {
  onSuccess: () => void;
  redirectPath?: string;
  /** Custom title (e.g. for Explore gate: "Sign in to continue") */
  title?: string;
  /** Custom subtitle/description */
  subtitle?: string;
  /** When set, show X button that calls onClose (e.g. redirect home – no bypass) */
  onClose?: () => void;
}

export default function AuthModal({ onSuccess, title, subtitle, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignUpConfirmation, setShowSignUpConfirmation] = useState(false);

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
        // Sign up with auto-confirm enabled
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;
        // Replace the form with confirmation messaging.
        // Do not call onSuccess() (no auto-sign-in / no navigation).
        setShowSignUpConfirmation(true);
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
        <div className="relative bg-white rounded-3xl shadow-2xl p-8">
          {/* Close button (e.g. Explore gate: X redirects home, no bypass) */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#111111] mb-2">
              {title ?? (isForgotPassword
                ? 'Reset Your Password'
                : isSignUp
                  ? 'Your Decor Matches Are Ready'
                  : 'Welcome Back')}
            </h2>
            <p className="text-[#555555]">
              {subtitle ?? (isForgotPassword
                ? 'Enter your email and we\'ll send you a reset link.'
                : isSignUp
                  ? 'Create a free account to see your personalized results.'
                  : 'Sign in to see your personalized results.')}
            </p>
          </div>

          {/* Form or signup confirmation message */}
          {showSignUpConfirmation ? (
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-[#111111]">Check your inbox</h3>
              <p className="text-[#555555]">
                We&apos;ve sent a confirmation link to your email address. Click it to activate
                your Homable Creations account.
              </p>
              <p className="text-sm text-[#777777]">
                Didn&apos;t receive it? Check your spam folder or try signing up again.
              </p>
            </div>
          ) : (
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

              {!isForgotPassword && (
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
          )}
        </div>
      </div>
    </div>
  );
}
