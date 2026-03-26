import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { vendorSignUp } from '@/lib/vendor-api';

export default function VendorSignup() {
  const navigate = useNavigate();

  const [storefrontSlug, setStorefrontSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await vendorSignUp({
        storefrontSlug,
        firstName,
        lastName,
        email,
        password,
      });

      if (!res.ok) {
        if (res.reason === 'STORE_NOT_FOUND') {
          setErrorMessage(
            'We could not find that storefront. Check the slug or contact Homable at homablecreations@gmail.com',
          );
          return;
        }
        if (res.reason === 'STORE_ALREADY_CLAIMED') {
          setErrorMessage('This storefront already has an account. Contact Homable if you need help.');
          return;
        }
        setErrorMessage('Something went wrong. Please try again.');
        return;
      }

      navigate('/vendor/dashboard');
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
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

        <h1 className="text-2xl font-bold text-[#111111] mb-2">Set up your vendor account</h1>
        <p className="text-[#555555] mb-6">Create your vendor login to manage your storefront</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-storefront-slug" className="text-[#111111]">
              Storefront slug
            </Label>
            <Input
              id="vendor-storefront-slug"
              value={storefrontSlug}
              onChange={(e) => setStorefrontSlug(e.target.value)}
              placeholder="e.g. wafco-construction-limited"
              required
              className="h-12"
              autoComplete="off"
            />
            <p className="text-sm text-[#777777]">
              Contact Homable if unsure of your storefront slug
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-first-name" className="text-[#111111]">
              First name
            </Label>
            <Input
              id="vendor-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="h-12"
              autoComplete="given-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-last-name" className="text-[#111111]">
              Last name
            </Label>
            <Input
              id="vendor-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="h-12"
              autoComplete="family-name"
            />
          </div>

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
              required
              className="h-12"
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-sm text-[#777777]">Minimum 8 characters</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white hover:bg-gray-900 h-12 rounded-xl"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>

          {errorMessage && (
            <p className="text-sm text-red-600 pt-2" role="alert">
              {errorMessage}
            </p>
          )}

          <p className="text-sm text-[#555555] text-center pt-2">
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
  );
}

