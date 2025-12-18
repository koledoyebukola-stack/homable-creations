import { useNavigate } from 'react-router-dom';
import { SpecsTemplate } from '@/lib/specs-templates';

interface SpecsTemplateSectionProps {
  templates: SpecsTemplate[];
  categoryId: string;
}

export default function SpecsTemplateSection({ templates, categoryId }: SpecsTemplateSectionProps) {
  const navigate = useNavigate();

  const handleTemplateClick = (template: SpecsTemplate) => {
    navigate(`/template-results/${template.id}`);
  };

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-[#111111] mb-2">
          Don't have dimensions?
        </h2>
        <p className="text-sm text-[#555555]">
          Start with a popular style instead.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleTemplateClick(template)}
            className="group relative bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-[#111111] transition-all duration-200 hover:shadow-lg"
          >
            <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
              <img
                src={template.image}
                alt={template.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // Fallback to a placeholder if image fails to load
                  e.currentTarget.src = `https://placehold.co/400x300/e5e5e5/666666?text=${encodeURIComponent(template.label)}`;
                }}
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-[#111111] text-left line-clamp-2">
                {template.label}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}