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

  // Build search query based on template details
  const searchQuery = buildRetailerQuery({
    item_name: template.label,
    category: template.category,
    shape: template.styleDetails.shape,
    material: template.styleDetails.material,
    color: template.styleDetails.color,
    style: template.styleDetails.style
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

            {/* Style Details */}
            <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
              <h2 className="text-xl font-semibold text-[#111111] mb-4">
                Style details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {template.styleDetails.style && (
                  <div>
                    <p className="text-xs text-[#888888] mb-1">Style</p>
                    <p className="text-sm font-medium text-[#111111]">{template.styleDetails.style}</p>
                  </div>
                )}
                {template.styleDetails.shape && (
                  <div>
                    <p className="text-xs text-[#888888] mb-1">Shape</p>
                    <p className="text-sm font-medium text-[#111111]">{template.styleDetails.shape}</p>
                  </div>
                )}
                {template.styleDetails.material && (
                  <div>
                    <p className="text-xs text-[#888888] mb-1">Material look</p>
                    <p className="text-sm font-medium text-[#111111]">{template.styleDetails.material}</p>
                  </div>
                )}
                {template.styleDetails.color && (
                  <div>
                    <p className="text-xs text-[#888888] mb-1">Color family</p>
                    <p className="text-sm font-medium text-[#111111]">{template.styleDetails.color}</p>
                  </div>
                )}
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