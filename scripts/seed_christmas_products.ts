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

const baseChristmasSeedProducts: SeedProduct[] = [
  {
    external_id: "XMAS-AMZ-001",
    merchant: "Amazon",
    product_name: "Pre-Lit Christmas Garland with Warm White Lights (9 ft)",
    category: "Decor",
    price: 59,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/XMASAMZ001?tag=homablecrea03-20",
    description: "Full, pre-lit Christmas garland with warm white LEDs, perfect for stair rails, mantels, or doorways.",
    color: "Green",
    materials: ["PVC", "Copper wire"],
    style: "Traditional",
    tags: ["christmas", "garland", "pre-lit", "staircase", "mantel"],
    rating: 4.6,
    review_count: 421,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-002",
    merchant: "Amazon",
    product_name: "Set of 4 Velvet Christmas Stockings with White Cuff",
    category: "Decor",
    price: 39,
    currency: "CAD",
    image_url: "/images/photo1764821193.jpg",
    product_url: "https://www.amazon.ca/dp/XMASAMZ002?tag=homablecrea03-20",
    description: "Soft velvet stockings in a matching set, ideal for mantels, stair rails, or kids' rooms.",
    color: "Red",
    materials: ["Velvet", "Polyester"],
    style: "Classic",
    tags: ["christmas", "stockings", "mantel", "family"],
    rating: 4.7,
    review_count: 310,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-003",
    merchant: "Amazon",
    product_name: "Faux Pine Wreath with Berries and Pinecones (24 in)",
    category: "Decor",
    price: 49,
    currency: "CAD",
    image_url: "/images/photo1764821193.jpg",
    product_url: "https://www.amazon.ca/dp/XMASAMZ003?tag=homablecrea03-20",
    description: "Full faux pine wreath with red berries and pinecones for front doors or above fireplaces.",
    color: "Green",
    materials: ["PVC", "Plastic", "Metal"],
    style: "Rustic",
    tags: ["christmas", "wreath", "front door", "pinecones"],
    rating: 4.5,
    review_count: 198,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-004",
    merchant: "Amazon",
    product_name: "Warm White String Lights (33 ft, Plug-in)",
    category: "Lighting",
    price: 24,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/XMASAMZ004?tag=homablecrea03-20",
    description: "Warm white fairy lights for trees, garlands, or window frames.",
    color: "Warm white",
    materials: ["Copper wire", "Plastic"],
    style: "Cozy",
    tags: ["christmas", "string lights", "fairy lights", "garland"],
    rating: 4.4,
    review_count: 612,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-005",
    merchant: "Amazon",
    product_name: "Set of 6 Glass Christmas Baubles in Neutral Tones",
    category: "Decor",
    price: 34,
    currency: "CAD",
    image_url: "/images/photo1764821194.jpg",
    product_url: "https://www.amazon.ca/dp/XMASAMZ005?tag=homablecrea03-20",
    description: "Hand-finished glass baubles in soft neutrals that work with modern or Scandinavian trees.",
    color: "Champagne",
    materials: ["Glass", "Metal"],
    style: "Scandinavian",
    tags: ["christmas", "ornaments", "tree decor", "neutral"],
    rating: 4.3,
    review_count: 156,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-006",
    merchant: "Amazon",
    product_name: "Chunky Knit Christmas Tree Skirt in Cream",
    category: "Decor",
    price: 59,
    currency: "CAD",
    image_url: "/images/photo1764821192.jpg",
    product_url: "https://www.amazon.ca/dp/XMASAMZ006?tag=homablecrea03-20",
    description: "Cable knit tree skirt in soft cream that hides stands and adds a cozy texture.",
    color: "Cream",
    materials: ["Acrylic", "Polyester"],
    style: "Cozy",
    tags: ["christmas", "tree skirt", "knit", "neutral"],
    rating: 4.8,
    review_count: 289,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-007",
    merchant: "Amazon",
    product_name: "Set of 2 Christmas Throw Pillow Covers (Plaid)",
    category: "Seating",
    price: 22,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/XMASAMZ007?tag=homablecrea03-20",
    description: "Classic red plaid pillow covers that instantly make sofas or beds feel festive.",
    color: "Red",
    materials: ["Cotton", "Polyester"],
    style: "Farmhouse",
    tags: ["christmas", "pillows", "sofa", "cozy"],
    rating: 4.6,
    review_count: 341,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-008",
    merchant: "Amazon",
    product_name: "LED Flameless Pillar Candles with Remote (Set of 3)",
    category: "Lighting",
    price: 29,
    currency: "CAD",
    image_url: "/images/photo1764821192.jpg",
    product_url: "https://www.amazon.ca/dp/XMASAMZ008?tag=homablecrea03-20",
    description: "Battery powered pillar candles with realistic flicker for mantels, consoles, or dining tables.",
    color: "Ivory",
    materials: ["Wax", "Plastic"],
    style: "Modern",
    tags: ["christmas", "candles", "centerpiece", "mantel"],
    rating: 4.5,
    review_count: 502,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-009",
    merchant: "Amazon",
    product_name: "Artificial Mini Christmas Trees in Burlap (Set of 3)",
    category: "Decor",
    price: 31,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/XMASAMZ009?tag=homablecrea03-20",
    description: "Small tabletop trees in burlap bases, perfect for consoles, bookshelves, or nightstands.",
    color: "Green",
    materials: ["PVC", "Jute"],
    style: "Rustic",
    tags: ["christmas", "mini tree", "console", "shelf decor"],
    rating: 4.4,
    review_count: 221,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-010",
    merchant: "Amazon",
    product_name: "Gold Metal Christmas Reindeer Figurines (Set of 2)",
    category: "Decor",
    price: 42,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1513171920216-2640b288471b?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/XMASAMZ010?tag=homablecrea03-20",
    description: "Minimal gold reindeer figurines for modern consoles, sideboards, or mantels.",
    color: "Gold",
    materials: ["Metal"],
    style: "Modern",
    tags: ["christmas", "figurine", "reindeer", "console decor"],
    rating: 4.7,
    review_count: 179,
    is_seed: true
  },
  {
    external_id: "XMAS-WMT-001",
    merchant: "Walmart",
    product_name: "Red and White Knit Christmas Stocking",
    category: "Decor",
    price: 19,
    currency: "CAD",
    image_url: "/images/photo1764821192.jpg",
    product_url: "https://www.walmart.ca/en/ip/XMASWMT001",
    description: "Chunky knit stocking in red and white, ideal for family mantels.",
    color: "Red",
    materials: ["Acrylic"],
    style: "Cozy",
    tags: ["christmas", "stocking", "mantel"],
    rating: 4.2,
    review_count: 67,
    is_seed: true
  },
  {
    external_id: "XMAS-WMT-002",
    merchant: "Walmart",
    product_name: "Pre-Lit Tabletop Christmas Tree with Burlap Base",
    category: "Decor",
    price: 29,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1513639725746-c5d3e861f32a?w=800&q=80",
    product_url: "https://www.walmart.ca/en/ip/XMASWMT002",
    description: "Small pre-lit tree ideal for desks, entry tables, or bedrooms.",
    color: "Green",
    materials: ["PVC", "Jute"],
    style: "Traditional",
    tags: ["christmas", "mini tree", "entryway"],
    rating: 4.3,
    review_count: 54,
    is_seed: true
  },
  {
    external_id: "XMAS-WMT-003",
    merchant: "Walmart",
    product_name: "Holiday Table Runner with Snowflake Pattern",
    category: "Tables",
    price: 24,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1518176258769-f227c798150e?w=800&q=80",
    product_url: "https://www.walmart.ca/en/ip/XMASWMT003",
    description: "Red table runner with subtle snowflake pattern for dining or console tables.",
    color: "Red",
    materials: ["Polyester"],
    style: "Classic",
    tags: ["christmas", "table runner", "dining"],
    rating: 4.1,
    review_count: 43,
    is_seed: true
  },
  {
    external_id: "XMAS-BOU-001",
    merchant: "Bouclair",
    product_name: "Faux Fur Christmas Stocking in Ivory",
    category: "Decor",
    price: 32,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1514986888952-8cd320577b68?w=800&q=80",
    product_url: "https://www.bouclair.com/en/xmas-bou-001",
    description: "Soft faux fur stocking for modern and minimalist mantels.",
    color: "Ivory",
    materials: ["Faux fur", "Polyester"],
    style: "Modern",
    tags: ["christmas", "stocking", "neutral", "mantel"],
    rating: 4.6,
    review_count: 38,
    is_seed: true
  },
  {
    external_id: "XMAS-BOU-002",
    merchant: "Bouclair",
    product_name: "LED Glass Christmas Tree Table Lamp",
    category: "Lighting",
    price: 39,
    currency: "CAD",
    image_url: "/images/ChristmasTreeLamp.jpg",
    product_url: "https://www.bouclair.com/en/xmas-bou-002",
    description: "Small glass tree lamp that glows softly on side tables or consoles.",
    color: "Clear",
    materials: ["Glass", "LED"],
    style: "Contemporary",
    tags: ["christmas", "lamp", "tabletop", "ambient light"],
    rating: 4.4,
    review_count: 25,
    is_seed: true
  },
  {
    external_id: "XMAS-IKEA-001",
    merchant: "IKEA",
    product_name: "Striped Red and White Christmas Cushion Cover",
    category: "Seating",
    price: 14,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=80",
    product_url: "https://www.ikea.com/ca/en/p/xmas-ikea-001",
    description: "Simple striped cushion cover that works on sofas, benches, or beds.",
    color: "Red",
    materials: ["Cotton"],
    style: "Scandinavian",
    tags: ["christmas", "pillow cover", "sofa", "scandi"],
    rating: 4.2,
    review_count: 73,
    is_seed: true
  },
  {
    external_id: "XMAS-IKEA-002",
    merchant: "IKEA",
    product_name: "Set of 3 Paper Star Hanging Decorations",
    category: "Decor",
    price: 19,
    currency: "CAD",
    image_url: "/images/photo1764821193.jpg",
    product_url: "https://www.ikea.com/ca/en/p/xmas-ikea-002",
    description: "Foldable paper stars for windows, corners, and kids' rooms.",
    color: "White",
    materials: ["Paper"],
    style: "Scandinavian",
    tags: ["christmas", "paper star", "window decor"],
    rating: 4.3,
    review_count: 61,
    is_seed: true
  },
  {
    external_id: "XMAS-WF-001",
    merchant: "Wayfair",
    product_name: "Faux Fur Christmas Tree Collar in White",
    category: "Decor",
    price: 79,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512273222628-4daea6e55abb?w=800&q=80",
    product_url: "https://www.wayfair.ca/decor-xmas-wf-001",
    description: "Tree collar that hides the stand and works well with minimal living rooms.",
    color: "White",
    materials: ["Faux fur"],
    style: "Modern",
    tags: ["christmas", "tree collar", "neutral"],
    rating: 4.7,
    review_count: 94,
    is_seed: true
  },
  {
    external_id: "XMAS-WF-002",
    merchant: "Wayfair",
    product_name: "Christmas Garland for Staircase with Berries and Ribbon",
    category: "Decor",
    price: 89,
    currency: "CAD",
    image_url: "/images/photo1764821193.jpg",
    product_url: "https://www.wayfair.ca/decor-xmas-wf-002",
    description: "Full garland designed to drape along stair rails or long consoles.",
    color: "Green",
    materials: ["PVC", "Fabric"],
    style: "Traditional",
    tags: ["christmas", "garland", "staircase"],
    rating: 4.5,
    review_count: 121,
    is_seed: true
  }
];

