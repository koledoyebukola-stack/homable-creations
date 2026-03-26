import { supabase } from '@/lib/supabase';
import type { Storefront, VendorProduct } from '@/lib/types';

export type VendorAvailability = 'in_stock' | 'sold_out' | 'made_to_order';
export type VendorProductStatus = 'active' | 'pending' | 'paused';

type VendorAuthUser = {
  id: string;
  user_metadata?: Record<string, unknown>;
};

export type VendorDashboardProduct = VendorProduct & {
  status: VendorProductStatus;
  availability: VendorAvailability;
  /**
   * If image_url is not a full URL (pending-review bucket path),
   * we resolve it to a signed URL for display.
   */
  displayImageUrl: string | null;
};

export type VendorDashboardData = {
  storefront: Storefront;
  firstName: string;
  products: VendorDashboardProduct[];
};

export function kebabCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isProbablyPublicUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function maybeGetPendingSignedUrl(objectPath: string): Promise<string | null> {
  try {
    const bucket = supabase.storage.from('pending-review');
    const res = await bucket.createSignedUrl(objectPath, 60 * 60);
    const signedUrl = (res as any)?.data?.signedUrl as string | undefined;
    if (!signedUrl) return null;
    return signedUrl;
  } catch {
    return null;
  }
}

async function resolveDisplayImageUrl(vp: VendorProduct & { status?: VendorProductStatus }, storefrontId: string): Promise<string | null> {
  const imageUrl = vp.image_url as unknown as string | null | undefined;
  if (!imageUrl) return null;
  if (isProbablyPublicUrl(imageUrl)) return imageUrl;

  // In vendor flow we store pending-review objects as: `{storefront_id}/{timestamp}.{ext}`
  // Only sign when the path matches that convention.
  const pendingPrefix = `${storefrontId}/`;
  if (!imageUrl.startsWith(pendingPrefix)) {
    return imageUrl;
  }

  if (imageUrl.includes('/')) {
    return maybeGetPendingSignedUrl(imageUrl);
  }
  return imageUrl;
}

export async function vendorSignIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function vendorSignOut() {
  await supabase.auth.signOut();
}

export async function vendorSignUp(params: {
  storefrontSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const { storefrontSlug, firstName, lastName, email, password } = params;

  // Validation: storefront slug must exist and must not already have a vendor account.
  const { data: storefrontRow, error: storefrontError } = await supabase
    .from('storefronts')
    .select('*')
    .eq('slug', storefrontSlug)
    .maybeSingle();

  if (storefrontError) throw storefrontError;
  if (!storefrontRow) {
    return { ok: false as const, reason: 'STORE_NOT_FOUND' as const };
  }

  const typedStorefront = storefrontRow as Storefront & { vendor_user_id?: string | null };
  if (typedStorefront.vendor_user_id) {
    return { ok: false as const, reason: 'STORE_ALREADY_CLAIMED' as const };
  }

  // Create auth account with metadata so dashboard can greet the vendor.
  const signUpRes = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (signUpRes.error) return { ok: false as const, reason: 'AUTH_FAILED' as const, error: signUpRes.error };

  // Ensure we have a session (some projects do not auto sign-in on signUp).
  const { data: currentUserData } = await supabase.auth.getUser();
  const user = currentUserData.user as VendorAuthUser | null | undefined;

  if (!user?.id) {
    const signInRes = await supabase.auth.signInWithPassword({ email, password });
    if (signInRes.error) {
      return { ok: false as const, reason: 'AUTH_FAILED' as const, error: signInRes.error };
    }
  }

  const { data: userData } = await supabase.auth.getUser();
  const confirmedUser = userData.user as VendorAuthUser | null | undefined;
  if (!confirmedUser?.id) {
    return { ok: false as const, reason: 'AUTH_FAILED' as const };
  }

  // Claim the storefront for this vendor_user_id (only when NULL).
  const updateRes = await supabase
    .from('storefronts')
    .update({ vendor_user_id: confirmedUser.id })
    .eq('slug', storefrontSlug)
    .is('vendor_user_id', null);

  if (updateRes.error) return { ok: false as const, reason: 'AUTH_FAILED' as const, error: updateRes.error };

  return { ok: true as const };
}

export async function vendorGetDashboardData(): Promise<VendorDashboardData> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const user = userData.user as any;
  if (!user?.id) throw new Error('Not authenticated');

  const firstNameRaw = (user.user_metadata?.first_name ?? user.user_metadata?.firstName) as string | undefined;
  const firstName = firstNameRaw || 'Vendor';

  // Fetch storefront owned by this vendor user
  const { data: storefront, error: storefrontError } = await supabase
    .from('storefronts')
    .select('*')
    .eq('vendor_user_id', user.id)
    .maybeSingle();

  if (storefrontError) throw storefrontError;
  if (!storefront) throw new Error('Storefront not found');

  // Fetch all vendor products for dashboard (active/pending/paused)
  const { data: products, error: productsError } = await supabase
    .from('vendor_products')
    .select('*')
    .eq('storefront_id', (storefront as Storefront).id)
    .in('status', ['active', 'pending', 'paused'])
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (productsError) throw productsError;

  const typedProducts = (products || []) as VendorProduct[] & Array<any>;
  const resolvedProducts: VendorDashboardProduct[] = await Promise.all(
    (typedProducts || []).map(async (p: any) => {
      const displayImageUrl = await resolveDisplayImageUrl(p, (storefront as Storefront).id);
      return {
        ...(p as VendorProduct),
        status: p.status as VendorProductStatus,
        availability: p.availability as VendorAvailability,
        displayImageUrl,
      };
    }),
  );

  return {
    storefront: storefront as Storefront,
    firstName,
    products: resolvedProducts,
  };
}

