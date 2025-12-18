import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import SpecsTemplateSection from '@/components/SpecsTemplateSection';
import { getTemplatesForCategory } from '@/lib/specs-templates';

interface FormField {
  id: string;
  label: string;
  type: 'number' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[];
  unit?: string;
  helperText?: string;
  min?: number;
  max?: number;
}

interface CategoryConfig {
  title: string;
  fields: FormField[];
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  'sofa': {
    title: 'Sofa / Sectional',
    fields: [
      { 
        id: 'width', 
        label: 'Max width', 
        type: 'number', 
        required: true, 
        unit: 'inches',
        helperText: 'This helps us avoid options that won\'t fit.',
        min: 30,
        max: 200
      },
      { 
        id: 'seating', 
        label: 'Seating capacity', 
        type: 'number', 
        required: true,
        helperText: 'Ensures you get the right size for your space.',
        min: 1,
        max: 12
      },
      { id: 'shape', label: 'Shape', type: 'select', options: ['Sofa', 'Sectional', 'Chaise', 'U-shaped', 'Modular'] },
      { id: 'orientation', label: 'Orientation', type: 'select', options: ['Left', 'Right', 'Reversible'] },
      { id: 'fabric', label: 'Fabric type', type: 'select', options: ['Corduroy', 'Leather', 'Velvet', 'Linen', 'Microfiber', 'Cotton'] },
      { id: 'color', label: 'Color family', type: 'select', options: ['Brown', 'Beige', 'Gray', 'Black', 'White', 'Blue', 'Green'] },
      { id: 'easy_returns', label: 'Easy returns', type: 'checkbox' },
      { id: 'lowest_price', label: 'Lowest price', type: 'checkbox' }
    ]
  },
  'dining-table': {
    title: 'Dining Table',
    fields: [
      { 
        id: 'length', 
        label: 'Max length', 
        type: 'number', 
        required: true, 
        unit: 'inches',
        helperText: 'This helps us avoid options that won\'t fit.',
        min: 24,
        max: 144
      },
      { 
        id: 'seating', 
        label: 'Seating capacity', 
        type: 'number', 
        required: true,
        helperText: 'Ensures you get the right size for your space.',
        min: 2,
        max: 16
      },
      { id: 'shape', label: 'Shape', type: 'select', options: ['Rectangular', 'Round', 'Square', 'Oval'] },
      { id: 'material', label: 'Material', type: 'select', options: ['Wood', 'Glass', 'Marble', 'Metal'] },
      { id: 'color', label: 'Color family', type: 'select', options: ['Brown', 'Black', 'White', 'Natural wood', 'Gray'] },
      { id: 'easy_returns', label: 'Easy returns', type: 'checkbox' },
      { id: 'lowest_price', label: 'Lowest price', type: 'checkbox' }
    ]
  },
  'rug': {
    title: 'Rug',
    fields: [
      { 
        id: 'width', 
        label: 'Max width', 
        type: 'number', 
        required: true, 
        unit: 'feet',
        helperText: 'This helps us avoid options that won\'t fit.',
        min: 2,
        max: 20
      },
      { 
        id: 'length', 
        label: 'Max length', 
        type: 'number', 
        required: true, 
        unit: 'feet',
        helperText: 'Ensures you get the right size for your space.',
        min: 2,
        max: 30
      },
      { id: 'shape', label: 'Shape', type: 'select', options: ['Rectangular', 'Round', 'Square', 'Runner'] },
      { id: 'material', label: 'Material', type: 'select', options: ['Wool', 'Cotton', 'Jute', 'Synthetic', 'Silk'] },
      { id: 'color', label: 'Color family', type: 'select', options: ['Beige', 'Gray', 'Blue', 'Red', 'Multi-color', 'Black', 'White'] },
      { id: 'easy_returns', label: 'Easy returns', type: 'checkbox' },
      { id: 'lowest_price', label: 'Lowest price', type: 'checkbox' }
    ]
  },
  'bed': {
    title: 'Bed Frame',
    fields: [
      { 
        id: 'size', 
        label: 'Bed size', 
        type: 'select', 
        required: true, 
        options: ['Twin', 'Full', 'Queen', 'King', 'California King'],
        helperText: 'Ensures you get the right size for your space.'
      },
      { 
        id: 'height', 
        label: 'Max height', 
        type: 'number', 
        required: true, 
        unit: 'inches',
        helperText: 'This helps us avoid options that won\'t fit.',
        min: 10,
        max: 96
      },
      { id: 'style', label: 'Style', type: 'select', options: ['Platform', 'Panel', 'Canopy', 'Sleigh', 'Storage'] },
      { id: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Upholstered', 'Leather'] },
      { id: 'color', label: 'Color family', type: 'select', options: ['Brown', 'Black', 'White', 'Gray', 'Natural wood'] },
      { id: 'easy_returns', label: 'Easy returns', type: 'checkbox' },
      { id: 'lowest_price', label: 'Lowest price', type: 'checkbox' }
    ]
  },
  'desk': {
    title: 'Desk',
    fields: [
      { 
        id: 'width', 
        label: 'Max width', 
        type: 'number', 
        required: true, 
        unit: 'inches',
        helperText: 'This helps us avoid options that won\'t fit.',
        min: 20,
        max: 96
      },
      { 
        id: 'depth', 
        label: 'Max depth', 
        type: 'number', 
        required: true, 
        unit: 'inches',
        helperText: 'Ensures you get the right size for your space.',
        min: 16,
        max: 48
      },
      { id: 'style', label: 'Style', type: 'select', options: ['Writing desk', 'Computer desk', 'L-shaped', 'Standing desk', 'Secretary'] },
      { id: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Glass', 'Laminate'] },
      { id: 'color', label: 'Color family', type: 'select', options: ['Brown', 'Black', 'White', 'Natural wood', 'Gray'] },
      { id: 'easy_returns', label: 'Easy returns', type: 'checkbox' },
      { id: 'lowest_price', label: 'Lowest price', type: 'checkbox' }
    ]
  }
};

export default function SpecsForm() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const config = categoryId ? CATEGORY_CONFIGS[categoryId] : null;
  const templates = categoryId ? getTemplatesForCategory(categoryId) : [];

  // Load existing data if editing
  useEffect(() => {
    const isEdit = searchParams.get('edit') === 'true';
    const dataStr = searchParams.get('data');
    
    if (isEdit && dataStr) {
      try {
        const existingData = JSON.parse(decodeURIComponent(dataStr));
        setFormData(existingData);
      } catch (error) {
        console.error('Failed to parse existing data:', error);
      }
    }
  }, [searchParams]);

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-[#111111] mb-4">Category not found</h1>
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

  const validateField = (field: FormField, value: string | boolean): string | null => {
    if (field.type === 'number' && field.required && typeof value === 'string') {
      const numValue = parseFloat(value);
      
      if (isNaN(numValue)) {
        return `Please enter a valid number`;
      }
      
      if (field.min !== undefined && numValue < field.min) {
        return `Must be at least ${field.min}`;
      }
      
      if (field.max !== undefined && numValue > field.max) {
        return `Must be at most ${field.max}`;
      }
    }
    
    return null;
  };

  const handleInputChange = (fieldId: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
    
    // Validate on change for number fields
    const field = config.fields.find(f => f.id === fieldId);
    if (field && field.type === 'number' && field.required) {
      const error = validateField(field, value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [fieldId]: error }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    const requiredFields = config.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData[f.id]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }
    
    // Validate ranges for number fields
    const errors: Record<string, string> = {};
    config.fields.forEach(field => {
      if (field.required && formData[field.id]) {
        const error = validateField(field, formData[field.id]);
        if (error) {
          errors[field.id] = error;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Check authentication before showing results
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Store the intended navigation
      const queryParams = new URLSearchParams();
      queryParams.set('category', categoryId || '');
      queryParams.set('data', JSON.stringify(formData));
      setPendingNavigation(`/specs-results?${queryParams.toString()}`);
      
      // Show auth modal
      setShowAuthModal(true);
      return;
    }

    // User is authenticated, navigate to results
    const queryParams = new URLSearchParams();
    queryParams.set('category', categoryId || '');
    queryParams.set('data', JSON.stringify(formData));
    navigate(`/specs-results?${queryParams.toString()}`);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleBackToCategories = () => {
    navigate('/upload?tab=specs');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleBackToCategories}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to categories
          </Button>

          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#111111] mb-2">
                {config.title}
              </h1>
              <p className="text-sm text-[#555555]">
                Fill in the details to find options that match your needs
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {config.fields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id} className="text-sm font-medium text-[#111111] mb-2 block">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>

                  {field.type === 'number' && (
                    <>
                      <div className="flex gap-2">
                        <Input
                          id={field.id}
                          type="number"
                          value={formData[field.id] as string || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          required={field.required}
                          min={field.min}
                          max={field.max}
                          className={`flex-1 ${validationErrors[field.id] ? 'border-red-500' : ''}`}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                        {field.unit && (
                          <span className="flex items-center px-3 text-sm text-[#555555] bg-gray-50 rounded-md border">
                            {field.unit}
                          </span>
                        )}
                      </div>
                      {validationErrors[field.id] && (
                        <p className="text-xs text-red-500 mt-1.5">
                          {validationErrors[field.id]}
                        </p>
                      )}
                      {!validationErrors[field.id] && field.helperText && (
                        <p className="text-xs text-[#888888] mt-1.5">
                          {field.helperText}
                        </p>
                      )}
                    </>
                  )}

                  {field.type === 'select' && (
                    <>
                      <Select
                        value={formData[field.id] as string || ''}
                        onValueChange={(value) => handleInputChange(field.id, value)}
                      >
                        <SelectTrigger id={field.id}>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option} value={option.toLowerCase()}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.helperText && (
                        <p className="text-xs text-[#888888] mt-1.5">
                          {field.helperText}
                        </p>
                      )}
                    </>
                  )}

                  {field.type === 'checkbox' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={formData[field.id] as boolean || false}
                        onCheckedChange={(checked) => handleInputChange(field.id, checked as boolean)}
                      />
                      <label
                        htmlFor={field.id}
                        className="text-sm text-[#555555] cursor-pointer"
                      >
                        Prioritize {field.label.toLowerCase()}
                      </label>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#111111] hover:bg-[#333333] text-white text-lg py-6 rounded-full"
                >
                  Show Options
                </Button>
              </div>
            </form>

            {/* Template Section */}
            <SpecsTemplateSection templates={templates} categoryId={categoryId || ''} />
          </div>
        </div>
      </main>

      <Footer />

      {showAuthModal && (
        <AuthModal onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}