// Extra Christmas seed products based on Pinterest inspiration images
const extraChristmasSeedProducts: SeedProduct[] = [
  // 1. Mini tree vignette on tray
  {
    external_id: "XMAS-AMZ-101",
    merchant: "Amazon",
    product_name: "18 inch Flocked Mini Christmas Tree with Warm White Lights",
    category: "Decor",
    price: 30,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1513639725746-c5d3e861f32a?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS101?tag=homablecrea03-20",
    description: "Compact flocked mini tree with warm LED lights, perfect for bathroom counters or small spaces",
    color: "White",
    materials: ["PVC", "Plastic"],
    style: "Cozy",
    tags: ["christmas", "mini tree", "bathroom decor", "tray vignette", "flocked"],
    rating: 4.6,
    review_count: 524,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-102",
    merchant: "Amazon",
    product_name: "Woven Round Seagrass Decorative Tray, 12 inch",
    category: "Decor",
    price: 26,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS102?tag=homablecrea03-20",
    description: "Natural seagrass tray for styling mini trees and holiday vignettes",
    color: "Natural",
    materials: ["Seagrass"],
    style: "Coastal",
    tags: ["tray", "seagrass", "vignette", "bathroom decor", "natural"],
    rating: 4.5,
    review_count: 311,
    is_seed: true
  },
  {
    external_id: "XMAS-WMT-101",
    merchant: "Walmart",
    product_name: "White Ceramic House Tealight Holder",
    category: "Decor",
    price: 19,
    currency: "CAD",
    image_url: "/images/TealightHolder.jpg",
    product_url: "https://www.walmart.ca/ip/ceramic-house-tealight/XMASWMT101",
    description: "Scandinavian-style ceramic house tealight holder for cozy Christmas ambiance",
    color: "White",
    materials: ["Ceramic"],
    style: "Scandinavian",
    tags: ["christmas", "tealight", "house", "white decor", "scandi"],
    rating: 4.4,
    review_count: 114,
    is_seed: true
  },

  // 2. Hallway with trees, runner, lanterns, reindeer
  {
    external_id: "XMAS-AMZ-103",
    merchant: "Amazon",
    product_name: "Pre-lit Artificial Christmas Tree, 6 ft, Warm White Lights",
    category: "Decor",
    price: 150,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS103?tag=homablecrea03-20",
    description: "6-foot pre-lit Christmas tree with warm white LEDs, ideal for hallways and entryways",
    color: "Green",
    materials: ["PVC", "Metal"],
    style: "Traditional",
    tags: ["christmas tree", "pre lit", "hallway", "6 foot"],
    rating: 4.5,
    review_count: 842,
    is_seed: true
  },
  {
    external_id: "XMAS-WF-101",
    merchant: "Wayfair",
    product_name: "Natural Jute Chevron Runner Rug, 2.5 x 10 ft",
    category: "Rugs",
    price: 130,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    product_url: "https://www.wayfair.ca/rugs/jute-chevron-runner-XMASWF101",
    description: "Long jute runner with chevron pattern for hallways and entryways",
    color: "Natural",
    materials: ["Jute"],
    style: "Modern Farmhouse",
    tags: ["runner", "hallway", "neutral rug", "jute"],
    rating: 4.6,
    review_count: 267,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-104",
    merchant: "Amazon",
    product_name: "Gold Metal LED Deer Figure, 30 inch",
    category: "Decor",
    price: 70,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1513171920216-2640b288471b?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS104?tag=homablecrea03-20",
    description: "Elegant gold LED deer figurine for hallway or entryway Christmas decor",
    color: "Gold",
    materials: ["Metal"],
    style: "Glam",
    tags: ["deer", "led", "hallway", "christmas decor", "reindeer"],
    rating: 4.4,
    review_count: 193,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-105",
    merchant: "Amazon",
    product_name: "Set of 4 Brass Finish Lanterns with Glass Panels",
    category: "Lighting",
    price: 85,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS105?tag=homablecrea03-20",
    description: "Classic brass lanterns with glass panels for hallway floor decor",
    color: "Brass",
    materials: ["Metal", "Glass"],
    style: "Classic",
    tags: ["lantern", "hallway", "floor decor", "brass"],
    rating: 4.5,
    review_count: 402,
    is_seed: true
  },

  // 3. Berry vase with ornaments in glass
  {
    external_id: "XMAS-AMZ-106",
    merchant: "Amazon",
    product_name: "Red Berry and Pine Mixed Stems, Set of 6",
    category: "Decor",
    price: 33,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS106?tag=homablecrea03-20",
    description: "Festive red berry and pine stems for vases and centerpieces",
    color: "Red",
    materials: ["Plastic", "Wire"],
    style: "Traditional",
    tags: ["christmas", "berry stems", "centerpiece", "vase filler"],
    rating: 4.6,
    review_count: 287,
    is_seed: true
  },
  {
    external_id: "XMAS-IKEA-101",
    merchant: "IKEA",
    product_name: "Clear Glass Round Vase, 10 inch",
    category: "Decor",
    price: 20,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&q=80",
    product_url: "https://www.ikea.com/ca/en/p/round-glass-vase-10-XMASIKEA101",
    description: "Simple clear glass vase for berry stems and ornament displays",
    color: "Clear",
    materials: ["Glass"],
    style: "Modern",
    tags: ["vase", "glass", "centerpiece", "clear"],
    rating: 4.4,
    review_count: 132,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-107",
    merchant: "Amazon",
    product_name: "Shatterproof Ornament Fillers, Red and Gold, 40 piece",
    category: "Decor",
    price: 25,
    currency: "CAD",
    image_url: "/images/ShatterproofOrnaments.jpg",
    product_url: "https://www.amazon.ca/dp/B09XMAS107?tag=homablecrea03-20",
    description: "Shatterproof ornaments in red and gold for vase fillers and bowls",
    color: "Red",
    materials: ["Plastic"],
    style: "Traditional",
    tags: ["ornaments", "vase filler", "red and gold", "shatterproof"],
    rating: 4.6,
    review_count: 518,
    is_seed: true
  },

  // 4. Coffee table with eucalyptus and berries
  {
    external_id: "XMAS-AMZ-108",
    merchant: "Amazon",
    product_name: "Faux Eucalyptus and Red Berry Garland, 6 ft",
    category: "Decor",
    price: 29,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS108?tag=homablecrea03-20",
    description: "Modern eucalyptus and berry garland for coffee tables and mantels",
    color: "Green",
    materials: ["Plastic"],
    style: "Modern",
    tags: ["garland", "coffee table", "berries", "eucalyptus"],
    rating: 4.5,
    review_count: 377,
    is_seed: true
  },
  {
    external_id: "XMAS-BOU-101",
    merchant: "Bouclair",
    product_name: "Textured Glass Votive Candle Holders, Set of 3",
    category: "Lighting",
    price: 20,
    currency: "CAD",
    image_url: "/images/TealightHolder.jpg",
    product_url: "https://www.bouclair.com/textured-votive-set-3-XMASBOU101",
    description: "Textured glass votives for cozy coffee table ambiance",
    color: "Clear",
    materials: ["Glass"],
    style: "Cozy",
    tags: ["votives", "candle", "coffee table", "glass"],
    rating: 4.3,
    review_count: 64,
    is_seed: true
  },

  // 5. Rustic table runner with pine, pinecones, brass candlesticks
  {
    external_id: "XMAS-AMZ-109",
    merchant: "Amazon",
    product_name: "Linen Look Ivory Table Runner, 14 x 108 inch",
    category: "Tables",
    price: 27,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1518176258769-f227c798150e?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS109?tag=homablecrea03-20",
    description: "Elegant ivory table runner with linen texture for Christmas dining",
    color: "Ivory",
    materials: ["Polyester"],
    style: "Farmhouse",
    tags: ["table runner", "christmas table", "ivory", "linen"],
    rating: 4.5,
    review_count: 221,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-110",
    merchant: "Amazon",
    product_name: "Gold Taper Candle Holders, Set of 5 Heights",
    category: "Decor",
    price: 33,
    currency: "CAD",
    image_url: "/images/TealightHolder.jpg",
    product_url: "https://www.amazon.ca/dp/B09XMAS110?tag=homablecrea03-20",
    description: "Brass taper candle holders in varying heights for elegant centerpieces",
    color: "Gold",
    materials: ["Metal"],
    style: "Classic",
    tags: ["candle holders", "taper candles", "centerpiece", "brass"],
    rating: 4.7,
    review_count: 612,
    is_seed: true
  },
  {
    external_id: "XMAS-WMT-102",
    merchant: "Walmart",
    product_name: "Faux Pine Branches with Pinecones, 6 piece bundle",
    category: "Decor",
    price: 23,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.walmart.ca/ip/pine-branches-pinecones/XMASWMT102",
    description: "Realistic pine branches with pinecones for rustic table decor",
    color: "Green",
    materials: ["Plastic"],
    style: "Rustic",
    tags: ["pine branches", "pinecones", "table decor", "rustic"],
    rating: 4.4,
    review_count: 143,
    is_seed: true
  },

  // 6. Stair garland with burlap and lanterns
  {
    external_id: "XMAS-AMZ-111",
    merchant: "Amazon",
    product_name: "9 ft Prelit Staircase Garland with Red Berries and Pinecones",
    category: "Decor",
    price: 50,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS111?tag=homablecrea03-20",
    description: "Pre-lit staircase garland with berries and pinecones for farmhouse style",
    color: "Green",
    materials: ["PVC"],
    style: "Farmhouse",
    tags: ["stair garland", "berries", "pinecones", "pre-lit"],
    rating: 4.6,
    review_count: 459,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-112",
    merchant: "Amazon",
    product_name: "Extra Wide Burlap Ribbon, 8 inch x 10 yd, Natural",
    category: "Decor",
    price: 18,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS112?tag=homablecrea03-20",
    description: "Wide natural burlap ribbon for making large bows and staircase decor",
    color: "Natural",
    materials: ["Jute"],
    style: "Rustic",
    tags: ["ribbon", "bows", "staircase", "burlap"],
    rating: 4.5,
    review_count: 207,
    is_seed: true
  },
  {
    external_id: "XMAS-WF-102",
    merchant: "Wayfair",
    product_name: "Tall Black Metal Lanterns with Glass, Set of 2",
    category: "Lighting",
    price: 100,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80",
    product_url: "https://www.wayfair.ca/lighting/black-lantern-set-2-XMASWF102",
    description: "Modern farmhouse black lanterns for stair landings and entryways",
    color: "Black",
    materials: ["Metal", "Glass"],
    style: "Modern Farmhouse",
    tags: ["lantern", "stair landing", "candles", "black"],
    rating: 4.4,
    review_count: 188,
    is_seed: true
  },

  // 7. Mantel with Christmas village and garland
  {
    external_id: "XMAS-AMZ-113",
    merchant: "Amazon",
    product_name: "Wooden Christmas Village House Set with LED Lights, 10 piece",
    category: "Decor",
    price: 65,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS113?tag=homablecrea03-20",
    description: "Charming wooden village houses with LED lights for mantel displays",
    color: "Natural",
    materials: ["Wood"],
    style: "Cozy",
    tags: ["christmas village", "mantel decor", "wooden houses", "led"],
    rating: 4.6,
    review_count: 329,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-114",
    merchant: "Amazon",
    product_name: "Snow Flocked Mantel Garland with Lights, 6 ft",
    category: "Decor",
    price: 46,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS114?tag=homablecrea03-20",
    description: "Snow-flocked garland with warm lights for traditional mantel styling",
    color: "White",
    materials: ["PVC"],
    style: "Traditional",
    tags: ["mantel garland", "snow flocked", "pre-lit", "white"],
    rating: 4.5,
    review_count: 403,
    is_seed: true
  },

  // 8. Lanterns with mini trees inside
  {
    external_id: "XMAS-WMT-103",
    merchant: "Walmart",
    product_name: "Set of 3 White Metal Lanterns, Nested",
    category: "Lighting",
    price: 75,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80",
    product_url: "https://www.walmart.ca/ip/white-nested-lanterns/XMASWMT103",
    description: "Nested white metal lanterns for tabletop Christmas displays",
    color: "White",
    materials: ["Metal", "Glass"],
    style: "Farmhouse",
    tags: ["lantern trio", "tabletop", "centerpiece", "white"],
    rating: 4.3,
    review_count: 119,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-115",
    merchant: "Amazon",
    product_name: "Bottle Brush Christmas Trees, Flocked Green, Set of 6",
    category: "Decor",
    price: 22,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS115?tag=homablecrea03-20",
    description: "Vintage-style bottle brush trees for lantern fillers and village displays",
    color: "Green",
    materials: ["Plastic", "Wood"],
    style: "Vintage",
    tags: ["bottle brush trees", "village", "lantern filler", "mini trees"],
    rating: 4.6,
    review_count: 298,
    is_seed: true
  },

  // 9. Champagne gold mantel garland with big bows
  {
    external_id: "XMAS-AMZ-116",
    merchant: "Amazon",
    product_name: "Champagne Gold Ribbon, 4 inch x 10 yd, Wired",
    category: "Decor",
    price: 19,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS116?tag=homablecrea03-20",
    description: "Wired champagne gold ribbon for creating elegant oversized bows",
    color: "Champagne",
    materials: ["Polyester"],
    style: "Glam",
    tags: ["big bows", "mantel decor", "champagne", "ribbon"],
    rating: 4.5,
    review_count: 254,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-117",
    merchant: "Amazon",
    product_name: "Extra Long Cedar Garland, 9 ft, Warm White Lights",
    category: "Decor",
    price: 53,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS117?tag=homablecrea03-20",
    description: "Lush cedar garland with warm lights for glamorous mantel styling",
    color: "Green",
    materials: ["PVC"],
    style: "Traditional",
    tags: ["cedar garland", "mantel", "champagne decor", "pre-lit"],
    rating: 4.6,
    review_count: 371,
    is_seed: true
  },

  // 10. TV wall with large green velvet bows and garland
  {
    external_id: "XMAS-AMZ-118",
    merchant: "Amazon",
    product_name: "Oversized Green Velvet Christmas Bows, Set of 3",
    category: "Decor",
    price: 36,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS118?tag=homablecrea03-20",
    description: "Large emerald green velvet bows for TV walls and console garlands",
    color: "Green",
    materials: ["Velvet"],
    style: "Modern",
    tags: ["oversized bows", "tv wall", "garland", "velvet"],
    rating: 4.5,
    review_count: 188,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-119",
    merchant: "Amazon",
    product_name: "Prelit Greenery Garland with Mixed Ornaments, 9 ft",
    category: "Decor",
    price: 60,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS119?tag=homablecrea03-20",
    description: "Pre-lit garland with mixed ornaments for modern TV console styling",
    color: "Green",
    materials: ["PVC"],
    style: "Modern",
    tags: ["tv console", "garland", "ornaments", "pre-lit"],
    rating: 4.4,
    review_count: 264,
    is_seed: true
  }
];

