// Design Space API and utility functions
import { analyzeRoomWithVision, analyzeRoomTemplate, inferSizeClass, calculateUsableArea, ExistingFurniture } from './designSpaceApi';

export interface RoomAnalysis {
  roomType: string;
  walls: number;
  doors: number;
  windows: number;
  sizeClass: 'small' | 'medium' | 'large';
  usableArea: string;
  confidence: 'high' | 'medium' | 'low';
  blockedZones: string[];
  walkableZones: string[];
  existingFurniture?: ExistingFurniture[];
  sourceImageUrl?: string;
  detectedColors?: string[]; // Original room color palette
}

export type DesignStyle = 
  | 'Organic Modern'
  | 'Mid-Century Modern'
  | 'Scandinavian'
  | 'Japandi'
  | 'Traditional'
  | 'Industrial'
  | 'Bohemian'
  | 'Quiet Luxury'
  | 'Transitional'
  | 'Coastal Modern'
  | 'Maximalist'
  | 'Modern Farmhouse';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  description: string;
}

export interface StyleDirection {
  id: string;
  style: DesignStyle;
  name: string;
  description: string;
  imageUrl: string;
  investmentLevel: 'low' | 'medium' | 'high';
}

// NEW: Style Inspiration (Step C1)
export interface StyleInspiration {
  id: string;
  imageUrl: string;
  description: string;
  mood: string;
}

export interface DesignOption {
  id: string;
  style: DesignStyle;
  name: string;
  description: string;
  furnitureCount: number;
  layoutLogic: string;
  items: DesignItem[];
  estimatedCostMin: number;
  estimatedCostMax: number;
  estimatedCost: number; // Computed average for display
  imageUrl: string;
  colorPalettes: ColorPalette[];
  selectedPaletteId: string;
  density?: string; // Optional density field
  sizeRange?: string; // Optional size range field
}

export interface DesignItem {
  id: string;
  name: string;
  category: string;
  role: string;
  dimensions: string;
  materials: string[];
  finishes: string[];
  placementIntent: string;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  estimatedPrice: number; // Computed average for display
  styleNotes: string;
  sizeRange?: string; // Optional size range field
}

interface StyleDirectionResponse {
  style: string;
  description: string;
  investmentLevel: 'low' | 'medium' | 'high';
  imageUrl: string;
}

interface StyleInspirationResponse {
  imageUrl: string;
  description: string;
  mood: string;
}

interface DesignItemResponse {
  id: string;
  name: string;
  category: string;
  role: string;
  dimensions: string;
  materials: string[];
  finishes: string[];
  placementIntent: string;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  styleNotes: string;
}

// Template ID to image URL mapping
const TEMPLATE_IMAGES: Record<string, string> = {
  'living-room': 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/d0d966e8-188f-4d04-a96d-426b17fd2c45.png',
  'bedroom': 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/440cd2b1-4463-4154-adc6-9b80782a0131.png',
  'dining-room': 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/9a416eec-cc75-47d0-bfa6-80faeb568e7d.png',
  'home-office': 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2026-01-02/f97aac24-fdc2-41b1-90f8-96913fe0c3bf.png'
};

