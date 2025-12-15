export interface Board {
  id: string;
  user_id: string | null;
  name: string;
  cover_image_url?: string;
  source_image_url?: string;
  status: string;
  detected_items_count: number;
  room_materials?: {
    walls?: string;
    floors?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DetectedItem {
  id: string;
  board_id: string;
  item_name: string;
  category: string;
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
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  item_name: string;
  is_completed: boolean;
  completed_at?: string;
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
  type: 'inspiration' | 'specs';
  title: string;
  created_at: string;
  image_url?: string;
  category?: string;
  specifications?: Record<string, string | boolean>;
  search_queries?: string[];
  board_id?: string;
}