// Combine base products with extra products
const allChristmasSeedProducts = [...baseChristmasSeedProducts, ...extraChristmasSeedProducts];

// Expand to create variants
const christmasSeedProducts: SeedProduct[] = allChristmasSeedProducts.flatMap((product) => {
  const variants: SeedProduct[] = [product];

  // Create color variants for Decor and Seating
  if (product.category === "Decor" || product.category === "Seating") {
    const colors = ["Silver", "Gold", "White", "Navy"];
    const colorVariant = colors[Math.floor(Math.random() * colors.length)];
    
    variants.push({
      ...product,
      external_id: `${product.external_id}-CLR1`,
      price: product.price + 5,
      color: colorVariant,
      product_name: `${product.product_name} - ${colorVariant} Edition`,
      tags: product.tags ? [...product.tags, "variant", colorVariant.toLowerCase()] : ["variant"],
    });
  }

  // Create size/style variants for Lighting
  if (product.category === "Lighting") {
    variants.push({
      ...product,
      external_id: `${product.external_id}-SZ1`,
      price: product.price + 10,
      product_name: `${product.product_name} - Extended Length`,
      description: `${product.description} Extended version for larger spaces.`,
      tags: product.tags ? [...product.tags, "variant", "extended"] : ["variant", "extended"],
    });
  }

  // Create premium variants for higher-priced items
  if (product.price > 40) {
    variants.push({
      ...product,
      external_id: `${product.external_id}-PREM`,
      price: Math.round(product.price * 1.3),
      product_name: `${product.product_name} - Premium Collection`,
      description: `${product.description} Premium quality with enhanced features.`,
      rating: product.rating ? Math.min(product.rating + 0.2, 5.0) : 4.8,
      tags: product.tags ? [...product.tags, "premium", "luxury"] : ["premium", "luxury"],
    });
  }

  // Create bundle variants for some products
  if (product.category === "Decor" && Math.random() > 0.5) {
    variants.push({
      ...product,
      external_id: `${product.external_id}-BDL`,
      price: Math.round(product.price * 1.8),
      product_name: `${product.product_name} - Family Bundle`,
      description: `${product.description} Comes in a set of 3 for coordinated decor.`,
      tags: product.tags ? [...product.tags, "bundle", "set"] : ["bundle", "set"],
    });
  }

  return variants;
});

