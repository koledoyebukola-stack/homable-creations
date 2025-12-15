import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Sofa, Utensils, SquareDashedBottom, Bed, Laptop } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'sofa',
    label: 'Sofa / Sectional',
    icon: Sofa,
    description: 'Living room seating'
  },
  {
    id: 'dining-table',
    label: 'Dining Table',
    icon: Utensils,
    description: 'Dining room furniture'
  },
  {
    id: 'rug',
    label: 'Rug',
    icon: SquareDashedBottom,
    description: 'Floor coverings'
  },
  {
    id: 'bed',
    label: 'Bed Frame',
    icon: Bed,
    description: 'Bedroom furniture'
  },
  {
    id: 'desk',
    label: 'Desk',
    icon: Laptop,
    description: 'Workspace furniture'
  }
];

export default function SpecsCategorySelection() {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/specs/${categoryId}`);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#111111] mb-2">
          What are you trying to design for?
        </h2>
        <p className="text-sm text-[#555555]">
          Select a category to get started
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-gray-200 hover:border-[#111111]"
              onClick={() => handleCategoryClick(category.id)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon className="h-6 w-6 text-[#111111]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#111111] mb-1">
                    {category.label}
                  </h3>
                  <p className="text-sm text-[#555555]">
                    {category.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}