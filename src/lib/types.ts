export interface Board {
  id: string;
  user_id: string | null;
  name: string;
  cover_image_url?: string;
  source_image_url?: string;
  status: string;
  detected_items_count: number;
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