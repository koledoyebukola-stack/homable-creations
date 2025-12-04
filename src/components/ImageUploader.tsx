import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  previewUrl?: string;
  onClear?: () => void;
}

export default function ImageUploader({
  onImageSelect,
  previewUrl,
  onClear,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  if (previewUrl) {
    return (
      <div className="relative w-full max-w-2xl mx-auto">
        <img
          src={previewUrl}
          alt="Preview"
          className="w-full h-auto rounded-lg shadow-lg"
          title=""
        />
        {onClear && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full max-w-2xl mx-auto border-2 border-dashed rounded-lg p-12 transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="p-4 rounded-full bg-blue-100">
          <Upload className="h-8 w-8 text-blue-600" />
        </div>
        <p className="text-lg font-medium text-gray-900">
          Click to upload your inspiration photo
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title=""
        />
      </div>
    </div>
  );
}