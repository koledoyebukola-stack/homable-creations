import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload as UploadIcon, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type TabType = 'design' | 'inspiration' | 'fits';

export default function Upload() {
  const [searchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<TabType>('design');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Set initial tab based on URL parameter
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'design') {
      setSelectedTab('design');
    } else if (mode === 'replicate') {
      setSelectedTab('inspiration');
    } else if (mode === 'find') {
      setSelectedTab('fits');
    }
  }, [searchParams]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    
    // Existing inspiration flow logic
    if (selectedTab === 'inspiration') {
      console.log('Processing inspiration image:', selectedFile);
      // Preserve existing inspiration flow
    }
    
    // Existing specs flow logic
    if (selectedTab === 'fits') {
      console.log('Processing specs image:', selectedFile);
      // Preserve existing specs flow
    }

    // Design flow (placeholder - will be implemented later)
    if (selectedTab === 'design') {
      console.log('Processing design image:', selectedFile);
      // Design flow will be implemented based on user's step-by-step instructions
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      <section className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-3">
              Upload Your Photo
            </h1>
            <p className="text-lg text-[#555555]">
              Choose how you want to get started
            </p>
          </div>

          {/* Tab Selector - Same design as homepage */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white rounded-full p-1 shadow-md border border-gray-200">
              <button
                onClick={() => setSelectedTab('design')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                  selectedTab === 'design'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Design my space
              </button>
              <button
                onClick={() => setSelectedTab('inspiration')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                  selectedTab === 'inspiration'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Start with inspiration
              </button>
              <button
                onClick={() => setSelectedTab('fits')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
                  selectedTab === 'fits'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Start with what fits
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <Card className="p-8 md:p-12 bg-white shadow-lg">
            {/* Design My Space Tab */}
            {selectedTab === 'design' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Sparkles className="w-12 h-12 mx-auto text-[#111111]" />
                  <h2 className="text-2xl font-bold text-[#111111]">
                    Design Your Space
                  </h2>
                  <p className="text-[#555555]">
                    Upload a photo of your empty room and we'll help you design it
                  </p>
                </div>

                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-[#111111] transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="design-file-upload"
                  />
                  <label htmlFor="design-file-upload" className="cursor-pointer">
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-[#555555]">
                          Click or drag to replace image
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <UploadIcon className="w-16 h-16 mx-auto text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-[#111111]">
                            Drop your room photo here
                          </p>
                          <p className="text-sm text-[#555555]">
                            or click to browse
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {selectedFile && (
                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full"
                  >
                    Continue
                  </Button>
                )}
              </div>
            )}

            {/* Start with Inspiration Tab - Preserve existing flow */}
            {selectedTab === 'inspiration' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-[#111111]" />
                  <h2 className="text-2xl font-bold text-[#111111]">
                    Upload Your Inspiration
                  </h2>
                  <p className="text-[#555555]">
                    Share a photo you love and we'll identify all the decor items
                  </p>
                </div>

                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-[#111111] transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="inspiration-file-upload"
                  />
                  <label htmlFor="inspiration-file-upload" className="cursor-pointer">
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-[#555555]">
                          Click or drag to replace image
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <UploadIcon className="w-16 h-16 mx-auto text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-[#111111]">
                            Drop your inspiration photo here
                          </p>
                          <p className="text-sm text-[#555555]">
                            or click to browse
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {selectedFile && (
                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full"
                  >
                    Analyze Inspiration
                  </Button>
                )}
              </div>
            )}

            {/* Start with What Fits Tab - Preserve existing flow */}
            {selectedTab === 'fits' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Sparkles className="w-12 h-12 mx-auto text-[#111111]" />
                  <h2 className="text-2xl font-bold text-[#111111]">
                    Find What Fits
                  </h2>
                  <p className="text-[#555555]">
                    Upload your space and tell us what you're looking for
                  </p>
                </div>

                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-[#111111] transition-colors cursor-pointer"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="fits-file-upload"
                  />
                  <label htmlFor="fits-file-upload" className="cursor-pointer">
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-[#555555]">
                          Click or drag to replace image
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <UploadIcon className="w-16 h-16 mx-auto text-gray-400" />
                        <div>
                          <p className="text-lg font-medium text-[#111111]">
                            Drop your room photo here
                          </p>
                          <p className="text-sm text-[#555555]">
                            or click to browse
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {selectedFile && (
                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    className="w-full bg-[#111111] hover:bg-[#333333] text-white rounded-full"
                  >
                    Find Items
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Tips Section */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[#777777]">
              💡 Tip: For best results, use clear, well-lit photos
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}