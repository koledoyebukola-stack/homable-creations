import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { toast } from 'sonner';
import { ExternalLink, Star } from 'lucide-react';

export default function RoomBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!boardId) return;

    const loadData = async () => {
      try {
        const { data: board } = await supabase
          .from('boards')
          .select('name')
          .eq('id', boardId)
          .single();

        if (board) {
          setBoardName(board.name);
        }

        // For now, just redirect to item detection page
        // This page can be enhanced later with saved items functionality
        navigate(`/item-detection/${boardId}`);
      } catch (error) {
        console.error('Error loading board:', error);
        toast.error('Failed to load board');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [boardId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <LoadingSpinner message="Loading your board..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 text-[#111111]">{boardName}</h1>
            <p className="text-[#555555]">Redirecting to results...</p>
          </div>
        </div>
      </main>
    </div>
  );
}