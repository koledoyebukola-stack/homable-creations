import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { vendorGetDashboardData, vendorSignOut, vendorSubmitNewProductForReview, vendorUpdateProductGrid, type VendorAvailability } from '@/lib/vendor-api';
import type { VendorDashboardProduct } from '@/lib/vendor-api';

function formatMoneyInput(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // We only store integers in the UI. If the DB returns decimals, drop them.
  return s.includes('.') ? s.split('.')[0] : s;
}

function sanitizeDigitsOnly(input: string): string {
  return input.replace(/[^\d]/g, '');
}

const AVAILABILITY_OPTIONS: Array<{ value: VendorAvailability; label: string }> = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'made_to_order', label: 'Made to Order' },
];

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'seating', label: 'Seating' },
  { value: 'bed', label: 'Bed' },
  { value: 'table', label: 'Table' },
  { value: 'storage', label: 'Storage' },
  { value: 'artwork', label: 'Artwork' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'mirror', label: 'Mirror' },
  { value: 'planters', label: 'Planters' },
  { value: 'rugs', label: 'Rugs' },
  { value: 'dining set', label: 'Dining Set' },
  { value: 'console table', label: 'Console Table' },
  { value: 'side table', label: 'Side Table' },
  { value: 'curtains', label: 'Curtains' },
];

const ROOM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'dining', label: 'Dining Room' },
  { value: 'office', label: 'Home Office' },
  { value: 'any', label: 'Any' },
];

