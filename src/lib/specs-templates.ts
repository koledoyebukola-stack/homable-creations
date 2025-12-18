// Template configurations for "Don't have dimensions?" fallback section

export interface SpecsTemplate {
  id: string;
  label: string;
  image: string;
  category: string;
  styleDetails: {
    style?: string;
    shape?: string;
    material?: string;
    color?: string;
    description: string;
  };
}

export const SPECS_TEMPLATES: Record<string, SpecsTemplate[]> = {
  'sofa': [
    {
      id: 'curved-sofa',
      label: 'Curved sofa',
      image: '/assets/curved-sofa.jpg',
      category: 'sofa',
      styleDetails: {
        style: 'Modern curved',
        shape: 'Curved',
        material: 'Upholstered',
        color: 'Neutral tones',
        description: 'Contemporary curved sofa with soft, flowing lines perfect for modern living spaces'
      }
    },
    {
      id: 'modular-sectional',
      label: 'Modular sectional',
      image: '/assets/modular-sectional.jpg',
      category: 'sofa',
      styleDetails: {
        style: 'Modular',
        shape: 'Sectional',
        material: 'Fabric',
        color: 'Versatile',
        description: 'Flexible modular sectional that can be configured to fit your space'
      }
    },
    {
      id: 'small-space-loveseat',
      label: 'Small-space loveseat',
      image: '/assets/small-loveseat.jpg',
      category: 'sofa',
      styleDetails: {
        style: 'Compact',
        shape: 'Loveseat',
        material: 'Upholstered',
        color: 'Space-saving',
        description: 'Compact loveseat designed for apartments and smaller living rooms'
      }
    },
    {
      id: 'chaise-sectional',
      label: 'Chaise sectional',
      image: '/assets/chaise-sectional.jpg',
      category: 'sofa',
      styleDetails: {
        style: 'L-shaped',
        shape: 'Chaise',
        material: 'Upholstered',
        color: 'Comfortable',
        description: 'Sectional with chaise lounge for ultimate relaxation'
      }
    },
    {
      id: 'boucle-sofa',
      label: 'Boucle sofa',
      image: '/assets/boucle-sofa.jpg',
      category: 'sofa',
      styleDetails: {
        style: 'Textured',
        shape: 'Sofa',
        material: 'Boucle fabric',
        color: 'Cream/Ivory',
        description: 'Trendy boucle fabric sofa with cozy, textured upholstery'
      }
    },
    {
      id: 'low-profile-leather',
      label: 'Low-profile leather sofa',
      image: '/assets/low-leather-sofa.jpg',
      category: 'sofa',
      styleDetails: {
        style: 'Mid-century modern',
        shape: 'Sofa',
        material: 'Leather',
        color: 'Brown/Tan',
        description: 'Sleek low-profile leather sofa with clean lines'
      }
    }
  ],
  'dining-table': [
    {
      id: 'round-dining-table',
      label: 'Round dining table',
      image: '/assets/round-dining-table.jpg',
      category: 'dining-table',
      styleDetails: {
        shape: 'Round',
        material: 'Wood',
        color: 'Natural wood',
        description: 'Classic round dining table perfect for intimate gatherings'
      }
    },
    {
      id: 'oval-dining-table',
      label: 'Oval dining table',
      image: '/assets/oval-dining-table.jpg',
      category: 'dining-table',
      styleDetails: {
        shape: 'Oval',
        material: 'Wood',
        color: 'Warm tones',
        description: 'Elegant oval table that seats more while maintaining flow'
      }
    },
    {
      id: 'pedestal-base-table',
      label: 'Pedestal base table',
      image: '/assets/pedestal-table.jpg',
      category: 'dining-table',
      styleDetails: {
        style: 'Pedestal',
        shape: 'Round',
        material: 'Wood',
        color: 'Classic',
        description: 'Single pedestal base for maximum legroom and classic style'
      }
    },
    {
      id: 'walnut-dining-table',
      label: 'Walnut wood dining table',
      image: '/assets/walnut-table.jpg',
      category: 'dining-table',
      styleDetails: {
        shape: 'Rectangular',
        material: 'Walnut wood',
        color: 'Rich brown',
        description: 'Premium walnut wood table with rich, warm tones'
      }
    },
    {
      id: 'wood-slab-table',
      label: 'Solid wood slab table',
      image: '/assets/wood-slab-table.jpg',
      category: 'dining-table',
      styleDetails: {
        style: 'Live edge',
        shape: 'Rectangular',
        material: 'Solid wood',
        color: 'Natural',
        description: 'Rustic live-edge wood slab table with natural character'
      }
    }
  ],
  'rug': [
    {
      id: 'neutral-jute-rug',
      label: 'Neutral jute rug',
      image: '/assets/jute-rug.jpg',
      category: 'rug',
      styleDetails: {
        material: 'Jute',
        color: 'Natural beige',
        description: 'Natural fiber jute rug with organic texture'
      }
    },
    {
      id: 'vintage-persian-rug',
      label: 'Vintage Persian-style rug',
      image: '/assets/persian-rug.jpg',
      category: 'rug',
      styleDetails: {
        style: 'Traditional Persian',
        material: 'Wool blend',
        color: 'Multi-color',
        description: 'Ornate Persian-inspired rug with intricate patterns'
      }
    },
    {
      id: 'plush-shag-rug',
      label: 'Plush shag rug',
      image: '/assets/shag-rug.jpg',
      category: 'rug',
      styleDetails: {
        style: 'Shag',
        material: 'Synthetic',
        color: 'Soft neutrals',
        description: 'Ultra-soft high-pile shag rug for cozy comfort'
      }
    },
    {
      id: 'abstract-organic-rug',
      label: 'Abstract organic rug',
      image: '/assets/abstract-rug.jpg',
      category: 'rug',
      styleDetails: {
        style: 'Modern abstract',
        material: 'Wool blend',
        color: 'Neutral with accents',
        description: 'Contemporary abstract design with organic shapes'
      }
    }
  ],
  'bed': [
    {
      id: 'upholstered-bed',
      label: 'Upholstered bed frame',
      image: '/assets/upholstered-bed.jpg',
      category: 'bed',
      styleDetails: {
        style: 'Upholstered',
        material: 'Fabric',
        color: 'Neutral',
        description: 'Comfortable upholstered bed frame with padded headboard'
      }
    },
    {
      id: 'curved-upholstered-bed',
      label: 'Soft curved upholstered bed',
      image: '/assets/curved-bed.jpg',
      category: 'bed',
      styleDetails: {
        style: 'Modern curved',
        material: 'Upholstered',
        color: 'Soft tones',
        description: 'Elegant curved headboard with plush upholstery'
      }
    },
    {
      id: 'canopy-bed',
      label: 'Canopy bed',
      image: '/assets/canopy-bed.jpg',
      category: 'bed',
      styleDetails: {
        style: 'Canopy',
        material: 'Wood/Metal',
        color: 'Statement piece',
        description: 'Dramatic four-poster canopy bed for a luxurious look'
      }
    },
    {
      id: 'japandi-slatted-bed',
      label: 'Wooden slatted bed (Japandi style)',
      image: '/assets/japandi-bed.jpg',
      category: 'bed',
      styleDetails: {
        style: 'Japandi minimalist',
        material: 'Wood',
        color: 'Natural wood',
        description: 'Clean-lined wooden bed with Japanese-Scandinavian aesthetic'
      }
    }
  ],
  'desk': [
    {
      id: 'minimalist-desk',
      label: 'Minimalist desk',
      image: '/assets/minimalist-desk.jpg',
      category: 'desk',
      styleDetails: {
        style: 'Minimalist',
        material: 'Wood/Metal',
        color: 'Clean',
        description: 'Simple, clutter-free desk with clean lines'
      }
    },
    {
      id: 'standing-desk',
      label: 'Standing desk',
      image: '/assets/standing-desk.jpg',
      category: 'desk',
      styleDetails: {
        style: 'Adjustable',
        material: 'Wood/Metal',
        color: 'Functional',
        description: 'Height-adjustable standing desk for ergonomic work'
      }
    },
    {
      id: 'small-space-desk',
      label: 'Small-space desk',
      image: '/assets/compact-desk.jpg',
      category: 'desk',
      styleDetails: {
        style: 'Compact',
        material: 'Wood',
        color: 'Space-saving',
        description: 'Compact desk designed for small apartments and rooms'
      }
    },
    {
      id: 'wooden-minimalist-desk',
      label: 'Wooden minimalist desk',
      image: '/assets/wood-minimalist-desk.jpg',
      category: 'desk',
      styleDetails: {
        style: 'Scandinavian',
        material: 'Solid wood',
        color: 'Natural wood',
        description: 'Warm wooden desk with Scandinavian simplicity'
      }
    }
  ]
};

// Helper function to get templates for a category
export function getTemplatesForCategory(categoryId: string): SpecsTemplate[] {
  return SPECS_TEMPLATES[categoryId] || [];
}

// Helper function to get a specific template by ID
export function getTemplateById(templateId: string): SpecsTemplate | undefined {
  for (const templates of Object.values(SPECS_TEMPLATES)) {
    const template = templates.find(t => t.id === templateId);
    if (template) return template;
  }
  return undefined;
}