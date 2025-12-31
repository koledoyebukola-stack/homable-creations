import { supabase } from './supabase';

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
  confidence: 'high' | 'medium' | 'low';
  rawAnalysis: string;
}

/**
 * Analyze room using OpenAI Vision API
 * This function calls a Supabase Edge Function that uses OpenAI Vision
 */
export async function analyzeRoomWithVision(
  imageUrl: string,
  unknownDimensions: boolean = false
): Promise<VisionAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke('app_8574c59127_analyze_room', {
      body: {
        imageUrl,
        unknownDimensions
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
 * Analyze room template (no Vision API needed)
 */
export function analyzeRoomTemplate(templateId: string): VisionAnalysisResult {
  const templates: Record<string, VisionAnalysisResult> = {
    'living-room': {
      roomType: 'Living Room',
      walls: 4,
      doors: 1,
      windows: 2,
      proportions: {
        width: '12-15 feet',
        depth: '15-18 feet'
      },
      blockedZones: ['door swing area', 'window wall'],
      walkableZones: ['center area', 'along walls'],
      confidence: 'high',
      rawAnalysis: 'Standard living room template with typical proportions'
    },
    'bedroom': {
      roomType: 'Bedroom',
      walls: 4,
      doors: 1,
      windows: 1,
      proportions: {
        width: '10-12 feet',
        depth: '12-14 feet'
      },
      blockedZones: ['door swing area', 'closet area'],
      walkableZones: ['center area', 'foot of bed area'],
      confidence: 'high',
      rawAnalysis: 'Standard bedroom template with typical proportions'
    },
    'dining-room': {
      roomType: 'Dining Room',
      walls: 4,
      doors: 1,
      windows: 1,
      proportions: {
        width: '10-12 feet',
        depth: '12-15 feet'
      },
      blockedZones: ['door swing area', 'window area'],
      walkableZones: ['around table perimeter', 'entry area'],
      confidence: 'high',
      rawAnalysis: 'Standard dining room template with typical proportions'
    },
    'home-office': {
      roomType: 'Home Office',
      walls: 4,
      doors: 1,
      windows: 1,
      proportions: {
        width: '8-10 feet',
        depth: '10-12 feet'
      },
      blockedZones: ['door swing area', 'window wall'],
      walkableZones: ['center area', 'desk approach area'],
      confidence: 'high',
      rawAnalysis: 'Standard home office template with typical proportions'
    }
  };

  return templates[templateId] || templates['living-room'];
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