export default function VendorDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string>('');
  const [storefrontSlug, setStorefrontSlug] = useState<string>('');
  const [storefrontId, setStorefrontId] = useState<string>('');
  const [storefrontName, setStorefrontName] = useState<string>('');
  const [products, setProducts] = useState<VendorDashboardProduct[]>([]);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [productEdits, setProductEdits] = useState<
    Record<
      string,
      {
        priceMinInput: string;
        priceMaxInput: string;
        availability: VendorAvailability;
      }
    >
  >({});

  const load = async (opts?: { resetSaveState?: boolean }) => {
    setLoading(true);
    if (opts?.resetSaveState !== false) setSaveState('idle');
    try {
      const data = await vendorGetDashboardData();
      setFirstName(data.firstName);
      setStorefrontSlug(data.storefront.slug);
      setStorefrontId(data.storefront.id);
      setStorefrontName(data.storefront.name);
      setProducts(data.products);

      const nextEdits: typeof productEdits = {};
      data.products.forEach((p) => {
        nextEdits[p.id] = {
          priceMinInput: formatMoneyInput(p.price_min),
          priceMaxInput: formatMoneyInput(p.price_max),
          availability: (p.availability || 'in_stock') as VendorAvailability,
        };
      });
      setProductEdits(nextEdits);
    } catch (error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log(
        '[VENDOR DASH] redirecting to login because:',
        'session:',
        session,
        'loading:',
        loading,
        'error:',
        error,
      );
      toast.error('Something went wrong. Please try again.');
      navigate('/vendor/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAllChanges = async () => {
    if (!storefrontId) return;
    setSaveState('saving');
    try {
      const updates = products.map((p) => {
        const edit = productEdits[p.id];
        return {
          productId: p.id,
          priceMinInput: edit?.priceMinInput ?? '',
          priceMaxInput: edit?.priceMaxInput ?? '',
          availability: edit?.availability ?? 'in_stock',
        };
      });

      await vendorUpdateProductGrid({ storefrontId, updates });
      toast.success('Changes saved successfully');
      setSaveState('saved');
      await load({ resetSaveState: false });
    } catch {
      setSaveState('idle');
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await vendorSignOut();
    } finally {
      navigate('/vendor/login');
    }
  };

  // Section 2: Add a New Product
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORY_OPTIONS[0]?.value || 'seating');
  const [newRoom, setNewRoom] = useState(ROOM_OPTIONS[0]?.value || 'living_room');
  const [newMinPriceInput, setNewMinPriceInput] = useState('');
  const [newMaxPriceInput, setNewMaxPriceInput] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submittingNewProduct, setSubmittingNewProduct] = useState(false);

  const storefrontForSubmit = useMemo(() => {
    // Reuse current loaded storefront fields for API call.
    if (!storefrontId || !storefrontSlug || !storefrontName) return null;
    return {
      id: storefrontId,
      slug: storefrontSlug,
      name: storefrontName,
      location: null,
      location_display: null,
      description: null,
      logo_url: null,
      banner_url: null,
      whatsapp_number: '',
      instagram_handle: null,
      vendor_type: 'decor_store' as const,
      status: 'active' as const,
      offering_type: undefined,
      active_since: null,
      created_at: '',
      updated_at: '',
    };
  }, [storefrontId, storefrontSlug, storefrontName]);

  const submitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storefrontForSubmit || !newFile) {
      toast.error('Something went wrong. Please try again.');
      return;
    }

    setSubmittingNewProduct(true);
    try {
      const validTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!validTypes.has(newFile.type)) {
        toast.error('Something went wrong. Please try again.');
        return;
      }
      if (newFile.size > 10 * 1024 * 1024) {
        toast.error('Something went wrong. Please try again.');
        return;
      }

      const roomValue = newRoom === 'any' ? null : newRoom;

      await vendorSubmitNewProductForReview({
        storefront: storefrontForSubmit as any,
        productName: newProductName,
        category: newCategory.toLowerCase(),
        room: roomValue,
        minPriceInput: newMinPriceInput,
        maxPriceInput: newMaxPriceInput,
        description: newDescription.trim() === '' ? null : newDescription,
        file: newFile,
      });

      toast.success(
        'Your product has been submitted for review. Homable will review and publish it shortly.',
      );

      // Reset form and refresh grid.
      setNewFile(null);
      setNewProductName('');
      setNewCategory(CATEGORY_OPTIONS[0]?.value || 'seating');
      setNewRoom(ROOM_OPTIONS[0]?.value || 'living_room');
      setNewMinPriceInput('');
      setNewMaxPriceInput('');
      setNewDescription('');

      await load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmittingNewProduct(false);
    }
  };

  const session = undefined;
  console.log('[VENDOR DASH] render - session:', session?.user?.email, 'loading:', loading);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <div className="pb-28 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#111111]">
                  Welcome, {firstName}
                </h1>
                <p className="text-sm text-[#555555] mt-1">{storefrontName}</p>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="block text-sm font-medium text-[#111111] hover:underline"
                  onClick={() => navigate(`/stores/${storefrontSlug}`)}
                >
                  View your storefront →
                </button>
                <button
                  type="button"
                  className="mt-2 block text-xs text-[#555555] hover:underline"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 md:px-6 py-8">
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#111111]">Your Products</h2>
            <p className="text-sm text-[#555555] mt-1">Update prices and availability for your products</p>

            {loading ? (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
                {products.map((p) => {
                  const edit = productEdits[p.id] || {
                    priceMinInput: '',
                    priceMaxInput: '',
                    availability: 'in_stock' as VendorAvailability,
                  };

                  const isPending = p.status === 'pending';
                  return (
                    <div
                      key={p.id}
                      className={[
                        'rounded-2xl border border-[#e5e5e5] bg-white p-3 flex flex-col',
                        isPending ? 'opacity-70' : '',
                      ].join(' ')}
                    >
                      <div className="relative">
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-gray-100">
                          {p.displayImageUrl ? (
                            <img
                              src={p.displayImageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#999] text-xs">
                              No image
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-gray-900 text-white border-0 shadow-sm px-2 py-0.5 rounded-full text-[10px]">
                              Pending review
                            </Badge>
                          </div>
                        )}
                      </div>

                      <h3 className="text-[13px] font-semibold text-gray-900 mt-3 leading-snug line-clamp-2">
                        {p.name}
                      </h3>

                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#111111]">₦</span>
                            <Input
                              value={edit.priceMinInput}
                              onChange={(ev) => {
                                const next = sanitizeDigitsOnly(ev.target.value);
                                setProductEdits((prev) => ({
                                  ...prev,
                                  [p.id]: { ...edit, priceMinInput: next },
                                }));
                              }}
                              placeholder="Min price"
                              className="h-12"
                              inputMode="numeric"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#111111]">₦</span>
                            <Input
                              value={edit.priceMaxInput}
                              onChange={(ev) => {
                                const next = sanitizeDigitsOnly(ev.target.value);
                                setProductEdits((prev) => ({
                                  ...prev,
                                  [p.id]: { ...edit, priceMaxInput: next },
                                }));
                              }}
                              placeholder="Max (optional)"
                              className="h-12"
                              inputMode="numeric"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-[#555555]">Availability:</Label>
                          <Select
                            value={edit.availability}
                            onValueChange={(v) => {
                              setProductEdits((prev) => ({
                                ...prev,
                                [p.id]: { ...edit, availability: v as VendorAvailability },
                              }));
                            }}
                          >
                            <SelectTrigger className="h-12 mt-1">
                              <SelectValue placeholder="Availability" />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABILITY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!loading && products.length > 0 && (
            <section className="md:hidden">
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-black px-4 py-4">
                {saveState === 'saved' ? (
                  <Button
                    type="button"
                    className="w-full bg-black text-white hover:bg-black rounded-xl h-12"
                    onClick={() => navigate(`/stores/${storefrontSlug}`)}
                  >
                    View your storefront →
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-12"
                    onClick={() => void saveAllChanges()}
                    disabled={saveState === 'saving'}
                  >
                    {saveState === 'saving' ? 'Saving…' : 'Save all changes'}
                  </Button>
                )}
              </div>
            </section>
          )}

          {!loading && products.length > 0 && (
            <section className="hidden md:block mb-10">
              <Button
                type="button"
                className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-12"
                onClick={() => void (saveState === 'saved' ? navigate(`/stores/${storefrontSlug}`) : saveAllChanges())}
                disabled={saveState === 'saving'}
              >
                {saveState === 'saved' ? 'View your storefront →' : saveState === 'saving' ? 'Saving…' : 'Save all changes'}
              </Button>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-xl font-semibold text-[#111111]">Add a New Product</h2>
            <p className="text-sm text-[#555555] mt-1">
              Submit a product for review. Homable will edit the photo and approve before it goes live.
            </p>

            <form onSubmit={submitNewProduct} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[#111111]">Product photo</Label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setNewFile(file);
                  }}
                  className="w-full"
                />
                <p className="text-sm text-[#777777]">We will edit this photo before it goes live</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#111111]">Product name</Label>
                <Input
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Cream Curved Sofa"
                  className="h-12"
                  required
                />
                <p className="text-sm text-[#777777]">We may update this to make it more searchable</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#111111]">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#111111]">Room</Label>
                <Select value={newRoom} onValueChange={setNewRoom}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Room" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#111111]">Min price</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#111111]">₦</span>
                  <Input
                    value={newMinPriceInput}
                    onChange={(e) => setNewMinPriceInput(sanitizeDigitsOnly(e.target.value))}
                    placeholder="Enter price"
                    className="h-12"
                    required
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#111111]">Max price</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#111111]">₦</span>
                  <Input
                    value={newMaxPriceInput}
                    onChange={(e) => setNewMaxPriceInput(sanitizeDigitsOnly(e.target.value))}
                    placeholder="Optional"
                    className="h-12"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#111111]">Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Any details about this product"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingNewProduct}
                className="w-full bg-black text-white hover:bg-gray-900 rounded-xl h-12 mt-2"
              >
                {submittingNewProduct ? 'Submitting…' : 'Submit for review'}
              </Button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

