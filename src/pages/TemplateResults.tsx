import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getTemplateById } from '@/lib/specs-templates';
import { buildRetailerQuery } from '@/lib/retailer-utils';

const RETAILERS = [
  { name: 'Wayfair', baseUrl: 'https://www.wayfair.com/keyword.php?keyword=' },
  { name: 'Amazon', baseUrl: 'https://www.amazon.com/s?k=' },
  { name: 'Walmart', baseUrl: 'https://www.walmart.com/search?q=' },
  { name: 'Temu', baseUrl: 'https://www.temu.com/search_result.html?search_key=' },
  { name: 'Shein', baseUrl: 'https://us.shein.com/search?q=' }
];

// Field labels by category
const FIELD_LABELS: Record<string, Record<string, string>> = {
  'sofa': {
    width: 'Max width',
    seating: 'Seating capacity',
    shape: 'Shape',
    orientation: 'Orientation',
    fabric: 'Fabric type',
    color: 'Color family'
  },
  'dining-table': {
    length: 'Max length',
    seating: 'Seating capacity',
    shape: 'Shape',
    material: 'Material',
    color: 'Color family'
  },
  'rug': {
    width: 'Max width',
    length: 'Max length',
    shape: 'Shape',
    material: 'Material',
    color: 'Color family'
  },
  'bed': {
    size: 'Bed size',
    height: 'Max height',
    style: 'Style',
    material: 'Material',
    color: 'Color family'
  },
  'desk': {
    width: 'Max width',
    depth: 'Max depth',
    style: 'Style',
    material: 'Material',
    color: 'Color family'
  }
};

// Units by field
const FIELD_UNITS: Record<string, string> = {
  width: 'inches',
  length: 'inches',
  depth: 'inches',
  height: 'inches',
  seating: 'people'
};

// Special formatting for rug dimensions (feet instead of inches)
const formatFieldValue = (fieldId: string, value: string | number, category: string): string => {
  if (category === 'rug' && (fieldId === 'width' || fieldId === 'length')) {
    return `${value} feet`;
  }
  
  const unit = FIELD_UNITS[fieldId];
  if (unit) {
    return `${value} ${unit}`;
  }
  
  // Capitalize first letter for text values
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

export default function TemplateResults() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(getTemplateById(templateId || ''));

  useEffect(() => {
    if (templateId) {
      const foundTemplate = getTemplateById(templateId);
      setTemplate(foundTemplate);
    }
  }, [templateId]);

  if (!template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-[#111111] mb-4">Template not found</h1>
            <Button onClick={() => navigate('/upload?tab=specs')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to categories
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Build search query using the same logic as Specs results
  const searchQuery = buildRetailerQuery({
    item_name: template.label,
    category: template.category,
    ...template.formData
  });

  const handleRetailerClick = (retailer: typeof RETAILERS[0]) => {
    const url = `${retailer.baseUrl}${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleGoogleSearch = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=shop`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBack = () => {
    navigate(`/specs/${template.category}`);
  };

  const fieldLabels = FIELD_LABELS[template.category] || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={handleBack}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to form
          </Button>

          <div className="bg-white rounded-3xl p-8 shadow-lg">
            {/* Template Image Preview */}
            <div className="mb-8">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 mb-4">
                <img
                  src={template.image}
                  alt={template.label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/800x500/e5e5e5/666666?text=${encodeURIComponent(template.label)}`;
                  }}
                />
              </div>
              <h1 className="text-3xl font-bold text-[#111111] mb-2">
                {template.label}
              </h1>
              <p className="text-[#555555]">
                {template.styleDetails.description}
              </p>
            </div>

            {/* Style Details - Using Form Fields */}
            <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
              <h2 className="text-xl font-semibold text-[#111111] mb-4">
                Style details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(template.formData).map(([fieldId, value]) => {
                  const label = fieldLabels[fieldId];
                  if (!label) return null;
                  
                  return (
                    <div key={fieldId}>
                      <p className="text-xs text-[#888888] mb-1">{label}</p>
                      <p className="text-sm font-medium text-[#111111]">
                        {formatFieldValue(fieldId, value, template.category)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Retailer Links */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#111111] mb-4">
                Shop this style
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {RETAILERS.map((retailer) => (
                  <Button
                    key={retailer.name}
                    onClick={() => handleRetailerClick(retailer)}
                    variant="outline"
                    className="h-auto py-3 px-4 justify-between hover:bg-gray-50"
                  >
                    <span className="font-medium">{retailer.name}</span>
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Google Search */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={handleGoogleSearch}
                className="w-full bg-[#111111] hover:bg-[#333333] text-white"
                size="lg"
              >
                Search on Google
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}