import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jvbrrgqepuhabwddufby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YnJyZ3FlcHVoYWJ3ZGR1ZmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTQzODIsImV4cCI6MjA4MDE5MDM4Mn0.aoAyKQyZZwrTbocGqKLxai1kUccAvcY45-B06huKPGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type SeedProduct = {
  external_id: string;
  merchant: string;
  product_name: string;
  category: string;
  price: number;
  currency: string;
  image_url: string;
  product_url: string;
  description?: string;
  color?: string;
  materials?: string[];
  style?: string;
  tags?: string[];
  rating?: number;
  review_count?: number;
  is_seed: boolean;
};

const entrywaySeedProducts: SeedProduct[] = [
  // Photo 1: Round black pedestal entry table with boucle stools
  {
    external_id: "ENTRY-AMZ-001",
    merchant: "Amazon",
    product_name: "Modern Round Pedestal Entry Table - Black Finish",
    category: "Tables",
    price: 289,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B08XYZMN1?tag=homablecrea03-20",
    description: "Contemporary round pedestal table with sculptural black base, perfect for entryways",
    color: "Black",
    materials: ["Wood", "MDF"],
    style: "Modern",
    tags: ["entryway", "round table", "pedestal", "black", "sculptural"],
    rating: 4.5,
    review_count: 187,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-002",
    merchant: "Amazon",
    product_name: "Boucle Round Ottoman with Black Metal Legs - Ivory",
    category: "Seating",
    price: 159,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09KLMN2P?tag=homablecrea03-20",
    description: "Soft boucle upholstered round ottoman with modern black metal legs",
    color: "Ivory",
    materials: ["Boucle", "Foam", "Metal"],
    style: "Contemporary",
    tags: ["entryway", "boucle", "ottoman", "round", "ivory", "stool"],
    rating: 4.7,
    review_count: 243,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-003",
    merchant: "Amazon",
    product_name: "Boucle Vanity Stool with Black Legs - Set of 2",
    category: "Seating",
    price: 279,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09PQRS3T?tag=homablecrea03-20",
    description: "Pair of plush boucle stools with sleek black metal legs, ideal for entryways",
    color: "Cream",
    materials: ["Boucle", "Metal", "Foam"],
    style: "Modern",
    tags: ["entryway", "boucle stool", "pair", "black legs", "seating"],
    rating: 4.6,
    review_count: 156,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-004",
    merchant: "Amazon",
    product_name: "Tall White Ceramic Vase - Modern Ribbed Design",
    category: "Decor",
    price: 68,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B08VWXY4Z?tag=homablecrea03-20",
    description: "Elegant tall white ceramic vase with ribbed texture for fresh or dried florals",
    color: "White",
    materials: ["Ceramic"],
    style: "Contemporary",
    tags: ["entryway", "vase", "white", "ceramic", "tall", "florals"],
    rating: 4.4,
    review_count: 312,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-005",
    merchant: "Amazon",
    product_name: "Brass Taper Candlestick Holders - Set of 3",
    category: "Decor",
    price: 49,
    currency: "CAD",
    image_url: "/images/CandlestickHolders.jpg",
    product_url: "https://www.amazon.ca/dp/B09STUV5W?tag=homablecrea03-20",
    description: "Slim brass candlestick holders in varying heights for elegant table styling",
    color: "Brass",
    materials: ["Metal", "Brass"],
    style: "Transitional",
    tags: ["entryway", "candlesticks", "brass", "set", "decor"],
    rating: 4.5,
    review_count: 198,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-006",
    merchant: "Amazon",
    product_name: "Neutral Coffee Table Books - Decorative Set of 3",
    category: "Decor",
    price: 89,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09WXYZ1A?tag=homablecrea03-20",
    description: "Curated set of neutral-toned coffee table books for stylish surfaces",
    color: "Neutral",
    materials: ["Paper"],
    style: "Contemporary",
    tags: ["entryway", "books", "coffee table books", "neutral", "decor"],
    rating: 4.3,
    review_count: 87,
    is_seed: true
  },

  // Photo 2: Black console with round woven mirror
  {
    external_id: "ENTRY-AMZ-007",
    merchant: "Amazon",
    product_name: "Black Fluted Console Table - Modern Design",
    category: "Tables",
    price: 349,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09ABC2DE?tag=homablecrea03-20",
    description: "Contemporary black console with vertical fluted detailing and spacious top",
    color: "Black",
    materials: ["Wood", "MDF"],
    style: "Modern",
    tags: ["console", "black", "fluted", "entryway", "modern"],
    rating: 4.6,
    review_count: 234,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-008",
    merchant: "Amazon",
    product_name: "Large Round Woven Rope Mirror - 36 inch",
    category: "Decor",
    price: 189,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09FGHIJ3?tag=homablecrea03-20",
    description: "Oversized round mirror with natural woven rope frame for coastal-modern spaces",
    color: "Natural",
    materials: ["Rope", "Glass", "Wood"],
    style: "Coastal",
    tags: ["console", "mirror", "round", "woven", "rope", "large"],
    rating: 4.7,
    review_count: 412,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-009",
    merchant: "Amazon",
    product_name: "Large Ceramic Vase with Matte Finish - Grey",
    category: "Decor",
    price: 79,
    currency: "CAD",
    image_url: "/images/CeramicVase.jpg",
    product_url: "https://www.amazon.ca/dp/B09KLMN4O?tag=homablecrea03-20",
    description: "Oversized matte ceramic vase in soft grey, perfect for statement florals",
    color: "Grey",
    materials: ["Ceramic"],
    style: "Contemporary",
    tags: ["console", "vase", "large", "ceramic", "grey", "florals"],
    rating: 4.5,
    review_count: 267,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-010",
    merchant: "Amazon",
    product_name: "Textured Ceramic Table Lamp with Linen Shade",
    category: "Lighting",
    price: 129,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09PQRS5T?tag=homablecrea03-20",
    description: "Textured ceramic base lamp with neutral linen drum shade for ambient lighting",
    color: "Beige",
    materials: ["Ceramic", "Linen", "Metal"],
    style: "Transitional",
    tags: ["console", "lamp", "table lamp", "textured", "neutral"],
    rating: 4.6,
    review_count: 189,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-011",
    merchant: "Amazon",
    product_name: "Tall Black Metal Candlestick Holders - Set of 3",
    category: "Decor",
    price: 54,
    currency: "CAD",
    image_url: "/images/CandlestickHolders.jpg",
    product_url: "https://www.amazon.ca/dp/B09UVWX6Y?tag=homablecrea03-20",
    description: "Modern black metal candlestick set in graduated heights",
    color: "Black",
    materials: ["Metal"],
    style: "Modern",
    tags: ["console", "candlesticks", "black", "metal", "tall"],
    rating: 4.4,
    review_count: 145,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-012",
    merchant: "Amazon",
    product_name: "Large Woven Seagrass Floor Basket with Handles",
    category: "Storage",
    price: 69,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09YZAB1C?tag=homablecrea03-20",
    description: "Oversized woven seagrass basket for blankets, toys, or entryway storage",
    color: "Natural",
    materials: ["Seagrass"],
    style: "Coastal",
    tags: ["console", "basket", "storage", "woven", "floor basket", "seagrass"],
    rating: 4.7,
    review_count: 523,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-013",
    merchant: "Amazon",
    product_name: "Rectangular Wood Tray with Handles - Acacia",
    category: "Decor",
    price: 45,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09CDEF2G?tag=homablecrea03-20",
    description: "Natural acacia wood serving tray for candles, remotes, or decorative displays",
    color: "Natural Wood",
    materials: ["Wood", "Acacia"],
    style: "Rustic",
    tags: ["console", "tray", "wood", "rectangular", "candles"],
    rating: 4.5,
    review_count: 298,
    is_seed: true
  },

  // Photo 3: Small wood stool, books and vase with greenery
  {
    external_id: "ENTRY-AMZ-014",
    merchant: "Amazon",
    product_name: "Small Round Wood Accent Stool - Natural Finish",
    category: "Tables",
    price: 89,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09GHIJ3K?tag=homablecrea03-20",
    description: "Compact round wood stool with natural finish, doubles as side table or plant stand",
    color: "Natural Wood",
    materials: ["Wood"],
    style: "Minimalist",
    tags: ["entryway", "stool", "wood", "small", "accent table", "natural"],
    rating: 4.6,
    review_count: 176,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-015",
    merchant: "Amazon",
    product_name: "Textured Ceramic Vase - Neutral Beige",
    category: "Decor",
    price: 42,
    currency: "CAD",
    image_url: "/images/CeramicVase.jpg",
    product_url: "https://www.amazon.ca/dp/B09KLMN5P?tag=homablecrea03-20",
    description: "Medium textured ceramic vase in warm neutral tone for greenery or dried stems",
    color: "Beige",
    materials: ["Ceramic"],
    style: "Contemporary",
    tags: ["entryway", "vase", "ceramic", "neutral", "textured", "greenery"],
    rating: 4.4,
    review_count: 203,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-016",
    merchant: "Amazon",
    product_name: "White Coffee Table Books - Modern Design Set",
    category: "Decor",
    price: 79,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09OPQR4S?tag=homablecrea03-20",
    description: "Set of 2-3 white and cream coffee table books for minimalist styling",
    color: "White",
    materials: ["Paper"],
    style: "Minimalist",
    tags: ["entryway", "books", "white", "coffee table books", "minimal"],
    rating: 4.3,
    review_count: 92,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-017",
    merchant: "Amazon",
    product_name: "Three-Legged Wood Stool - Rustic Accent",
    category: "Tables",
    price: 95,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09STUV6W?tag=homablecrea03-20",
    description: "Handcrafted three-legged wood stool with rustic charm for entryways",
    color: "Natural Wood",
    materials: ["Wood"],
    style: "Rustic",
    tags: ["entryway", "stool", "wood", "three legs", "rustic", "accent"],
    rating: 4.5,
    review_count: 134,
    is_seed: true
  },

  // Photo 4: Dark round pedestal table with vase and books
  {
    external_id: "ENTRY-AMZ-018",
    merchant: "Amazon",
    product_name: "Round Black Pedestal Table - Contemporary Style",
    category: "Tables",
    price: 279,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09WXYZ2B?tag=homablecrea03-20",
    description: "Modern round pedestal table in matte black finish with sculptural base",
    color: "Black",
    materials: ["Wood", "MDF"],
    style: "Contemporary",
    tags: ["entryway", "round table", "pedestal", "black", "modern"],
    rating: 4.6,
    review_count: 201,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-019",
    merchant: "Amazon",
    product_name: "Tall Neutral Vase for Branches - Ceramic",
    category: "Decor",
    price: 72,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09ABCD3E?tag=homablecrea03-20",
    description: "Tall ceramic vase in soft neutral tone, perfect for tall branches or pampas grass",
    color: "Cream",
    materials: ["Ceramic"],
    style: "Minimalist",
    tags: ["entryway", "vase", "tall", "branches", "neutral", "ceramic"],
    rating: 4.5,
    review_count: 187,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-020",
    merchant: "Amazon",
    product_name: "Decorative Coffee Table Books - Dark Covers Set",
    category: "Decor",
    price: 85,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09FGHIJ4?tag=homablecrea03-20",
    description: "Set of 2-3 coffee table books with dark sophisticated covers",
    color: "Black",
    materials: ["Paper"],
    style: "Contemporary",
    tags: ["entryway", "books", "coffee table books", "dark", "sophisticated"],
    rating: 4.4,
    review_count: 112,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-021",
    merchant: "Amazon",
    product_name: "Modern Area Rug - Neutral Geometric Pattern 5x7",
    category: "Rugs",
    price: 189,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09KLMN6Q?tag=homablecrea03-20",
    description: "Contemporary area rug with subtle geometric pattern in neutral tones",
    color: "Beige",
    materials: ["Polypropylene", "Jute"],
    style: "Contemporary",
    tags: ["entryway", "rug", "area rug", "neutral", "geometric", "5x7"],
    rating: 4.6,
    review_count: 456,
    is_seed: true
  },

  // Additional versatile products that work across multiple scenes
  {
    external_id: "ENTRY-AMZ-022",
    merchant: "Amazon",
    product_name: "Black Console Table with Shelf - Slim Profile",
    category: "Tables",
    price: 249,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09OPQR5T?tag=homablecrea03-20",
    description: "Narrow black console table with lower shelf for entryway or hallway",
    color: "Black",
    materials: ["Metal", "Wood"],
    style: "Modern",
    tags: ["console", "black", "slim", "entryway", "shelf"],
    rating: 4.5,
    review_count: 312,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-023",
    merchant: "Amazon",
    product_name: "Round Boucle Ottoman - Cream with Wood Legs",
    category: "Seating",
    price: 169,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09STUV7X?tag=homablecrea03-20",
    description: "Plush cream boucle ottoman with natural wood legs for versatile seating",
    color: "Cream",
    materials: ["Boucle", "Wood", "Foam"],
    style: "Scandinavian",
    tags: ["entryway", "ottoman", "boucle", "cream", "round", "wood legs"],
    rating: 4.7,
    review_count: 289,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-024",
    merchant: "Amazon",
    product_name: "White Ribbed Ceramic Vase - Large",
    category: "Decor",
    price: 75,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09UVWX7Z?tag=homablecrea03-20",
    description: "Large white ceramic vase with vertical ribbed texture for statement florals",
    color: "White",
    materials: ["Ceramic"],
    style: "Modern",
    tags: ["entryway", "console", "vase", "white", "large", "ribbed"],
    rating: 4.6,
    review_count: 234,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-025",
    merchant: "Amazon",
    product_name: "Gold Metal Candlestick Set - Modern Taper Holders",
    category: "Decor",
    price: 52,
    currency: "CAD",
    image_url: "/images/CandlestickHolders.jpg",
    product_url: "https://www.amazon.ca/dp/B09YZAB2D?tag=homablecrea03-20",
    description: "Set of 3 gold metal candlestick holders in varying heights",
    color: "Gold",
    materials: ["Metal"],
    style: "Glam",
    tags: ["entryway", "console", "candlesticks", "gold", "set", "modern"],
    rating: 4.5,
    review_count: 167,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-026",
    merchant: "Amazon",
    product_name: "Natural Jute Round Mirror - 32 inch",
    category: "Decor",
    price: 169,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09CDEF3H?tag=homablecrea03-20",
    description: "Round mirror with natural jute rope frame for coastal or bohemian spaces",
    color: "Natural",
    materials: ["Jute", "Glass", "Wood"],
    style: "Coastal",
    tags: ["console", "mirror", "round", "jute", "natural", "woven"],
    rating: 4.6,
    review_count: 378,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-027",
    merchant: "Amazon",
    product_name: "Modern Table Lamp with Neutral Shade",
    category: "Lighting",
    price: 119,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09GHIJ4K?tag=homablecrea03-20",
    description: "Contemporary table lamp with ceramic base and neutral linen shade",
    color: "Beige",
    materials: ["Ceramic", "Linen"],
    style: "Contemporary",
    tags: ["console", "lamp", "table lamp", "neutral", "modern"],
    rating: 4.5,
    review_count: 201,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-028",
    merchant: "Amazon",
    product_name: "Woven Storage Basket with Lid - Large",
    category: "Storage",
    price: 64,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09KLMN7R?tag=homablecrea03-20",
    description: "Large woven basket with lid for hidden storage in entryways or living rooms",
    color: "Natural",
    materials: ["Seagrass", "Rattan"],
    style: "Coastal",
    tags: ["console", "basket", "storage", "woven", "lid", "large"],
    rating: 4.7,
    review_count: 412,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-029",
    merchant: "Amazon",
    product_name: "Wood Decorative Tray - Natural Finish",
    category: "Decor",
    price: 48,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09OPQR6U?tag=homablecrea03-20",
    description: "Rectangular wood tray with handles for organizing console or coffee table",
    color: "Natural Wood",
    materials: ["Wood"],
    style: "Rustic",
    tags: ["console", "tray", "wood", "natural", "decorative"],
    rating: 4.4,
    review_count: 256,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-030",
    merchant: "Amazon",
    product_name: "Neutral Area Rug - 5x8 Modern Design",
    category: "Rugs",
    price: 219,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09PQRS8Y?tag=homablecrea03-20",
    description: "Versatile neutral area rug with subtle pattern for entryways or living spaces",
    color: "Beige",
    materials: ["Polypropylene"],
    style: "Transitional",
    tags: ["entryway", "rug", "area rug", "neutral", "5x8", "modern"],
    rating: 4.6,
    review_count: 523,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-031",
    merchant: "Amazon",
    product_name: "Black Metal Console Table - Industrial Style",
    category: "Tables",
    price: 269,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09STUV8Z?tag=homablecrea03-20",
    description: "Industrial black metal console with wood top for modern entryways",
    color: "Black",
    materials: ["Metal", "Wood"],
    style: "Industrial",
    tags: ["console", "black", "metal", "industrial", "entryway"],
    rating: 4.5,
    review_count: 289,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-032",
    merchant: "Amazon",
    product_name: "Round Wood Pedestal Side Table - Dark Finish",
    category: "Tables",
    price: 199,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09UVWX8A?tag=homablecrea03-20",
    description: "Round pedestal side table in dark wood finish with modern silhouette",
    color: "Dark Wood",
    materials: ["Wood"],
    style: "Modern",
    tags: ["entryway", "round table", "pedestal", "dark", "side table"],
    rating: 4.6,
    review_count: 178,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-033",
    merchant: "Amazon",
    product_name: "Ceramic Textured Vase - Matte White",
    category: "Decor",
    price: 58,
    currency: "CAD",
    image_url: "/images/CeramicVase.jpg",
    product_url: "https://www.amazon.ca/dp/B09YZAB3E?tag=homablecrea03-20",
    description: "Medium matte white ceramic vase with organic texture for modern styling",
    color: "White",
    materials: ["Ceramic"],
    style: "Modern",
    tags: ["entryway", "console", "vase", "white", "textured", "ceramic"],
    rating: 4.5,
    review_count: 234,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-034",
    merchant: "Amazon",
    product_name: "Faux Eucalyptus Stems - Set of 3",
    category: "Decor",
    price: 35,
    currency: "CAD",
    image_url: "/images/FauxEucalyptus.jpg",
    product_url: "https://www.amazon.ca/dp/B09CDEF4I?tag=homablecrea03-20",
    description: "Realistic faux eucalyptus stems for vases and arrangements",
    color: "Green",
    materials: ["Plastic", "Fabric"],
    style: "Natural",
    tags: ["entryway", "console", "greenery", "eucalyptus", "faux", "stems"],
    rating: 4.4,
    review_count: 567,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-035",
    merchant: "Amazon",
    product_name: "Black Decorative Bowl - Matte Finish",
    category: "Decor",
    price: 42,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09GHIJ5L?tag=homablecrea03-20",
    description: "Large matte black decorative bowl for keys, jewelry, or styling",
    color: "Black",
    materials: ["Ceramic"],
    style: "Modern",
    tags: ["entryway", "console", "bowl", "black", "decorative", "matte"],
    rating: 4.5,
    review_count: 189,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-036",
    merchant: "Amazon",
    product_name: "Brass and Glass Candle Holders - Set of 2",
    category: "Decor",
    price: 46,
    currency: "CAD",
    image_url: "/images/CandlestickHolders.jpg",
    product_url: "https://www.amazon.ca/dp/B09KLMN8S?tag=homablecrea03-20",
    description: "Modern brass and glass candle holders for pillar or taper candles",
    color: "Brass",
    materials: ["Metal", "Glass"],
    style: "Contemporary",
    tags: ["console", "candle holders", "brass", "glass", "modern"],
    rating: 4.6,
    review_count: 201,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-037",
    merchant: "Amazon",
    product_name: "Natural Rattan Console Table - 42 inch",
    category: "Tables",
    price: 329,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09OPQR7V?tag=homablecrea03-20",
    description: "Console table with natural rattan accents and glass top for coastal style",
    color: "Natural",
    materials: ["Rattan", "Glass", "Wood"],
    style: "Coastal",
    tags: ["console", "rattan", "natural", "glass top", "coastal"],
    rating: 4.5,
    review_count: 167,
    is_seed: true
  },
  {
    external_id: "ENTRY-AMZ-038",
    merchant: "Amazon",
    product_name: "Ivory Boucle Bench with Black Legs",
    category: "Seating",
    price: 249,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09PQRS9Z?tag=homablecrea03-20",
    description: "Upholstered boucle bench with sleek black metal legs for entryways",
    color: "Ivory",
    materials: ["Boucle", "Metal", "Foam"],
    style: "Modern",
    tags: ["entryway", "bench", "boucle", "ivory", "black legs", "seating"],
    rating: 4.7,
    review_count: 312,
    is_seed: true
  }
];