export async function vendorUpdateProductGrid(params: {
  storefrontId: string;
  updates: Array<{
    productId: string;
    priceMinInput: string;
    priceMaxInput: string;
    availability: VendorAvailability;
  }>;
}) {
  const { storefrontId, updates } = params;

  const results = await Promise.all(
    updates.map(async (u) => {
      const minEmpty = u.priceMinInput.trim() === '';
      const maxEmpty = u.priceMaxInput.trim() === '';

      const patch: Record<string, any> = {
        availability: u.availability,
      };

      // Skip overwriting price fields only when both are empty.
      if (!(minEmpty && maxEmpty)) {
        patch.price_min = minEmpty ? null : Number(u.priceMinInput);
        patch.price_max = maxEmpty ? null : Number(u.priceMaxInput);
      }

      const res = await supabase
        .from('vendor_products')
        .update(patch)
        .eq('id', u.productId)
        .eq('storefront_id', storefrontId);

      if (res.error) throw res.error;
      return res;
    }),
  );

  return results;
}

export async function vendorSubmitNewProductForReview(params: {
  storefront: Storefront;
  productName: string;
  category: string;
  room: string | null;
  minPriceInput: string;
  maxPriceInput: string;
  description: string | null;
  file: File;
}): Promise<void> {
  const {
    storefront,
    productName,
    category,
    room,
    minPriceInput,
    maxPriceInput,
    description,
    file,
  } = params;

  const fileName = file.name || 'image';
  const extRaw = fileName.split('.').pop()?.toLowerCase() || '';
  const ext = extRaw.replace(/[^a-z0-9]/g, '');
  const timestamp = Date.now();
  const objectPath = `${storefront.id}/${timestamp}.${ext}`;

  // 1) Upload photo to pending-review bucket
  const { error: uploadError } = await supabase.storage.from('pending-review').upload(objectPath, file, {
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw uploadError;

  // 2) Generate a unique slug: {storefront-slug}-{kebab(product-name)}
  const baseSlug = `${storefront.slug}-${kebabCase(productName)}`;
  let finalSlug = baseSlug;

  const { data: existing } = await supabase
    .from('vendor_products')
    .select('id')
    .eq('slug', finalSlug)
    .maybeSingle();

  if (existing?.id) {
    finalSlug = `${baseSlug}-${timestamp}`;
  }

  // 3) Insert into vendor_products as pending
  const minPrice = Number(minPriceInput);
  const maxPrice = maxPriceInput.trim() === '' ? null : Number(maxPriceInput);

  const insertPayload: Record<string, any> = {
    storefront_id: storefront.id,
    name: productName.trim(),
    category: category.toLowerCase(),
    room,
    price_min: minPrice,
    price_max: maxPrice,
    currency: 'NGN',
    image_url: objectPath,
    status: 'pending',
    availability: 'in_stock',
    slug: finalSlug,
  };

  if (description && description.trim() !== '') {
    insertPayload.description = description.trim();
  }

  const { error: insertError } = await supabase.from('vendor_products').insert(insertPayload);
  if (insertError) throw insertError;
}

