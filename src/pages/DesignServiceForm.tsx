import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitDesignRequest } from '@/lib/api';
import type { DesignRequestRow } from '@/lib/api';
import { toast } from 'sonner';
import { Copy, Check, CheckCircle2, ImageIcon, FileText, Upload, Sparkles, PackageCheck } from 'lucide-react';

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

const MAX_PHOTOS = 2;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = 'image/jpeg,image/png';

const BANK_NAME = '[Your bank name]';
const ACCOUNT_NUMBER = '[Your account number]';
const WHATSAPP_NUMBER = '2340000000000';

const SEE_WHATS_POSSIBLE_IMAGES = [
  { url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Coastal%20Calm%20Living%20Room.png', alt: 'Coastal Calm Living Room' },
  { url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Golden%20Olive%20Living%20Room.png', alt: 'Golden Olive Living Room' },
  { url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Urban%20Evergreen%20Living%20Room.png', alt: 'Urban Evergreen Living Room' },
  { url: 'https://jvbrrgqepuhabwddufby.supabase.co/storage/v1/object/public/explore-inspirations/Noir%20Botanical%20Living%20Room.png', alt: 'Noir Botanical Living Room' },
];

const VALUE_PROPS = [
  'Custom design for your space',
  'Every item from verified Nigerian vendors',
  'Complete shopping list with prices',
  'Delivered within 48 hours of payment confirmation',
];

const HOW_IT_WORKS_STEPS = [
  {
    number: 1,
    icon: Upload,
    title: 'Upload your space',
    description: 'Share 1–2 photos of your living room, bedroom, or dining room.',
  },
  {
    number: 2,
    icon: Sparkles,
    title: 'We design it for you',
    description: 'Our team designs your space using real furniture and decor pieces from verified Nigerian vendors to match your style.',
  },
  {
    number: 3,
    icon: PackageCheck,
    title: 'Receive your plan',
    description: 'Get a custom design image, full shopping list with prices, and direct vendor contacts.',
  },
];

export default function DesignServiceForm() {
  const [submitted, setSubmitted] = useState<DesignRequestRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [email, setEmail] = useState('');
  const [roomType, setRoomType] = useState('');
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
  }, [email, roomType, style, photoFiles]);

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
      const row = await submitDesignRequest({
        email: email.trim(),
        room_type: roomType,
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
      <div className="min-h-screen bg-gradient-to-br from-[#f9f9f9] via-gray-50 to-stone-50">
        <div className="max-w-[560px] mx-auto px-4 py-12 md:py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#111111] tracking-tight mb-2">
              Request received
            </h1>
            <p className="text-lg text-[#555555]">
              Use the details below to complete payment and get your design started.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm overflow-hidden mb-6">
            <div className="bg-amber-50/80 border-b border-amber-100 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/90 mb-1">
                Your reference code
              </p>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-2xl font-mono font-bold text-[#111111] tracking-tight">
                  {submitted.reference_code}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyReferenceCode}
                  className="gap-2 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-amber-800/80 mt-2">
                Include this code when sending payment confirmation.
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-3">
                  Payment details
                </h2>
                <dl className="space-y-2 text-[#333]">
                  <div className="flex justify-between"><dt className="text-[#666]">Amount</dt><dd className="font-semibold">₦15,000</dd></div>
                  <div className="flex justify-between"><dt className="text-[#666]">Bank</dt><dd>{BANK_NAME}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#666]">Account number</dt><dd>{ACCOUNT_NUMBER}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#666]">Account name</dt><dd>Homable Creations</dd></div>
                  <div className="flex justify-between"><dt className="text-[#666]">Narration</dt><dd className="font-mono font-medium">{submitted.reference_code}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-4">
                <p className="text-sm font-medium text-blue-900">
                  ⚠️ When confirming payment on WhatsApp, include your reference code: <strong>{submitted.reference_code}</strong>
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider">Next steps</h2>
                <p className="text-[#555555] text-sm">⏱️ Design work begins after payment confirmation (2–4 hours)</p>
                <p className="text-[#555555] text-sm">📧 Design delivered within 48 hours to <strong className="text-[#333]">{submitted.email}</strong></p>
                <p className="text-[#555555] text-sm pt-2">🇳🇬 🇨🇦 Registered company in Nigeria & Canada</p>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-[#25D366] text-white font-semibold h-14 px-8 hover:bg-[#20BD5A] transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
            >
              Confirm payment on WhatsApp
            </a>
          </div>

          <p className="text-center text-sm text-[#666] max-w-md mx-auto">
            We&apos;ve sent these payment details to your email. Send payment confirmation (screenshot) to our WhatsApp to start your design.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9f9f9] via-gray-50 to-stone-50">
      <div className="max-w-[560px] mx-auto px-4 py-12 md:py-16">
        <header className="text-center mb-8">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full mb-4">
            Beta
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-[#111111] tracking-tight mb-3">
            Design My Space
          </h1>
          <p className="text-lg md:text-xl text-[#555555] leading-relaxed max-w-lg mx-auto">
            Your room, designed by experts, furnished by verified Nigerian vendors. Ready to buy in 48 hours.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-[#111111] mb-4">See what&apos;s possible</h2>
          <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scroll-pills-hide-scrollbar">
            <div className="flex gap-4 w-max md:w-full md:grid md:grid-cols-4">
              {SEE_WHATS_POSSIBLE_IMAGES.map(({ url, alt }) => (
                <div
                  key={url}
                  className="flex-shrink-0 w-[260px] md:w-auto rounded-2xl overflow-hidden border border-[#e5e5e5] bg-white shadow-sm"
                >
                  <img
                    src={url}
                    alt={alt}
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-8 mb-10">
          <ul className="space-y-3">
            {VALUE_PROPS.map((text) => (
              <li key={text} className="flex items-center gap-3 text-[#333] font-medium">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <p className="text-xl md:text-2xl font-bold text-[#111111] leading-snug text-center md:text-left">
            Can&apos;t afford interior designers? No problem. Get the same result for ₦15,000 instead of ₦200,000+.
          </p>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-[#111111]">How it works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="relative rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-sm transition-shadow hover:shadow-md hover:border-[#111111]/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#111111] text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#666]">
                          Step {step.number}
                        </span>
                        <h3 className="text-lg font-bold text-[#111111] mb-2">{step.title}</h3>
                        <p className="text-[#555555] text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-[#111111]">Investment: ₦15,000</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e5e5e5] shadow-sm p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#111111] font-medium">Email address *</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`h-12 rounded-xl border-[#e5e5e5] ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            <p className="text-xs text-[#666]">We&apos;ll send your design here</p>
            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_type" className="text-[#111111] font-medium">Room type *</Label>
            <select
              id="room_type"
              required
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-[#111111] text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
            >
              <option value="">Select room type</option>
              {ROOM_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.roomType && <p className="text-sm text-red-600">{errors.roomType}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="style" className="text-[#111111] font-medium">Style preference *</Label>
            <select
              id="style"
              required
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-[#111111] text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
            >
              <option value="">Select style</option>
              {STYLES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {errors.style && <p className="text-sm text-red-600">{errors.style}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos" className="text-[#111111] font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#666]" />
              Upload room photos (optional)
            </Label>
            <Input
              id="photos"
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handlePhotoChange}
              className="h-12 rounded-xl border-[#e5e5e5] file:mr-4 file:rounded-lg file:border-0 file:bg-[#111111]/5 file:px-4 file:py-2 file:text-sm file:font-medium"
            />
            <p className="text-xs text-[#666]">Max {MAX_PHOTOS} photos, {MAX_FILE_SIZE_MB}MB each. JPEG or PNG. Helpful but not required.</p>
            {photoFiles.length > 0 && <p className="text-xs text-[#555]">{photoFiles.length} file(s) selected</p>}
            {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#111111] font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#666]" />
              Additional notes (optional)
            </Label>
            <textarea
              id="notes"
              placeholder="Any specific requests or items you already have?"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-[#111111] text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 min-h-[96px] resize-y placeholder:text-[#999]"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-base font-semibold rounded-xl bg-[#111111] hover:bg-[#1a1a1a] transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit & get payment details'}
          </Button>
        </form>
      </div>
    </div>
  );
}