console.log(`Prepared ${entrywaySeedProducts.length} entryway seed products`);

async function seedEntrywayProducts() {
  console.log('Starting to seed entryway products...');

  try {
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of entrywaySeedProducts) {
      // Check if product exists
      const { data: existing, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('external_id', product.external_id)
        .eq('merchant', product.merchant)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking product ${product.external_id}:`, checkError);
        continue;
      }

      if (existing) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(product)
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Error updating product ${product.external_id}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        // Insert new product
        const { error: insertError } = await supabase
          .from('products')
          .insert(product);

        if (insertError) {
          console.error(`Error inserting product ${product.external_id}:`, insertError);
          skippedCount++;
        } else {
          insertedCount++;
        }
      }

      // Progress indicator
      if ((insertedCount + updatedCount) % 10 === 0) {
        console.log(`Progress: ${insertedCount + updatedCount}/${entrywaySeedProducts.length} products processed...`);
      }
    }

    console.log(`\n✅ Successfully processed ${insertedCount + updatedCount} entryway products!`);
    console.log(`   - Inserted: ${insertedCount} new products`);
    console.log(`   - Updated: ${updatedCount} existing products`);
    console.log(`   - Skipped: ${skippedCount} products (errors)`);
    console.log(`📊 Total products attempted: ${entrywaySeedProducts.length}`);

    // Verify total seed count
    const { count: totalSeedCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_seed', true);

    if (countError) {
      console.error('Error counting total seed products:', countError);
    } else {
      console.log(`\n📈 Total products with is_seed=true in database: ${totalSeedCount}`);
    }

    // Show category breakdown for entryway products only
    const { data: categories, error: catError } = await supabase
      .from('products')
      .select('category, external_id')
      .eq('is_seed', true)
      .like('external_id', 'ENTRY-%');

    if (!catError && categories) {
      const categoryCount = categories.reduce((acc: Record<string, number>, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});
      console.log('\n📦 Entryway products category breakdown:');
      Object.entries(categoryCount).forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count} products`);
      });
    }

    // Sample products by scene
    console.log('\n🎨 Sample products by scene:');
    
    // Scene 1: Round black pedestal with boucle stools
    console.log('\nScene 1 (Round black pedestal + boucle stools):');
    const scene1 = entrywaySeedProducts.filter(p => 
      ['ENTRY-AMZ-001', 'ENTRY-AMZ-002', 'ENTRY-AMZ-004'].includes(p.external_id)
    );
    scene1.forEach(p => console.log(`  - ${p.product_name} (${p.category}, $${p.price})`));

    // Scene 2: Black console with woven mirror
    console.log('\nScene 2 (Black console + woven mirror):');
    const scene2 = entrywaySeedProducts.filter(p => 
      ['ENTRY-AMZ-007', 'ENTRY-AMZ-008', 'ENTRY-AMZ-012'].includes(p.external_id)
    );
    scene2.forEach(p => console.log(`  - ${p.product_name} (${p.category}, $${p.price})`));

    // Scene 3: Small wood stool with books
    console.log('\nScene 3 (Wood stool + books + vase):');
    const scene3 = entrywaySeedProducts.filter(p => 
      ['ENTRY-AMZ-014', 'ENTRY-AMZ-015', 'ENTRY-AMZ-016'].includes(p.external_id)
    );
    scene3.forEach(p => console.log(`  - ${p.product_name} (${p.category}, $${p.price})`));

    // Scene 4: Dark round pedestal with vase
    console.log('\nScene 4 (Dark round pedestal + vase + books):');
    const scene4 = entrywaySeedProducts.filter(p => 
      ['ENTRY-AMZ-018', 'ENTRY-AMZ-019', 'ENTRY-AMZ-021'].includes(p.external_id)
    );
    scene4.forEach(p => console.log(`  - ${p.product_name} (${p.category}, $${p.price})`));

  } catch (error) {
    console.error('Failed to seed entryway products:', error);
    process.exit(1);
  }
}

seedEntrywayProducts();