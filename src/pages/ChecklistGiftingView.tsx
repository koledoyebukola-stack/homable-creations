import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChecklistByGiftingToken, claimChecklistItem } from '@/lib/api';
import { ChecklistWithItems, Board } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  ArrowLeft,
  Gift,
  CheckCircle2,
  Calendar,
  User
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClaimModal from '@/components/ClaimModal';
import { toast } from 'sonner';
import { getBoards } from '@/lib/api';

export default function ChecklistGiftingView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistWithItems | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [currentItemName, setCurrentItemName] = useState('');

  useEffect(() => {
    if (token) {
      loadChecklist();
    }
  }, [token]);

  const loadChecklist = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getChecklistByGiftingToken(token);
      if (!data) {
        setError('Shopping list not found or gifting is not enabled');
        return;
      }
      setChecklist(data);

      // Load board info if board_id exists
      if (data.board_id) {
        try {
          const boards = await getBoards();
          const foundBoard = boards.find(b => b.id === data.board_id);
          if (foundBoard) {
            setBoard(foundBoard);
          }
        } catch (err) {
          // Board loading is optional, don't fail if it errors
          console.warn('Failed to load board info:', err);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load shopping list:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimClick = (itemId: string, itemName: string) => {
    setCurrentItemName(itemName);
    setClaimingItemId(itemId);
    setShowClaimModal(true);
  };

  const handleClaimConfirm = async (name: string, expectedDate?: string, giftNote?: string) => {
    if (!claimingItemId || !checklist) return;

    try {
      await claimChecklistItem(claimingItemId, name, expectedDate, giftNote);
      toast.success('Item claimed successfully! 🎉');
      
      // Reload checklist to show updated status
      await loadChecklist();
      
      setShowClaimModal(false);
      setClaimingItemId(null);
      setCurrentItemName('');
    } catch (err: unknown) {
      console.error('Failed to claim item:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to claim item. It may have already been claimed.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Shopping list not found'}</p>
            <Button onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Filter items: pending (unclaimed) and claimed items
  // Handle both old items (is_completed only) and new items (status field)
  const pendingItems = checklist.items.filter(item => {
    const isPending = item.status === 'pending' || (!item.status && !item.is_completed);
    const isUnclaimed = !item.claimed_by_name;
    return isPending && isUnclaimed;
  });
  
  const claimedItems = checklist.items.filter(item => {
    const isClaimed = item.status === 'claimed' || (item.claimed_by_name && !item.is_completed);
    const isNotCompleted = item.status !== 'completed' && !item.is_completed;
    return isClaimed && isNotCompleted;
  });
  
  const completedItems = checklist.items.filter(item => 
    item.status === 'completed' || item.is_completed
  );
  
  // Progress calculation: only completed items count
  const progressPercent = checklist.total_count > 0
    ? Math.round((checklist.completed_count / checklist.total_count) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* Inspiration Image (if available) */}
        {board?.source_image_url && (
          <div className="mb-6 flex justify-center">
            <img
              src={board.source_image_url}
              alt="Original Inspiration"
              className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-2xl shadow-lg border-2 border-white"
            />
          </div>
        )}

        {/* Checklist Header Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-[#C89F7A]" />
              <CardTitle className="text-2xl font-bold text-[#111111]">
                {checklist.name}
              </CardTitle>
            </div>
            <p className="text-sm text-gray-500">
              Help complete this shopping list by claiming items
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Progress Summary */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-700">
                  {checklist.completed_count} of {checklist.total_count} items bought
                </span>
                <span className="text-lg font-bold text-[#2F9E44]">
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-3 [&>div]:bg-[#2F9E44]" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Items Section (unclaimed) */}
        {pendingItems.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#111111]">
                Available Items ({pendingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingItems.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-[#111111]">
                          {item.item_name}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleClaimClick(item.id, item.item_name)}
                        className="bg-[#111111] hover:bg-[#333333] text-white shrink-0"
                        size="sm"
                      >
                        <Gift className="h-4 w-4 mr-1" />
                        Claim
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claimed Items Section */}
        {claimedItems.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#111111]">
                Claimed Items ({claimedItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {claimedItems.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#C89F7A] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-[#111111] mb-1">
                          {item.item_name}
                        </p>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Claimed by {item.claimed_by_name}</span>
                          </div>
                          {item.expected_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Expected by {formatDate(item.expected_date)}</span>
                            </div>
                          )}
                          {item.gift_note && (
                            <p className="text-gray-500 italic mt-1">
                              "{item.gift_note}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Items Section */}
        {completedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-600">
                Completed Items ({completedItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedItems.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#2F9E44] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-[#6A6A6A] line-through">
                          {item.item_name}
                        </p>
                        {item.gift_note && (
                          <p className="text-sm text-gray-500 italic mt-1">
                            "{item.gift_note}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <ClaimModal
        isOpen={showClaimModal}
        onClose={() => {
          setShowClaimModal(false);
          setClaimingItemId(null);
          setCurrentItemName('');
        }}
        onConfirm={handleClaimConfirm}
        itemName={currentItemName}
      />

      <Footer />
    </div>
  );
}
