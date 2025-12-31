// Design Space API and utility functions
import { analyzeRoomWithVision, analyzeRoomTemplate, inferSizeClass, calculateUsableArea } from './designSpaceApi';

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
}

export interface DesignOption {
  id: string;
  name: string;
  density: 'open' | 'balanced' | 'cozy';
  furnitureCount: number;
  layoutLogic: string;
  items: DesignItem[];
  estimatedCost: number;
}

export interface DesignItem {
  id: string;
  name: string;
  role: string;
  sizeRange: string;
  materials: string[];
  placementIntent: string;
  estimatedPrice: number;
}

export async function analyzeRoom(
  template?: string,
  files?: File[],
  unknownDimensions?: boolean
): Promise<RoomAnalysis> {
  try {
    // If template is provided, use template analysis
    if (template) {
      const visionResult = analyzeRoomTemplate(template);
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
      };
    }

    // If files are provided, upload to Supabase and analyze with Vision API
    if (files && files.length > 0) {
      // For MVP, we'll use the first file
      const file = files[0];
      
      // Upload to Supabase storage
      const { supabase } = await import('./supabase');
      const fileName = `room-${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('room-images')
        .getPublicUrl(fileName);

      // Analyze with Vision API
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
      };
    }

    throw new Error('Either template or files must be provided');
  } catch (error) {
    console.error('Room analysis error:', error);
    throw error;
  }
}

export async function generateDesignOptions(
  analysis: RoomAnalysis
): Promise<DesignOption[]> {
  // Mock implementation for MVP
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const baseItems: Record<string, DesignItem[]> = {
    'Living Room': [
      {
        id: '1',
        name: 'Sofa',
        role: 'Primary seating',
        sizeRange: '72-84 inches',
        materials: ['fabric', 'leather'],
        placementIntent: 'Against longest wall',
        estimatedPrice: 800
      },
      {
        id: '2',
        name: 'Coffee Table',
        role: 'Central surface',
        sizeRange: '36-48 inches',
        materials: ['wood', 'glass', 'metal'],
        placementIntent: 'Center of seating area',
        estimatedPrice: 200
      },
      {
        id: '3',
        name: 'Area Rug',
        role: 'Define space',
        sizeRange: '5x7 or 6x9 feet',
        materials: ['wool', 'synthetic'],
        placementIntent: 'Under coffee table',
        estimatedPrice: 150
      }
    ],
    'Bedroom': [
      {
        id: '1',
        name: 'Bed Frame',
        role: 'Primary furniture',
        sizeRange: 'Queen or King',
        materials: ['wood', 'metal', 'upholstered'],
        placementIntent: 'Against main wall',
        estimatedPrice: 600
      },
      {
        id: '2',
        name: 'Nightstands',
        role: 'Bedside storage',
        sizeRange: '18-24 inches wide',
        materials: ['wood', 'metal'],
        placementIntent: 'On both sides of bed',
        estimatedPrice: 300
      },
      {
        id: '3',
        name: 'Dresser',
        role: 'Clothing storage',
        sizeRange: '48-60 inches wide',
        materials: ['wood'],
        placementIntent: 'Opposite bed or side wall',
        estimatedPrice: 500
      }
    ],
    'Dining Room': [
      {
        id: '1',
        name: 'Dining Table',
        role: 'Primary surface',
        sizeRange: '60-72 inches',
        materials: ['wood', 'glass'],
        placementIntent: 'Center of room',
        estimatedPrice: 700
      },
      {
        id: '2',
        name: 'Dining Chairs',
        role: 'Seating',
        sizeRange: 'Set of 4-6',
        materials: ['wood', 'upholstered'],
        placementIntent: 'Around table',
        estimatedPrice: 400
      },
      {
        id: '3',
        name: 'Sideboard',
        role: 'Storage and display',
        sizeRange: '48-60 inches',
        materials: ['wood'],
        placementIntent: 'Against wall',
        estimatedPrice: 600
      }
    ],
    'Home Office': [
      {
        id: '1',
        name: 'Desk',
        role: 'Work surface',
        sizeRange: '48-60 inches',
        materials: ['wood', 'metal'],
        placementIntent: 'Against wall or window',
        estimatedPrice: 400
      },
      {
        id: '2',
        name: 'Office Chair',
        role: 'Seating',
        sizeRange: 'Ergonomic',
        materials: ['mesh', 'leather'],
        placementIntent: 'At desk',
        estimatedPrice: 300
      },
      {
        id: '3',
        name: 'Bookshelf',
        role: 'Storage',
        sizeRange: '36-48 inches wide',
        materials: ['wood', 'metal'],
        placementIntent: 'Against wall',
        estimatedPrice: 250
      }
    ]
  };
  
  const items = baseItems[analysis.roomType] || baseItems['Living Room'];
  
  return [
    {
      id: 'open',
      name: 'Open & Airy',
      density: 'open',
      furnitureCount: 3,
      layoutLogic: 'Minimal furniture, maximum circulation space. Focus on essentials only.',
      items: items.slice(0, 3),
      estimatedCost: items.slice(0, 3).reduce((sum, item) => sum + item.estimatedPrice, 0)
    },
    {
      id: 'balanced',
      name: 'Balanced Layout',
      density: 'balanced',
      furnitureCount: 5,
      layoutLogic: 'Mix of seating, storage, and decor. Comfortable without feeling crowded.',
      items: [
        ...items,
        {
          id: '4',
          name: 'Accent Chair',
          role: 'Additional seating',
          sizeRange: '28-32 inches wide',
          materials: ['fabric', 'leather'],
          placementIntent: 'Corner or beside main furniture',
          estimatedPrice: 400
        },
        {
          id: '5',
          name: 'Floor Lamp',
          role: 'Task lighting',
          sizeRange: '60-70 inches tall',
          materials: ['metal', 'wood'],
          placementIntent: 'Beside seating',
          estimatedPrice: 100
        }
      ],
      estimatedCost: items.reduce((sum, item) => sum + item.estimatedPrice, 0) + 500
    },
    {
      id: 'cozy',
      name: 'Cozy & Complete',
      density: 'cozy',
      furnitureCount: 7,
      layoutLogic: 'Full furnishing with multiple seating options and storage. Warm, lived-in feel.',
      items: [
        ...items,
        {
          id: '4',
          name: 'Accent Chair',
          role: 'Additional seating',
          sizeRange: '28-32 inches wide',
          materials: ['fabric', 'leather'],
          placementIntent: 'Corner or beside main furniture',
          estimatedPrice: 400
        },
        {
          id: '5',
          name: 'Floor Lamp',
          role: 'Task lighting',
          sizeRange: '60-70 inches tall',
          materials: ['metal', 'wood'],
          placementIntent: 'Beside seating',
          estimatedPrice: 100
        },
        {
          id: '6',
          name: 'Side Table',
          role: 'Surface for lamp/decor',
          sizeRange: '18-24 inches',
          materials: ['wood', 'metal'],
          placementIntent: 'Beside chair',
          estimatedPrice: 150
        },
        {
          id: '7',
          name: 'Wall Art',
          role: 'Visual interest',
          sizeRange: '24-36 inches',
          materials: ['canvas', 'framed print'],
          placementIntent: 'Above main furniture',
          estimatedPrice: 80
        }
      ],
      estimatedCost: items.reduce((sum, item) => sum + item.estimatedPrice, 0) + 730
    }
  ];
}

export function validateFit(option: DesignOption, analysis: RoomAnalysis): boolean {
  // Rule-based validation
  const maxItemsBySizeClass = {
    small: 5,
    medium: 7,
    large: 10
  };
  
  if (option.furnitureCount > maxItemsBySizeClass[analysis.sizeClass]) {
    return false;
  }
  
  return true;
}

export function generateSearchQuery(item: DesignItem): string {
  return `${item.name} ${item.sizeRange} ${item.materials[0]}`;
}

export function getSuggestedExecutionOrder(items: DesignItem[]): string[] {
  const order: string[] = [];
  
  // Large furniture first
  const largeFurniture = items.filter(item => 
    item.role.includes('seating') || item.role.includes('Primary') || item.role.includes('Work surface')
  );
  if (largeFurniture.length > 0) {
    order.push('Large Furniture: ' + largeFurniture.map(i => i.name).join(', '));
  }
  
  // Lighting
  const lighting = items.filter(item => 
    item.role.includes('lighting') || item.name.toLowerCase().includes('lamp')
  );
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