console.log(`Generated ${christmasSeedProducts.length} total products from ${allChristmasSeedProducts.length} base products (${baseChristmasSeedProducts.length} original + ${extraChristmasSeedProducts.length} extra)`);

async function seedChristmasProducts() {
  console.log('Starting to seed Christmas products...');

  try {
    // Check if products exist first, then update or insert individually
    let insertedCount = 0;
    let updatedCount = 0;

    for (const product of christmasSeedProducts) {
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
        } else {
          insertedCount++;
        }
      }

      // Progress indicator
      if ((insertedCount + updatedCount) % 10 === 0) {
        console.log(`Progress: ${insertedCount + updatedCount}/${christmasSeedProducts.length} products processed...`);
      }
    }

    console.log(`\n✅ Successfully processed ${insertedCount + updatedCount} Christmas products!`);
    console.log(`   - Inserted: ${insertedCount} new products`);
    console.log(`   - Updated: ${updatedCount} existing products`);
    console.log(`📊 Total products in seed: ${christmasSeedProducts.length}`);

    // Verify the count
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_seed', true);

    if (countError) {
      console.error('Error counting seed products:', countError);
    } else {
      console.log(`\n📈 Total products with is_seed=true in database: ${count}`);
    }

    // Show category breakdown
    const { data: categories, error: catError } = await supabase
      .from('products')
      .select('category')
      .eq('is_seed', true);

    if (!catError && categories) {
      const categoryCount = categories.reduce((acc: Record<string, number>, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});
      console.log('\n📦 Category breakdown:');
      Object.entries(categoryCount).forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count} products`);
      });
    }

  } catch (error) {
    console.error('Failed to seed products:', error);
    process.exit(1);
  }
}

seedChristmasProducts();