import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

type RecoveryState = 'checking' | 'ready' | 'invalid';

export default function VendorResetPassword() {
  const navigate = useNavigate();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let done = false;

    const timeoutId = window.setTimeout(() => {
      if (!done) {
        setRecoveryState('invalid');
      }
    }, 3000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        done = true;
        window.clearTimeout(timeoutId);
        setRecoveryState('ready');
      }
    });

    return () => {
      done = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message || 'Unable to update password. Please try again.');
      return;
    }

    setSuccessMessage('Password updated. Redirecting to login...');
    window.setTimeout(() => {
      window.location.href = '/vendor/login';
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="w-full h-[200px] md:min-h-screen md:w-1/2 bg-[#1a1a1a] flex flex-col items-center justify-center px-4 md:items-start md:justify-end md:p-8">
        <div className="w-full max-w-[280px] md:max-w-[300px] text-center md:text-left mx-auto md:mx-0">
          <div className="text-[22px] font-semibold text-white mb-2">Homable Creations</div>
          <p className="text-[13px] text-[#c9b99a] leading-[1.6]">
            Nigeria&apos;s home setup assistant. Reach thousands of homeowners actively setting up
            their spaces.
          </p>
        </div>
      </div>

      <div className="md:w-1/2 bg-white flex items-center justify-center">
        <div className="w-full px-6 py-6 md:px-0 md:py-0 md:max-w-[360px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[hsl(var(--color-text-secondary))] mb-4">
            VENDOR PORTAL
          </p>
          <h1 className="text-[22px] font-medium text-[#111111] mb-1">Set a new password</h1>
          <p className="text-[13px] text-[hsl(var(--color-text-secondary))] mb-6">
            Enter your new password below
          </p>

          {recoveryState === 'checking' && (
            <p className="text-[13px] text-[hsl(var(--color-text-secondary))]">Checking reset link...</p>
          )}

          {recoveryState === 'invalid' && (
            <div className="space-y-4">
              <p className="text-[13px] text-[hsl(var(--color-text-secondary))]">
                This link has expired or is invalid. Request a new one from the login page.
              </p>
              <a
                href="/vendor/login"
                className="text-[13px] text-[#111111] font-medium hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/vendor/login');
                }}
              >
                Back to login
              </a>
            </div>
          )}

          {recoveryState === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="vendor-new-password"
                  className="text-[12px] text-[hsl(var(--color-text-secondary))] mb-1.5"
                >
                  New password
                </Label>
                <Input
                  id="vendor-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  minLength={8}
                  required
                  className="h-11 min-h-[44px]"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="vendor-confirm-password"
                  className="text-[12px] text-[hsl(var(--color-text-secondary))] mb-1.5"
                >
                  Confirm password
                </Label>
                <Input
                  id="vendor-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                  className="h-11 min-h-[44px]"
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1a1a1a] text-white hover:bg-gray-900 h-12 rounded-xl border-0 font-medium text-[14px]"
              >
                {submitting ? 'Updating password...' : 'Update password'}
              </Button>

              {errorMessage && (
                <p className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-[hsl(var(--color-text-secondary))]" role="status">
                  {successMessage}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
