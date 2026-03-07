import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitDesignRequest } from '@/lib/api';
import type { DesignRequestRow } from '@/lib/api';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';

const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'dining_room', label: 'Dining Room' },
] as const;

const STYLES = [
  { value: 'modern', label: 'Modern' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'minimalist', label: 'Minimalist' },
] as const;

const MIN_BUDGET_NGN = 100_000;
const MAX_PHOTOS = 2;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = 'image/jpeg,image/png';

// Placeholders - replace with real values
const BANK_NAME = '[Your bank name]';
const ACCOUNT_NUMBER = '[Your account number]';
const WHATSAPP_NUMBER = '2340000000000'; // [YOUR_WHATSAPP_NUMBER] - digits only for wa.me

export default function DesignServiceForm() {
  const [submitted, setSubmitted] = useState<DesignRequestRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [email, setEmail] = useState('');
  const [roomType, setRoomType] = useState('');
  const [budget, setBudget] = useState('');
  const [style, setStyle] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const copyReferenceCode = useCallback(() => {
    if (!submitted?.reference_code) return;
    navigator.clipboard.writeText(submitted.reference_code).then(() => {
      setCopied(true);
      toast.success('Reference code copied');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Could not copy'));
  }, [submitted?.reference_code]);

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email';
    if (!roomType) next.roomType = 'Select a room type';
    const budgetNum = parseInt(budget.replace(/\D/g, ''), 10);
    if (!budget.trim()) next.budget = 'Budget is required';
    else if (Number.isNaN(budgetNum) || budgetNum < MIN_BUDGET_NGN) next.budget = `Minimum budget is ₦${MIN_BUDGET_NGN.toLocaleString('en-NG')}`;
    if (!style) next.style = 'Select a style preference';
    if (photoFiles.length > MAX_PHOTOS) next.photos = `Maximum ${MAX_PHOTOS} photos`;
    for (const f of photoFiles) {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        next.photos = `Each file must be under ${MAX_FILE_SIZE_MB}MB`;
        break;
      }
      if (!['image/jpeg', 'image/png'].includes(f.type)) {
        next.photos = 'Only JPEG and PNG allowed';
        break;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [email, roomType, budget, style, photoFiles]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(files.slice(0, MAX_PHOTOS));
    if (errors.photos) setErrors((prev) => ({ ...prev, photos: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const budgetNum = parseInt(budget.replace(/\D/g, ''), 10);
      const row = await submitDesignRequest({
        email: email.trim(),
        room_type: roomType,
        budget_ngn: budgetNum,
        style,
        notes: notes.trim() || undefined,
        photo_files: photoFiles.length > 0 ? photoFiles : undefined,
      });
      setSubmitted(row);
      toast.success('Request received! Check payment details below.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const waText = encodeURIComponent(`Payment confirmation for ${submitted.reference_code}`);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 py-12 px-4">
        <div className="max-w-[600px] mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-2">✅ Request Received</h1>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <p className="text-sm font-medium text-amber-900 mb-2">Your Reference Code</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-mono font-bold text-[#111111]">{submitted.reference_code}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyReferenceCode}
                className="gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-amber-800 mt-2">Include this code when sending payment confirmation.</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#111111] mb-4">Payment Details</h3>
            <div className="space-y-2 text-[#333]">
              <p><strong>Amount:</strong> ₦15,000</p>
              <p><strong>Bank:</strong> {BANK_NAME}</p>
              <p><strong>Account Number:</strong> {ACCOUNT_NUMBER}</p>
              <p><strong>Account Name:</strong> Homable Creations</p>
              <p><strong>Transfer Narration:</strong> {submitted.reference_code}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">⚠️ When confirming payment on WhatsApp, include: <strong>{submitted.reference_code}</strong></p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e5e5] p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-[#111111]">Next Steps</h3>
            <p className="text-[#555]">⏱️ Design work begins after payment confirmation (2–4 hours)</p>
            <p className="text-[#555]">📧 Design delivered within 48 hours to {submitted.email}</p>
            <div className="pt-2 text-sm text-[#555]">
              🇳🇬 🇨🇦 Registered company in Nigeria & Canada
            </div>
          </div>

          <div className="text-center">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-[#25D366] text-white font-semibold h-14 px-8 hover:bg-[#20BD5A] transition-colors"
            >
              Confirm Payment on WhatsApp
            </a>
          </div>

          <p className="text-center text-sm text-[#666]">
            We&apos;ve sent these payment details to your email. Please send payment confirmation (screenshot) to our WhatsApp to start your design.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 py-12 px-4">
      <div className="max-w-[600px] mx-auto space-y-10">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-2">Design My Space (Beta)</h1>
          <p className="text-lg text-[#555555]">
            Professional room design using real Nigerian vendors — at a fraction of designer costs
          </p>
        </header>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 text-sm text-[#333]">
            <span className="font-medium">✓ Custom design for your space</span>
            <span className="font-medium">✓ Every item from verified Nigerian vendors</span>
            <span className="font-medium">✓ Complete shopping list with prices</span>
            <span className="font-medium">✓ Delivered within 48 hours of payment confirmation</span>
          </div>

          <div className="bg-white rounded-xl border border-[#e5e5e5] p-4">
            <p className="text-sm font-semibold text-[#111111] mb-2">What You&apos;ll Receive</p>
            <ul className="text-sm text-[#555] list-disc list-inside space-y-1">
              <li>Custom room design image (layout and styling)</li>
              <li>Total budget breakdown</li>
              <li>Direct vendor contact links</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <strong className="text-lg text-[#111111]">Investment: ₦15,000</strong>
            <span className="text-sm text-[#666]">(Interior designers charge ₦200,000+)</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl border border-[#e5e5e5] p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            <small className="text-xs text-[#666]">We&apos;ll send your design here</small>
            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_type">Room Type *</Label>
            <select
              id="room_type"
              required
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select room type</option>
              {ROOM_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.roomType && <p className="text-sm text-red-600">{errors.roomType}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Your Budget (for furniture) *</Label>
            <Input
              id="budget"
              type="number"
              required
              min={MIN_BUDGET_NGN}
              placeholder="e.g., 500000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={errors.budget ? 'border-red-500' : ''}
            />
            <small className="text-xs text-[#666]">Minimum ₦{MIN_BUDGET_NGN.toLocaleString('en-NG')}</small>
            {errors.budget && <p className="text-sm text-red-600">{errors.budget}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style Preference *</Label>
            <select
              id="style"
              required
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select style</option>
              {STYLES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.style && <p className="text-sm text-red-600">{errors.style}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos">Upload Room Photos (Optional)</Label>
            <Input
              id="photos"
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handlePhotoChange}
            />
            <small className="text-xs text-[#666]">Maximum {MAX_PHOTOS} photos, {MAX_FILE_SIZE_MB}MB each. JPEG or PNG. Helpful but not required.</small>
            {photoFiles.length > 0 && <p className="text-xs text-[#555]">{photoFiles.length} file(s) selected</p>}
            {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              placeholder="Any specific requests or items you already have?"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit & Get Payment Details'}
          </Button>
        </form>
      </div>
    </div>
  );
}
