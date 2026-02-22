export interface Board {
  id: string;
  user_id: string | null;
  name: string;
  cover_image_url?: string;
  source_image_url?: string;
  status: string;
  detected_items_count: number;
  country?: string; // ISO 3166-1 alpha-2 country code (e.g., 'NG' for Nigeria)
  referrer_code?: string | null; // Agent/referrer code from URL at first touch (e.g. agent_ade)
  room_materials?: {
    walls?: string;
    floors?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CarpenterSpec {
  dimensions: {
    width_cm: number;
    depth_cm: number;
    height_cm: number;
    notes?: string;
  };
  material: string;
  material_reasoning: string;
  finish: string;
  construction_features: string[];
  technical_image_url?: string; // AI-generated 3D technical interpretation image
}

// Intent classification for detected items
// Determines the structural nature and buildability of an item
export type IntentClass = 
  | 'buildable_furniture'  // Carpenter-appropriate: bed frames, tables, cabinets, chairs, etc.
  | 'soft_goods'           // Textiles: bedding, pillows, rugs, curtains, towels
  | 'lighting'             // Lamps, fixtures, chandeliers, sconces
  | 'decor'                // Art, vases, plants, mirrors, clocks, decorative items
  | 'electronics';         // TVs, speakers, appliances, devices

export interface DetectedItem {
  id: string;
  board_id: string;
  item_name: string;
  category: string;
  intent_class?: IntentClass; // Single source of truth for item buildability
  style?: string;
  dominant_color?: string;
  materials?: string[];
  dimensions?: {
    width?: string;
    length?: string;
    height?: string;
    diameter?: string;
  };
  tags?: string[];
  description?: string;
  confidence?: number;
  position?: Record<string, number | string | boolean>;
  carpenter_spec?: CarpenterSpec; // Nigeria-specific carpenter specifications
  created_at: string;
}

export interface Product {
  id: string;
  external_id?: string;
  merchant: string;
  product_name: string;
  category?: string;
  price: number;
  currency: string;
  product_url: string;
  image_url?: string;
  description?: string;
  color?: string;
  materials?: string[];
  style?: string;
  tags?: string[];
  rating?: number;
  review_count?: number;
  match_score?: number;
  is_top_pick?: boolean;
  created_at: string;
}

export interface ItemProductMatch {
  id: string;
  detected_item_id: string;
  product_id: string;
  match_score: number;
  is_top_pick: boolean;
  created_at: string;
}

export interface ProductMatchData {
  match_score: number;
  is_top_pick: boolean;
  products: Product;
}

export interface Checklist {
  id: string;
  user_id: string;
  name: string;
  board_id?: string;
  /** Explore scene hero image URL when checklist was created from explore flow */
  source_image_url?: string;
  /** When set, checklist was created from this explore scene (for attached state on scene page) */
  explore_scene_id?: string;
  gifting_enabled?: boolean;
  gifting_token?: string;
  created_at: string;
  updated_at: string;
}

export type ChecklistItemStatus = 'pending' | 'claimed' | 'completed';

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  item_name: string;
  is_completed: boolean; // Kept for backward compatibility
  status: ChecklistItemStatus; // New: pending, claimed, completed
  completed_at?: string;
  claimed_by_name?: string;
  claimed_by_user_id?: string; // Links claim to user account after sign-in
  claimed_at?: string;
  expected_date?: string; // ISO date string
  gift_note?: string;
  sort_order: number;
  created_at: string;
}

export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
  completed_count: number;
  total_count: number;
}

export interface SpecsHistory {
  id: string;
  user_id: string;
  category: string;
  specifications: Record<string, string | boolean>;
  search_queries: string[];
  created_at: string;
}

export interface HistoryItem {
  id: string;
  type: 'inspiration' | 'specs' | 'explore';
  title: string;
  created_at: string;
  image_url?: string;
  category?: string;
  specifications?: Record<string, string | boolean>;
  search_queries?: string[];
  board_id?: string;
  /** For explore scenes: slug to navigate to /explore/[slug] */
  scene_slug?: string;
}

// Storefront (vendor catalog page)
export type StorefrontVendorType = 'carpenter' | 'decor_store';
export type StorefrontStatus = 'active' | 'paused';

export interface Storefront {
  id: string;
  slug: string;
  name: string;
  location: string | null; // ISO country code for filtering (e.g. 'NG')
  location_display: string | null; // Human-readable location for UI (e.g. 'Ikeja, Lagos, Nigeria')
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  whatsapp_number: string;
  instagram_handle: string | null;
  vendor_type: StorefrontVendorType;
  status: StorefrontStatus;
  active_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorProduct {
  id: string;
  storefront_id: string;
  slug: string;
  name: string;
  category: string | null;
  room: string | null;
  material: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Explore: curated room inspirations (Nigeria)
export interface ExploreScene {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  room_type: string | null;
  hero_image_url: string | null;
  location: string | null;
  /** Sum of catalog (vendor_products) items — shown on scene cards as "Complete room from ₦X" */
  catalog_budget_ngn: number;
  /** Minimum price_min from all vendor_products linked to this scene — shown as "Items from ₦X" */
  minimum_item_price_ngn: number;
  status: string;
  sort_order: number;
  /** Manual order for homepage Explore gallery; lower first, nulls last (then created_at DESC). */
  display_order?: number | null;
  /** Total views (from explore_scene_views), shown on cards. */
  view_count?: number;
  created_at: string;
  updated_at: string;
}

export type ExploreSceneItemType = 'catalog_product' | 'custom_build' | 'instagram_link';

export interface ExploreSceneItem {
  id: string;
  scene_id: string;
  item_type: ExploreSceneItemType;
  sort_order: number;
  name: string;
  vendor_product_id: string | null;
  estimated_price_ngn: number | null;
  description: string | null;
  /** Optional Instagram handle for styling/decor items (e.g. '@plant_home.ng') */
  instagram_handle?: string | null;
  external_link: string | null;
  created_at: string;
  updated_at: string;
}

/** Scene item with joined vendor_products + storefront (when item_type = catalog_product) */
export interface ExploreSceneItemWithProduct extends ExploreSceneItem {
  vendor_product?: VendorProduct | null;
  storefront?: Storefront | null;
}