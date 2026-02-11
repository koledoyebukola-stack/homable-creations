import type { ExploreScene } from '@/lib/types';

interface ExploreSceneCardProps {
  scene: ExploreScene;
  onSelect: (slug: string) => void;
}

export default function ExploreSceneCard({ scene, onSelect }: ExploreSceneCardProps) {
  const catalogBudget = Number(scene.catalog_budget_ngn) || 0;

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
        <h3 className="font-semibold text-[#111111] mb-2 line-clamp-2">{scene.title}</h3>
        <p className="text-sm text-[#555555] mb-2">
          From ₦{catalogBudget.toLocaleString('en-NG')}
        </p>
        {catalogBudget > 0 && (
          <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
            Available on Homable
          </span>
        )}
      </div>
    </button>
  );
}
