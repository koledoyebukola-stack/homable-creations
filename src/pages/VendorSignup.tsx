import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

export default function VendorSignup() {
  const navigate = useNavigate();

  const [storefrontSlug, setStorefrontSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCheckEmail, setShowCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      // Check storefront slug exists and is not already claimed.
      const { data: storefrontRow, error: storefrontError } = await supabase
        .from('storefronts')
        .select('*')
        .eq('slug', storefrontSlug)
        .maybeSingle();

      if (storefrontError) throw storefrontError;
      if (!storefrontRow) {
        setErrorMessage(
          'We could not find that storefront. Check the slug or contact Homable at homablecreations@gmail.com',
        );
        return;
      }
      if ((storefrontRow as any).vendor_user_id) {
        setErrorMessage('This storefront already has an account. Contact Homable if you need help.');
        return;
      }

      // Create Supabase auth user.
      // Email confirmation is enabled, so do not sign in automatically.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: 'https://homablecreations.com/vendor/login',
        },
      });

      if (signUpError) throw signUpError;

      const newUserId = (signUpData as any)?.user?.id as string | undefined;
      if (!newUserId) {
        // Still show the success screen so the vendor can confirm their email.
        setShowCheckEmail(true);
        return;
      }

      // Claim the storefront for this vendor user.
      const updateRes = await supabase
        .from('storefronts')
        .update({ vendor_user_id: newUserId })
        .eq('slug', storefrontSlug)
        .is('vendor_user_id', null);

      setShowCheckEmail(true);
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showCheckEmail) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <div className="w-full h-[200px] md:min-h-screen md:w-1/2 bg-[#1a1a1a] flex flex-col items-center justify-center px-4 md:items-start md:justify-end md:p-8">
          <div className="w-full max-w-[280px] md:max-w-[300px] text-center md:text-left mx-auto md:mx-0">
            <div className="text-[22px] font-semibold text-white mb-2">Homable Creations</div>
            <p className="text-[13px] text-[#c9b99a] leading-[1.6]">
              Nigeria&apos;s home setup assistant. Reach thousands of homeowners actively setting
              up their spaces.
            </p>
          </div>
        </div>

        <div className="md:w-1/2 bg-white flex items-center justify-center">
          <div className="w-full px-6 py-6 md:px-0 md:py-0 md:max-w-[360px]">
            <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[hsl(var(--color-text-secondary))] mb-4">
              VENDOR PORTAL
            </p>
            <h1 className="text-[22px] font-medium text-[#111111] mb-1">Check your email</h1>
            <p className="text-[13px] text-[hsl(var(--color-text-secondary))] mb-6">
              We sent a confirmation link to {email}. Click the link to activate your vendor
              account, then come back to log in.
            </p>

            <Button
              type="button"
              className="w-full bg-[#1a1a1a] text-white hover:bg-gray-900 h-11 rounded-xl border-0 font-medium text-[14px]"
              onClick={() => navigate('/vendor/login')}
            >
              Go to login →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="w-full h-[200px] md:min-h-screen md:w-1/2 bg-[#1a1a1a] flex flex-col items-center justify-center px-4 md:items-start md:justify-end md:p-8">
        <div className="w-full max-w-[280px] md:max-w-[300px] text-center md:text-left mx-auto md:mx-0">
          <div className="text-[22px] font-semibold text-white mb-2">Homable Creations</div>
          <p className="text-[13px] text-[#c9b99a] leading-[1.6]">
            Nigeria&apos;s home setup assistant. Reach thousands of homeowners actively setting
            up their spaces.
          </p>
        </div>
      </div>

      <div className="md:w-1/2 bg-white flex items-center justify-center">
        <div className="w-full px-6 py-6 md:px-0 md:py-0 md:max-w-[360px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[hsl(var(--color-text-secondary))] mb-4">
            VENDOR PORTAL
          </p>

          <h1 className="text-[22px] font-medium text-[#111111] mb-1">Set up your account</h1>
          <p className="text-[13px] text-[hsl(var(--color-text-secondary))] mb-6">
            Create your vendor login to manage your storefront
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="vendor-storefront-slug"
                className="text-[12px] text-[hsl(var(--color-text-secondary))] mb-1.5"
              >
                Storefront slug
              </Label>
              <Input
                id="vendor-storefront-slug"
                value={storefrontSlug}
                onChange={(e) => setStorefrontSlug(e.target.value)}
                placeholder="e.g. wafco-construction-limited"
                required
                className="h-11 min-h-[44px]"
                autoComplete="off"
              />
              <p className="text-sm text-[#777777]">
                Contact Homable if unsure of your storefront slug
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="vendor-first-name"
                className="text-[12px] text-[hsl(var(--color-text-secondary))] mb-1.5"
              >
                First name
              </Label>
              <Input
                id="vendor-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="h-11 min-h-[44px]"
                autoComplete="given-name"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="vendor-last-name"
                className="text-[12px] text-[hsl(var(--color-text-secondary))] mb-1.5"
              >
                Last name
              </Label>
              <Input
                id="vendor-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="h-11 min-h-[44px]"
                autoComplete="family-name"
              />
            </div>

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
                required
                className="h-11 min-h-[44px]"
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-sm text-[#777777]">Minimum 8 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a1a] text-white hover:bg-gray-900 h-11 rounded-xl border-0 font-medium text-[14px]"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>

            {errorMessage && (
              <p className="text-sm text-red-600 pt-2" role="alert">
                {errorMessage}
              </p>
            )}

            <p className="text-[13px] text-[hsl(var(--color-text-secondary))] text-center mt-4">
              Already have an account?{' '}
              <a
                href="/vendor/login"
                className="text-[#111111] font-medium hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/vendor/login');
                }}
              >
                Log in →
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

