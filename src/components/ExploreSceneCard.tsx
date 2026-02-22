import type { ExploreScene } from '@/lib/types';

function formatViewCount(count: number): string {
  if (count < 1000) return count === 1 ? '1 view' : `${count} views`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k views`;
  return `${Math.round(count / 1000)}k views`;
}

interface ExploreSceneCardProps {
  scene: ExploreScene;
  onSelect: (slug: string) => void;
  /** Total view count for this scene (from explore_scenes.view_count) */
  viewCount?: number;
  /** True when this scene has the highest view count in the list (shows "Trending") */
  isTrending?: boolean;
}

export default function ExploreSceneCard({ scene, onSelect, viewCount = 0, isTrending = false }: ExploreSceneCardProps) {
  const catalogBudget = Number(scene.catalog_budget_ngn) || 0;
  const minimumItemPrice = Number(scene.minimum_item_price_ngn) || 0;
  const showBadgeOrViews = catalogBudget > 0 || viewCount > 0;
  const viewText = formatViewCount(viewCount);
  const viewLabel = isTrending ? `🔥 Trending: ${viewText}` : `👁️ ${viewText}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(scene.slug)}
      className="text-left rounded-xl overflow-hidden bg-white border border-[#e5e5e5] hover:border-[#ccc] hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#111] focus:ring-offset-2 w-full"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={scene.hero_image_url || 'https://placehold.co/600x450/f5f5f5/999?text=Room'}
          alt={scene.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl md:text-2xl font-bold text-[#111111] mb-2 line-clamp-2">{scene.title}</h3>
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
        {showBadgeOrViews && (
          <div className="flex items-center justify-between mt-3">
            {catalogBudget > 0 ? (
              <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                Available on Homable
              </span>
            ) : (
              <span />
            )}
            {viewCount > 0 && (
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
