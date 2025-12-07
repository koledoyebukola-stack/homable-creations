import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  product_name: string;
  product_url: string;
  image_url: string;
  price: number;
  merchant: string;
  category: string;
}

export default function PopularProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        // Fetch 6 random seed products from the database
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_seed', true)
          .limit(100); // Get a larger pool to randomize from

        if (error) throw error;

        if (data && data.length > 0) {
          // Shuffle and select 6 products
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setProducts(shuffled.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching popular products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <a
          key={product.id}
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 h-full">
            <div className="aspect-square overflow-hidden bg-gray-50">
              <img
                src={product.image_url}
                alt={product.product_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-[#111111] line-clamp-2 mb-2 group-hover:text-[#C89F7A] transition-colors">
                {product.product_name}
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-[#111111]">
                    ${product.price.toFixed(2)}
                  </p>
                  <p className="text-sm text-[#888888]">{product.merchant}</p>
                </div>
                <ExternalLink className="h-5 w-5 text-[#888888] group-hover:text-[#C89F7A] transition-colors" />
              </div>
            </div>
          </Card>
        </a>
      ))}
    </div>
  );
}