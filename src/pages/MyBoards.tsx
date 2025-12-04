import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBoards, deleteBoard } from '@/lib/api';
import { Board } from '@/lib/types';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

export default function MyBoards() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data);
    } catch (error) {
      console.error('Error loading boards:', error);
      toast.error('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this board?')) {
      return;
    }

    try {
      await deleteBoard(boardId);
      setBoards(boards.filter((b) => b.id !== boardId));
      toast.success('Board deleted');
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete board');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <LoadingSpinner message="Loading your history..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-stone-50">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h1 className="text-4xl font-bold text-[#111111]">My History</h1>
            <Button 
              size="lg" 
              onClick={() => navigate('/upload')}
              className="bg-[#C89F7A] hover:bg-[#B5896C] text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Analysis
            </Button>
          </div>

          {boards.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-xl">
              <p className="text-[#555555] mb-4">
                You haven't analyzed any rooms yet.
              </p>
              <Button 
                onClick={() => navigate('/upload')}
                className="bg-[#C89F7A] hover:bg-[#B5896C] text-white"
              >
                Analyze Your First Room
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board) => (
                <Card
                  key={board.id}
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow rounded-3xl border-0"
                  onClick={() => navigate(`/item-detection/${board.id}`)}
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={board.cover_image_url || board.source_image_url}
                      alt={board.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-xl mb-2 text-[#111111]">{board.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="outline"
                        className={
                          board.status === 'analyzed' 
                            ? 'border-green-500 text-green-700' 
                            : board.status === 'analyzing'
                            ? 'border-yellow-500 text-yellow-700'
                            : 'border-gray-500 text-gray-700'
                        }
                      >
                        {board.status === 'analyzed' ? 'Ready' : board.status === 'analyzing' ? 'Processing' : 'Draft'}
                      </Badge>
                      {board.detected_items_count > 0 && (
                        <Badge variant="outline" className="border-[#C89F7A] text-[#C89F7A]">
                          {board.detected_items_count} items
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#555555] mt-1">
                      Created {new Date(board.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-[#C89F7A] text-[#C89F7A] hover:bg-[#C89F7A] hover:text-white rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/item-detection/${board.id}`);
                      }}
                    >
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-full"
                      onClick={(e) => handleDeleteBoard(board.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer Disclaimer */}
        <footer className="max-w-7xl mx-auto mt-16 text-center">
          <p className="text-xs text-[#888888] leading-relaxed">
            Homable Creations provides product recommendations but is not responsible for pricing changes, 
            product availability, or fulfillment by third-party retailers.
          </p>
        </footer>
      </main>
    </div>
  );
}