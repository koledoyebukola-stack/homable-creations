import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, ArrowLeft } from 'lucide-react';
import { getAllStorefronts } from '@/lib/api';
import type { Storefront } from '@/lib/types';

function getVendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  const initials = (first + second).toUpperCase();
  return initials || 'V';
}

function getVendorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 40%)`;
}

function vendorTypeLabel(sf: Storefront): string {
  if (sf.vendor_type === 'carpenter') return 'Carpenter';
  return 'Decor & styling';
}

function offeringBadgeLabel(sf: Storefront): string {
  if (sf.offering_type === 'imported') return 'Imported';
  if (sf.offering_type === 'both') return 'Custom & imported';
  return 'Custom order';
}

export default function VendorsDirectory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storefronts, setStorefronts] = useState<Storefront[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllStorefronts().then((rows) => {
      if (!cancelled) setStorefronts(rows);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    return [...storefronts].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [storefronts]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-stone-50">
      <main className="flex-1 flex flex-col">
        <section className="border-b border-gray-100 bg-white">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 md:py-10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-gray-600 hover:text-gray-900 rounded-full"
              onClick={() => navigate('/shops')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Shops
            </Button>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Homable vendors</h1>
                <p className="mt-2 text-sm md:text-base text-gray-600 max-w-2xl">
                  Verified storefronts on Homable, including shops that are live now and ones that are paused.
                </p>
              </div>
              <p className="text-xs text-gray-500 md:text-right">
                {loading ? 'Loading…' : `${sorted.length} vendor${sorted.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </section>

        <section className="flex-1 py-10 md:py-14">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="rounded-2xl bg-gray-200 animate-pulse aspect-[3/4]" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border border-[#e5e5e5] bg-white max-w-lg mx-auto">
                <Store className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">No vendors yet</p>
                <p className="text-sm text-gray-500 mt-1">Check back later.</p>
                <Button className="mt-6 rounded-full" onClick={() => navigate('/shops')}>
                  Go to Shops
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {sorted.map((sf, index) => {
                  const isAboveFold = index < 8;
                  const heroImage = sf.banner_url || sf.logo_url;
                  return (
                    <article
                      key={sf.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/stores/${sf.slug}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/stores/${sf.slug}`);
                        }
                      }}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left cursor-pointer flex flex-col"
                    >
                      <div className="aspect-[3/4] w-full bg-gray-100 relative overflow-hidden rounded-2xl flex-shrink-0">
                        {heroImage ? (
                          <img
                            src={heroImage}
                            alt={sf.banner_url ? `${sf.name} banner` : `${sf.name} logo`}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                            loading={isAboveFold ? 'eager' : 'lazy'}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-white text-3xl font-bold"
                            style={{ backgroundColor: getVendorColor(sf.name) }}
                          >
                            {getVendorInitials(sf.name)}
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-gray-900 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-1 rounded-full">
                            {offeringBadgeLabel(sf)}
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge
                            className={
                              sf.status === 'active'
                                ? 'bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-0.5 rounded-full'
                                : 'bg-gray-700 hover:bg-gray-700 text-white text-[10px] font-medium border-0 shadow-sm px-2 py-0.5 rounded-full'
                            }
                          >
                            {sf.status === 'active' ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                      </div>
                      <div className="px-2.5 pt-2.5 pb-3 md:px-3 md:pt-3">
                        <h2 className="text-[13px] md:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                          {sf.name}
                        </h2>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                          {sf.location_display ||
                            (sf.location === 'NG'
                              ? 'Nigeria'
                              : sf.location === 'CA'
                                ? 'Canada'
                                : sf.location) ||
                            'Homable vendor'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{vendorTypeLabel(sf)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
