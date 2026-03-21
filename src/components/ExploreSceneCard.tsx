import type { ExploreScene } from '@/lib/types';

/** Human-readable room_type badge for NG explore cards (matches filter pill wording where applicable). */
function getNgRoomTypeBadgeLabel(
  roomType: string | null | undefined,
  isTvWall: boolean,
): string | null {
  if (isTvWall || roomType === 'tv_wall') return 'TV Wall';
  switch (roomType) {
    case 'wall_styling':
      return 'Wall idea';
    case 'living_room':
      return 'Living Room';
    case 'bedroom':
      return 'Bedroom';
    case 'dining':
      return 'Dining';
    case 'office':
      return 'Home Office';
    default:
      if (!roomType) return null;
      return roomType
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
  }
}

function formatViewCount(count: number): string {
  if (count < 1000) return count === 1 ? '1 view' : `${count} views`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k views`;
  return `${Math.round(count / 1000)}k views`;
}

interface ExploreSceneCardProps {
  scene: Pick<ExploreScene, 'id' | 'slug' | 'title' | 'hero_image_url'> & Partial<ExploreScene>;
  onSelect: (slug: string) => void;
  /** Total view count for this scene (from explore_scenes.view_count) */
  viewCount?: number;
  /** True when this scene has the highest view count in the list (shows "Trending") */
  isTrending?: boolean;
  /** TV Wall variant: image + title + "TV Wall" badge only */
  variant?: 'default' | 'tv-wall';
  /** NG: first 3 featured in list — Top Pick pill on image, view count hidden */
  showTopPick?: boolean;
}

export default function ExploreSceneCard({
  scene,
  onSelect,
  viewCount = 0,
  isTrending = false,
  variant = 'default',
  showTopPick = false,
}: ExploreSceneCardProps) {
  const isTvWall = variant === 'tv-wall' || scene.room_type === 'tv_wall';
  const catalogBudget = Number(scene.catalog_budget_ngn) || 0;
  const minimumItemPrice = Number(scene.minimum_item_price_ngn) || 0;
  const catalogProductCount = Number(scene.catalog_product_count) || 0;
  const showBadgeOrViews =
    !isTvWall && (catalogProductCount > 0 || (!showTopPick && viewCount > 0));
  const viewText = formatViewCount(viewCount);
  const viewLabel = isTrending ? `🔥 Trending: ${viewText}` : viewText;
  const isNigeriaScene = scene.location === 'NG';
  const roomTypeBadgeLabel =
    isNigeriaScene ? getNgRoomTypeBadgeLabel(scene.room_type, isTvWall) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(scene.slug)}
      className="text-left rounded-xl overflow-hidden bg-white border border-[#e5e5e5] hover:border-[#ccc] hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#111] focus:ring-offset-2 w-full"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {showTopPick && (
          <span
            className="absolute left-[10px] top-[10px] z-10 rounded-full bg-black px-[10px] py-1 text-[11px] leading-none text-white"
            aria-label="Top Pick"
          >
            ⭐ Top Pick
          </span>
        )}
        <img
          src={scene.hero_image_url || 'https://placehold.co/600x450/f5f5f5/999?text=Room'}
          alt={scene.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        {roomTypeBadgeLabel && (
          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium px-2 py-0.5 mb-1">
            {roomTypeBadgeLabel}
          </span>
        )}
        <h3 className="text-xl md:text-2xl font-bold text-[#111111] mb-2 line-clamp-2">{scene.title}</h3>
        {isTvWall ? (
          <>
            <p className="text-base font-semibold text-[#111111] mb-1">
              Custom build
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Contact a carpenter for pricing
            </p>
          </>
        ) : (
          <>
            {minimumItemPrice > 0 && (
              <p className="text-base font-semibold text-[#111111] mb-1">
                Items from ₦{minimumItemPrice.toLocaleString('en-NG')}
              </p>
            )}
            {catalogBudget > 0 && (
              <p className="text-sm text-gray-500 mb-2">
                Complete room from ₦{catalogBudget.toLocaleString('en-NG')}
              </p>
            )}
          </>
        )}
        {showBadgeOrViews && (
          <div className="flex items-center justify-between mt-3">
            {catalogProductCount > 0 ? (
              <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                {catalogProductCount} pieces to shop
              </span>
            ) : (
              <span />
            )}
            {!showTopPick && viewCount > 0 && (
              <span className="text-xs text-gray-500 font-medium">
                {viewLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
