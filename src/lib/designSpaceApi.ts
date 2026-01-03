import { supabase } from './supabase';

export interface ExistingFurniture {
  item: string;
  position: string;
  category: string;
}

export interface VisionAnalysisResult {
  roomType: string;
  walls: number;
  doors: number;
  windows: number;
  proportions: {
    width: string;
    depth: string;
  };
  blockedZones: string[];
  walkableZones: string[];
  existingFurniture?: ExistingFurniture[];
  confidence: 'high' | 'medium' | 'low';
  detectedColors?: string[];
  rawAnalysis: string;
}

// Template ID to image URL mapping
const TEMPLATE_IMAGES: Record<string, string> = {
  'living-room': 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/d0d966e8-188f-4d04-a96d-426b17fd2c45.png',
  'bedroom': 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/440cd2b1-4463-4154-adc6-9b80782a0131.png',
  'dining-room': 'https://mgx-backend-cdn.metadl.com/generate/images/812954/2025-12-31/9a416eec-cc75-47d0-bfa6-80faeb568e7d.png',
  'home-office': '/assets/office-with-furniture.png'
};

// Template metadata to seed Vision analysis
const TEMPLATE_METADATA: Record<string, { roomType: string; knownStructure: string }> = {
  'living-room': {
    roomType: 'Living Room',
    knownStructure: 'Standard living room with 4 walls, 1 door, 2 windows'
  },
  'bedroom': {
    roomType: 'Bedroom',
    knownStructure: 'Standard bedroom with 4 walls, 1 door, 1 window'
  },
  'dining-room': {
    roomType: 'Dining Room',
    knownStructure: 'Standard dining room with 4 walls, 1 door, 1 window'
  },
  'home-office': {
    roomType: 'Home Office',
    knownStructure: 'Home office with desk, chair, bookshelf, and credenza. 4 walls, 1 door, 1 window'
  }
};

/**
 * Analyze room using OpenAI Vision API
 * This function calls a Supabase Edge Function that uses OpenAI Vision
 */
export async function analyzeRoomWithVision(
  imageUrl: string,
  unknownDimensions: boolean = false,
  templateMetadata?: { roomType: string; knownStructure: string }
): Promise<VisionAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke('app_8574c59127_analyze_room', {
      body: {
        imageUrl,
        unknownDimensions,
        templateMetadata // Seed Vision with template context if provided
      }
    });

    if (error) {
      console.error('Vision analysis error:', error);
      throw new Error(`Failed to analyze room: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Vision analysis failed');
    }

    return data.analysis;
  } catch (error) {
    console.error('Room analysis error:', error);
    throw error;
  }
}

/**
 * Analyze room template using Vision API (UNIFIED PIPELINE)
 * Templates now call Vision analysis on their images instead of using static data
 */
export async function analyzeRoomTemplate(templateId: string): Promise<VisionAnalysisResult> {
  const templateImageUrl = TEMPLATE_IMAGES[templateId];
  const metadata = TEMPLATE_METADATA[templateId];

  if (!templateImageUrl || !metadata) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  // Call Vision API with template image and metadata to seed the analysis
  return analyzeRoomWithVision(templateImageUrl, false, metadata);
}

/**
 * Infer room size class from Vision analysis
 */
export function inferSizeClass(analysis: VisionAnalysisResult): 'small' | 'medium' | 'large' {
  // Extract approximate dimensions from proportions
  const widthMatch = analysis.proportions.width.match(/(\d+)/);
  const depthMatch = analysis.proportions.depth.match(/(\d+)/);
  
  if (!widthMatch || !depthMatch) {
    return 'medium'; // Default to medium if can't parse
  }

  const width = parseInt(widthMatch[0]);
  const depth = parseInt(depthMatch[0]);
  const area = width * depth;

  // Size classification based on approximate area
  if (area < 120) return 'small';
  if (area < 200) return 'medium';
  return 'large';
}

/**
 * Calculate usable area estimate
 */
export function calculateUsableArea(analysis: VisionAnalysisResult): string {
  const sizeClass = inferSizeClass(analysis);
  
  const ranges = {
    small: '80-120 sq ft',
    medium: '120-200 sq ft',
    large: '200-300 sq ft'
  };

  return ranges[sizeClass];
}