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

// Ornament-specific seed products
const ornamentSeedProducts: SeedProduct[] = [
  // Silver round glass ornaments
  {
    external_id: "XMAS-AMZ-201",
    merchant: "Amazon",
    product_name: "Silver Round Glass Ornament Set, 24 piece",
    category: "Decor",
    price: 28,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.amazon.ca/dp/B09XMAS201?tag=homablecrea03-20",
    description: "Classic silver round glass ornaments ideal for modern holiday decor and tree styling",
    color: "Silver",
    materials: ["Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "silver", "round", "glass", "tree decor", "modern"],
    rating: 4.7,
    review_count: 412,
    is_seed: true
  },
  {
    external_id: "XMAS-WMT-201",
    merchant: "Walmart",
    product_name: "Shiny Silver Glass Ball Ornaments, 12 pack",
    category: "Decor",
    price: 22,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.walmart.ca/ip/silver-glass-ornaments/XMASWMT201",
    description: "Reflective silver glass ball ornaments perfect for contemporary Christmas trees",
    color: "Silver",
    materials: ["Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "silver", "round", "glass", "shiny", "ball"],
    rating: 4.5,
    review_count: 287,
    is_seed: true
  },

  // Gold geometric glass ornaments
  {
    external_id: "XMAS-AMZ-202",
    merchant: "Amazon",
    product_name: "Gold Geometric Glass Ornament Set, 18 piece",
    category: "Decor",
    price: 32,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.amazon.ca/dp/B09XMAS202?tag=homablecrea03-20",
    description: "Striking gold geometric glass ornaments with modern faceted design for festive displays",
    color: "Gold",
    materials: ["Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "gold", "geometric", "glass", "modern", "faceted"],
    rating: 4.6,
    review_count: 324,
    is_seed: true
  },
  {
    external_id: "XMAS-WF-201",
    merchant: "Wayfair",
    product_name: "Gold Diamond-Cut Glass Ornaments, Set of 12",
    category: "Decor",
    price: 35,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.wayfair.ca/decor/gold-geometric-ornaments-XMASWF201",
    description: "Elegant gold geometric ornaments with diamond-cut patterns for sophisticated holiday styling",
    color: "Gold",
    materials: ["Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "gold", "geometric", "glass", "diamond cut", "elegant"],
    rating: 4.7,
    review_count: 198,
    is_seed: true
  },

  // White round glass ornaments
  {
    external_id: "XMAS-AMZ-203",
    merchant: "Amazon",
    product_name: "White Round Glass Ornament Set, 24 piece",
    category: "Decor",
    price: 26,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.amazon.ca/dp/B09XMAS203?tag=homablecrea03-20",
    description: "Beautiful white round glass ornaments to enhance seasonal decor with clean modern aesthetic",
    color: "White",
    materials: ["Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "white", "round", "glass", "clean", "minimalist"],
    rating: 4.6,
    review_count: 356,
    is_seed: true
  },
  {
    external_id: "XMAS-IKEA-201",
    merchant: "IKEA",
    product_name: "Matte White Glass Ball Ornaments, 16 pack",
    category: "Decor",
    price: 18,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.ikea.com/ca/en/p/white-glass-ornaments-XMASIKEA201",
    description: "Scandinavian-style matte white glass ornaments for minimalist Christmas trees",
    color: "White",
    materials: ["Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "white", "round", "glass", "matte", "scandi"],
    rating: 4.4,
    review_count: 221,
    is_seed: true
  },

  // Black ribbon for hanging ornaments
  {
    external_id: "XMAS-AMZ-204",
    merchant: "Amazon",
    product_name: "Black Velvet Ribbon for Ornaments, 3/8 inch x 50 yd",
    category: "Decor",
    price: 15,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS204?tag=homablecrea03-20",
    description: "Sleek black velvet ribbon designed for securely hanging ornaments with minimalist style",
    color: "Black",
    materials: ["Velvet", "Polyester"],
    style: "Minimalist",
    tags: ["christmas", "ribbon", "black", "velvet", "ornament hanger", "minimalist"],
    rating: 4.7,
    review_count: 489,
    is_seed: true
  },
  {
    external_id: "XMAS-AMZ-205",
    merchant: "Amazon",
    product_name: "Black Satin Ribbon for Hanging Ornaments, 1/4 inch x 100 yd",
    category: "Decor",
    price: 12,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.amazon.ca/dp/B09XMAS205?tag=homablecrea03-20",
    description: "Premium black satin ribbon perfect for hanging glass ornaments on modern Christmas trees",
    color: "Black",
    materials: ["Satin", "Polyester"],
    style: "Minimalist",
    tags: ["christmas", "ribbon", "black", "satin", "ornament hanger", "sleek"],
    rating: 4.6,
    review_count: 367,
    is_seed: true
  },
  {
    external_id: "XMAS-WMT-202",
    merchant: "Walmart",
    product_name: "Black Grosgrain Ribbon for Ornaments, 3/8 inch x 25 yd",
    category: "Decor",
    price: 10,
    currency: "CAD",
    image_url: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80",
    product_url: "https://www.walmart.ca/ip/black-grosgrain-ribbon/XMASWMT202",
    description: "Durable black grosgrain ribbon for hanging ornaments with clean minimalist look",
    color: "Black",
    materials: ["Grosgrain", "Polyester"],
    style: "Minimalist",
    tags: ["christmas", "ribbon", "black", "grosgrain", "ornament hanger", "durable"],
    rating: 4.5,
    review_count: 198,
    is_seed: true
  },

  // Metallic green decoration balls
  {
    external_id: "XMAS-AMZ-206",
    merchant: "Amazon",
    product_name: "Metallic Green Decoration Ball Ornaments, 24 piece",
    category: "Decor",
    price: 29,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.amazon.ca/dp/B09XMAS206?tag=homablecrea03-20",
    description: "Shiny metallic green ball ornaments perfect for adding a touch of elegance to holiday decor",
    color: "Green",
    materials: ["Metal", "Plastic"],
    style: "Modern",
    tags: ["christmas", "ornaments", "green", "metallic", "ball", "shiny", "elegant"],
    rating: 4.6,
    review_count: 412,
    is_seed: true
  },
  {
    external_id: "XMAS-BOU-201",
    merchant: "Bouclair",
    product_name: "Emerald Green Metallic Ornament Set, 18 piece",
    category: "Decor",
    price: 31,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.bouclair.com/emerald-metallic-ornaments-XMASBOU201",
    description: "Luxurious emerald green metallic ornaments with high-shine finish for modern Christmas styling",
    color: "Green",
    materials: ["Metal", "Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "green", "metallic", "emerald", "luxe", "shiny"],
    rating: 4.7,
    review_count: 267,
    is_seed: true
  },

  // Additional color variants for better matching
  {
    external_id: "XMAS-AMZ-207",
    merchant: "Amazon",
    product_name: "Mixed Metallic Ornament Set - Silver, Gold, White, 36 piece",
    category: "Decor",
    price: 34,
    currency: "CAD",
    image_url: "/images/photo1764826282.jpg",
    product_url: "https://www.amazon.ca/dp/B09XMAS207?tag=homablecrea03-20",
    description: "Coordinated set of silver, gold, and white glass ornaments for cohesive modern tree styling",
    color: "Mixed",
    materials: ["Glass"],
    style: "Modern",
    tags: ["christmas", "ornaments", "silver", "gold", "white", "mixed", "coordinated"],
    rating: 4.8,
    review_count: 521,
    is_seed: true
  }
];

console.log(`Generated ${ornamentSeedProducts.length} ornament-specific seed products`);

async function seedOrnamentProducts() {
  console.log('Starting to seed ornament products...');

  try {
    let insertedCount = 0;
    let updatedCount = 0;

    for (const product of ornamentSeedProducts) {
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
    }

    console.log(`\n✅ Successfully processed ${insertedCount + updatedCount} ornament products!`);
    console.log(`   - Inserted: ${insertedCount} new products`);
    console.log(`   - Updated: ${updatedCount} existing products`);

    // Verify the total count
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_seed', true);

    if (countError) {
      console.error('Error counting seed products:', countError);
    } else {
      console.log(`\n📈 Total products with is_seed=true in database: ${count}`);
    }

  } catch (error) {
    console.error('Failed to seed ornament products:', error);
    process.exit(1);
  }
}

seedOrnamentProducts();