export async function analyzeRoom(
  template?: string,
  files?: File[],
  unknownDimensions?: boolean,
  uploadedImageUrl?: string
): Promise<RoomAnalysis> {
  try {
    // UNIFIED PIPELINE: Both templates and uploads use Vision API
    if (template) {
      // Templates now call Vision API instead of using static data
      const visionResult = await analyzeRoomTemplate(template);
      const sizeClass = inferSizeClass(visionResult);
      const usableArea = calculateUsableArea(visionResult);
      const templateImageUrl = TEMPLATE_IMAGES[template] || TEMPLATE_IMAGES['living-room'];

      return {
        roomType: visionResult.roomType,
        walls: visionResult.walls,
        doors: visionResult.doors,
        windows: visionResult.windows,
        sizeClass,
        usableArea,
        confidence: visionResult.confidence,
        blockedZones: visionResult.blockedZones,
        walkableZones: visionResult.walkableZones,
        existingFurniture: visionResult.existingFurniture,
        sourceImageUrl: templateImageUrl,
        detectedColors: visionResult.detectedColors || ['#F5F5F0', '#8B7355', '#2C2C2C']
      };
    }

    // If uploaded image URL is provided, analyze with Vision API
    if (uploadedImageUrl) {
      const visionResult = await analyzeRoomWithVision(uploadedImageUrl, unknownDimensions);
      const sizeClass = inferSizeClass(visionResult);
      const usableArea = calculateUsableArea(visionResult);

      return {
        roomType: visionResult.roomType,
        walls: visionResult.walls,
        doors: visionResult.doors,
        windows: visionResult.windows,
        sizeClass,
        usableArea,
        confidence: visionResult.confidence,
        blockedZones: visionResult.blockedZones,
        walkableZones: visionResult.walkableZones,
        existingFurniture: visionResult.existingFurniture,
        sourceImageUrl: uploadedImageUrl,
        detectedColors: visionResult.detectedColors || ['#F5F5F0', '#8B7355', '#2C2C2C']
      };
    }

    // Legacy: If files are provided, upload to Supabase and analyze with Vision API
    if (files && files.length > 0) {
      const file = files[0];
      const { supabase } = await import('./supabase');
      const fileName = `room-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('room-images')
        .getPublicUrl(fileName);

      const visionResult = await analyzeRoomWithVision(publicUrl, unknownDimensions);
      const sizeClass = inferSizeClass(visionResult);
      const usableArea = calculateUsableArea(visionResult);

      return {
        roomType: visionResult.roomType,
        walls: visionResult.walls,
        doors: visionResult.doors,
        windows: visionResult.windows,
        sizeClass,
        usableArea,
        confidence: visionResult.confidence,
        blockedZones: visionResult.blockedZones,
        walkableZones: visionResult.walkableZones,
        existingFurniture: visionResult.existingFurniture,
        sourceImageUrl: publicUrl,
        detectedColors: visionResult.detectedColors || ['#F5F5F0', '#8B7355', '#2C2C2C']
      };
    }

    throw new Error('Either template or files must be provided');
  } catch (error) {
    console.error('Room analysis error:', error);
    throw error;
  }
}

// STEP A: Generate 3-4 style directions (lightweight, auto-selected)
export async function generateStyleDirections(
  analysis: RoomAnalysis,
  excludedStyles: DesignStyle[] = []
): Promise<StyleDirection[]> {
  try {
    const { supabase } = await import('./supabase');
    
    // Call edge function to auto-select 3-4 style directions
    const { data, error } = await supabase.functions.invoke('app_8574c59127_generate_style_directions', {
      body: {
        roomType: analysis.roomType,
        sizeClass: analysis.sizeClass,
        usableArea: analysis.usableArea,
        blockedZones: analysis.blockedZones,
        walkableZones: analysis.walkableZones,
        walls: analysis.walls,
        doors: analysis.doors,
        windows: analysis.windows,
        detectedColors: analysis.detectedColors,
        existingFurniture: analysis.existingFurniture,
        sourceImageUrl: analysis.sourceImageUrl,
        excludedStyles // Pass excluded styles to avoid regenerating same ones
      }
    });

    if (error) {
      console.error('Failed to generate style directions:', error);
      throw new Error('Failed to generate style directions');
    }

    // Return directions with generated images
    return data.directions.map((direction: StyleDirectionResponse) => ({
      id: direction.style.toLowerCase().replace(/\s+/g, '-'),
      style: direction.style,
      name: direction.style,
      description: direction.description,
      imageUrl: direction.imageUrl, // Now comes from edge function
      investmentLevel: direction.investmentLevel
    }));
  } catch (error) {
    console.error('Error generating style directions:', error);
    throw error;
  }
}

// STEP C1: Generate 6 inspirations for selected style (NEW)
export async function generateStyleInspirations(
  analysis: RoomAnalysis,
  selectedStyle: DesignStyle
): Promise<StyleInspiration[]> {
  try {
    const { supabase } = await import('./supabase');
    
    // Call edge function to generate 6 inspirations for ONE style
    const { data, error } = await supabase.functions.invoke('app_8574c59127_generate_style_inspirations', {
      body: {
        roomType: analysis.roomType,
        sizeClass: analysis.sizeClass,
        usableArea: analysis.usableArea,
        blockedZones: analysis.blockedZones,
        walkableZones: analysis.walkableZones,
        walls: analysis.walls,
        doors: analysis.doors,
        windows: analysis.windows,
        detectedColors: analysis.detectedColors,
        existingFurniture: analysis.existingFurniture,
        sourceImageUrl: analysis.sourceImageUrl,
        selectedStyle
      }
    });

    if (error) {
      console.error('Failed to generate style inspirations:', error);
      throw new Error('Failed to generate style inspirations');
    }

    return data.inspirations.map((insp: StyleInspirationResponse, idx: number) => ({
      id: `${selectedStyle.toLowerCase().replace(/\s+/g, '-')}-${idx + 1}`,
      imageUrl: insp.imageUrl,
      description: insp.description,
      mood: insp.mood
    }));
  } catch (error) {
    console.error('Error generating style inspirations:', error);
    throw error;
  }
}

// STEP C2: Generate deep design for selected style only (on demand)
export async function generateDeepDesign(
  analysis: RoomAnalysis,
  selectedStyle: DesignStyle
): Promise<DesignOption> {
  try {
    const { supabase } = await import('./supabase');
    
    // Call edge function to generate deep design for ONE style
    const { data, error } = await supabase.functions.invoke('app_8574c59127_generate_deep_design', {
      body: {
        roomType: analysis.roomType,
        sizeClass: analysis.sizeClass,
        usableArea: analysis.usableArea,
        blockedZones: analysis.blockedZones,
        walkableZones: analysis.walkableZones,
        walls: analysis.walls,
        doors: analysis.doors,
        windows: analysis.windows,
        detectedColors: analysis.detectedColors,
        existingFurniture: analysis.existingFurniture,
        sourceImageUrl: analysis.sourceImageUrl,
        selectedStyle
      }
    });

    if (error) {
      console.error('Failed to generate deep design:', error);
      throw new Error('Failed to generate deep design');
    }
    
    // Calculate average cost for display
    const estimatedCost = Math.round((data.estimatedCostMin + data.estimatedCostMax) / 2);
    
    // Process items with computed average prices
    const processedItems = data.items.map((item: DesignItemResponse) => ({
      ...item,
      estimatedPrice: Math.round((item.estimatedPriceMin + item.estimatedPriceMax) / 2),
      sizeRange: item.dimensions || 'Standard'
    }));
    
    return {
      id: selectedStyle.toLowerCase().replace(/\s+/g, '-'),
      style: selectedStyle,
      name: selectedStyle,
      description: data.description,
      furnitureCount: data.items.length,
      layoutLogic: data.layoutLogic,
      items: processedItems,
      estimatedCostMin: data.estimatedCostMin || 0,
      estimatedCostMax: data.estimatedCostMax || 0,
      estimatedCost, // Computed average
      imageUrl: data.imageUrl || analysis.sourceImageUrl || '', // Fallback to source image
      colorPalettes: data.colorPalettes || [],
      selectedPaletteId: data.colorPalettes?.[0]?.id || 'original',
      density: 'medium', // Default density
      sizeRange: analysis.usableArea
    };
  } catch (error) {
    console.error('Error generating deep design:', error);
    throw error;
  }
}

export function updateColorPalette(
  option: DesignOption,
  paletteId: string
): DesignOption {
  return {
    ...option,
    selectedPaletteId: paletteId
  };
}

export function validateFit(option: DesignOption, analysis: RoomAnalysis): boolean {
  const maxItemsBySizeClass = {
    small: 6,
    medium: 9,
    large: 12
  };
  
  if (option.furnitureCount > maxItemsBySizeClass[analysis.sizeClass]) {
    return false;
  }
  
  return true;
}

export function generateSearchQuery(item: DesignItem): string {
  return `${item.name} ${item.dimensions} ${item.materials[0]}`;
}

export function getSuggestedExecutionOrder(items: DesignItem[]): string[] {
  const order: string[] = [];
  
  // Large furniture first
  const largeFurniture = items.filter(item => 
    item.category === 'seating' || item.category === 'tables' || item.category === 'beds'
  );
  if (largeFurniture.length > 0) {
    order.push('Large Furniture: ' + largeFurniture.map(i => i.name).join(', '));
  }
  
  // Lighting
  const lighting = items.filter(item => item.category === 'lighting');
  if (lighting.length > 0) {
    order.push('Lighting: ' + lighting.map(i => i.name).join(', '));
  }
  
  // Decor
  const decor = items.filter(item => 
    !largeFurniture.includes(item) && !lighting.includes(item)
  );
  if (decor.length > 0) {
    order.push('Decor & Finishing: ' + decor.map(i => i.name).join(', '));
  }
  
  return order;
}