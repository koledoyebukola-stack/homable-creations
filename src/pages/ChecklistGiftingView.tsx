import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChecklistByGiftingToken, claimChecklistItem, updateClaim, unclaimItem, linkClaimToUser } from '@/lib/api';
import { ChecklistWithItems, ChecklistItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Loader2, 
  ArrowLeft,
  Gift,
  CheckCircle2,
  Calendar,
  User,
  Search,
  ExternalLink,
  Instagram,
  Pencil,
  ChevronDown
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClaimModal from '@/components/ClaimModal';
import EditClaimModal from '@/components/EditClaimModal';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// Helper function to get Instagram search URL
const getInstagramSearchUrl = (itemName: string): string => {
  const encodedQuery = encodeURIComponent(itemName);
  return `https://www.instagram.com/explore/search/keyword/?q=${encodedQuery}`;
};

export default function ChecklistGiftingView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<(ChecklistWithItems & { board_image_url?: string; board_name?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [currentItemName, setCurrentItemName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState<{ name: string; expectedDate?: string; giftNote?: string; claimedByName: string } | null>(null);
  const [inspirationLightboxOpen, setInspirationLightboxOpen] = useState(false);

  // Set Open Graph meta tags for social sharing
  useEffect(() => {
    if (checklist) {
      const title = 'Help me complete my home';
      const description = 'Pick an item from my list and help me set up my space';
      const image = checklist.board_image_url || '';
      const url = window.location.href;

      // Update or create meta tags
      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      updateMetaTag('og:title', title);
      updateMetaTag('og:description', description);
      updateMetaTag('og:url', url);
      if (image) {
        updateMetaTag('og:image', image);
      }
      updateMetaTag('og:type', 'website');
    }
  }, [checklist]);

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
      // Check if user is signed in and link the claim
      const { data: { user } } = await supabase.auth.getUser();
      
      await claimChecklistItem(claimingItemId, name, expectedDate, giftNote);
      
      // Store claim info in localStorage for later linking if user signs in
      if (!user) {
        const claimInfo = {
          itemId: claimingItemId,
          checklistId: checklist.id,
          giftingToken: token, // Store token to fetch checklist later
          claimedByName: name,
          timestamp: Date.now(),
        };
        const existingClaims = JSON.parse(localStorage.getItem('unlinked_claims') || '[]');
        existingClaims.push(claimInfo);
        localStorage.setItem('unlinked_claims', JSON.stringify(existingClaims));
      } else {
        // If user is signed in, link the claim to their account
        try {
          await linkClaimToUser(claimingItemId, name);
        } catch (linkError) {
          console.warn('Failed to link claim to user:', linkError);
          // Non-critical error, continue
        }
      }
      
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

  const handleEditClick = (item: any) => {
    setCurrentEditingItem({
      name: item.item_name,
      expectedDate: item.expected_date,
      giftNote: item.gift_note,
      claimedByName: item.claimed_by_name || '',
    });
    setEditingItemId(item.id);
    setShowEditModal(true);
  };

  const handleUpdateClaim = async (expectedDate?: string, giftNote?: string) => {
    if (!editingItemId || !checklist || !currentEditingItem) return;

    try {
      await updateClaim(editingItemId, expectedDate, giftNote, currentEditingItem.claimedByName);
      toast.success('Claim updated successfully!');
      // Clear editing state
      setEditingItemId(null);
      setCurrentEditingItem(null);
      setShowEditModal(false);
      // Reload checklist to show updated state
      await loadChecklist();
    } catch (err: unknown) {
      console.error('Failed to update claim:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update claim');
      throw err;
    }
  };

  const handleUnclaim = async () => {
    if (!editingItemId || !checklist || !currentEditingItem) return;

    try {
      await unclaimItem(editingItemId, currentEditingItem.claimedByName);
      toast.success('Item unclaimed - it is now available for others to claim');
      // Clear editing state
      setEditingItemId(null);
      setCurrentEditingItem(null);
      setShowEditModal(false);
      // Reload checklist to show updated state
      await loadChecklist();
    } catch (err: unknown) {
      console.error('Failed to unclaim item:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to unclaim item');
      throw err;
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

  const isNigerianExplore = !!checklist.explore_scene_id;

  const renderItemActions = (item: ChecklistItem) => {
    const openGoogle = () => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.item_name)}`, '_blank');
    const googleItem = (
      <DropdownMenuItem onClick={openGoogle}>
        <Search className="mr-2 h-4 w-4" />
        Search on Google
      </DropdownMenuItem>
    );
    if (isNigerianExplore) {
      if (item.vendor_product_slug) {
        return (
          <div className="flex gap-0 shrink-0">
            <Button size="sm" variant="outline" onClick={() => navigate(`/shops/products/${item.vendor_product_slug}`)} className="rounded-r-none border-r-0">
              View Product
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="px-2 rounded-l-none">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {googleItem}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
      if (item.instagram_handle) {
        const handle = String(item.instagram_handle).replace(/^@/, '');
        return (
          <div className="flex gap-0 shrink-0">
            <Button size="sm" variant="outline" onClick={() => window.open(`https://instagram.com/${handle}`, '_blank')} className="rounded-r-none border-r-0">
              View on Instagram
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="px-2 rounded-l-none">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {googleItem}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
      return (
        <div className="flex gap-0 shrink-0">
          <Button size="sm" variant="outline" onClick={openGoogle} className="rounded-r-none border-r-0">
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2 rounded-l-none">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {googleItem}
              <DropdownMenuItem onClick={() => window.open(getInstagramSearchUrl(item.item_name), '_blank')}>
                <Instagram className="mr-2 h-4 w-4" />
                Instagram Search
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {googleItem}
          <DropdownMenuItem onClick={() => window.open(getInstagramSearchUrl(item.item_name), '_blank')}>
            <Instagram className="mr-2 h-4 w-4" />
            Instagram Search
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
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

        {/* Inspiration Image (if available) — click to view full size */}
        {checklist.board_image_url && (
          <div className="mb-6 flex justify-center">
            <button
              type="button"
              onClick={() => setInspirationLightboxOpen(true)}
              className="focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              aria-label="View full inspiration photo"
            >
              <img
                src={checklist.board_image_url}
                alt="Original Inspiration — click to view full size"
                className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-2xl shadow-lg border-2 border-white"
              />
            </button>
            <Dialog open={inspirationLightboxOpen} onOpenChange={setInspirationLightboxOpen}>
              <DialogContent className="max-w-[95vw] max-h-[90vh] w-auto p-0 border-0 bg-black/95 gap-0 overflow-hidden [&>button]:right-2 [&>button]:top-2 [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:h-9 [&>button]:w-9">
                <img
                  src={checklist.board_image_url}
                  alt="Original Inspiration"
                  className="max-w-full max-h-[85vh] w-auto h-auto object-contain mx-auto block"
                />
              </DialogContent>
            </Dialog>
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
                      <div className="flex items-center gap-2 shrink-0">
                        {renderItemActions(item)}
                        <Button
                          onClick={() => handleClaimClick(item.id, item.item_name)}
                          className="bg-[#111111] hover:bg-[#333333] text-white"
                          size="sm"
                        >
                          <Gift className="h-4 w-4 mr-1" />
                          Claim
                        </Button>
                      </div>
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
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(item)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {renderItemActions(item)}
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

      {currentEditingItem && (
        <EditClaimModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingItemId(null);
            setCurrentEditingItem(null);
          }}
          onUpdate={handleUpdateClaim}
          onUnclaim={handleUnclaim}
          itemName={currentEditingItem.name}
          currentExpectedDate={currentEditingItem.expectedDate}
          currentGiftNote={currentEditingItem.giftNote}
          claimedByName={currentEditingItem.claimedByName}
        />
      )}

      <Footer />
    </div>
  );
}
