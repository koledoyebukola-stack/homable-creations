import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Check } from 'lucide-react';
import { toast } from 'sonner';

// Room templates
const ROOM_TEMPLATES = [
  {
    id: 'living-room',
    name: 'Empty Living Room',
    image: '/images/photo1767219329.jpg',
    description: 'Start with a blank living room space'
  },
  {
    id: 'bedroom',
    name: 'Empty Bedroom',
    image: '/images/photo1767219329.jpg',
    description: 'Start with a blank bedroom space'
  },
  {
    id: 'dining-room',
    name: 'Empty Dining Room',
    image: '/images/photo1767219329.jpg',
    description: 'Start with a blank dining room space'
  },
  {
    id: 'home-office',
    name: 'Empty Home Office',
    image: '/images/HomeOffice.jpg',
    description: 'Start with a blank home office space'
  }
];

export default function DesignSpace() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [unknownDimensions, setUnknownDimensions] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setUploadedFiles([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files).slice(0, 3);
      setUploadedFiles(fileArray);
      setSelectedTemplate(null);
    }
  };

  const handleContinue = () => {
    if (!selectedTemplate && uploadedFiles.length === 0) {
      toast.error('Please select a template or upload room photos');
      return;
    }

    // Navigate to space analysis page
    const params = new URLSearchParams();
    if (selectedTemplate) {
      params.set('template', selectedTemplate);
    }
    if (unknownDimensions) {
      params.set('unknown_dimensions', 'true');
    }
    
    navigate(`/design-space/analyze?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">
              Design Your Space
            </h1>
            <p className="text-lg text-[#555555]">
              Start with a template or upload photos of your room
            </p>
          </div>

          {/* Room Templates */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-[#111111]">
              Start with a Template
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ROOM_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    selectedTemplate === template.id
                      ? 'ring-2 ring-[#111111]'
                      : ''
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                    <img
                      src={template.image}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedTemplate === template.id && (
                      <div className="absolute top-2 right-2 bg-[#111111] text-white rounded-full p-1">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#111111] mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-[#555555]">
                      {template.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-4 mb-12">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-[#555555] font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-3xl p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-bold mb-6 text-[#111111]">
              Upload Your Room Photos
            </h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-[#111111] transition-colors">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="room-upload"
              />
              <label htmlFor="room-upload" className="cursor-pointer">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-[#111111] mb-2">
                  Upload 1-3 photos or a short video
                </p>
                <p className="text-sm text-[#555555]">
                  Click to browse or drag and drop
                </p>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-[#555555] mb-3">
                  {uploadedFiles.length} file(s) selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 bg-gray-100 rounded-full text-sm text-[#111111]"
                    >
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unknown Dimensions Checkbox */}
            <div className="mt-6 flex items-start gap-3">
              <input
                type="checkbox"
                id="unknown-dimensions"
                checked={unknownDimensions}
                onChange={(e) => setUnknownDimensions(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300"
              />
              <label
                htmlFor="unknown-dimensions"
                className="text-sm text-[#555555] cursor-pointer"
              >
                I don't know the room dimensions
              </label>
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleContinue}
              size="lg"
              disabled={!selectedTemplate && uploadedFiles.length === 0}
              className="bg-[#111111] hover:bg-[#333333] text-white px-12 py-6 text-lg rounded-full"
            >
              Continue to Design Options
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}