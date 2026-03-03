import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChecklistById, updateChecklistItem, updateChecklistName, deleteChecklist, getBoards, enableGifting, addChecklistItem, deleteChecklistItem } from '@/lib/api';
import { ChecklistWithItems, Board, ChecklistItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  ArrowLeft, 
  Pencil, 
  Check, 
  X, 
  Trash2,
  PartyPopper,
  Share2,
  MoreVertical,
  Search,
  ExternalLink,
  Gift,
  Users,
  Calendar,
  User,
  Copy,
  CheckCircle2,
  Plus,
  ChevronDown,
  Instagram
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareModal from '@/components/ShareModal';
import { toast } from 'sonner';
import { trackNgEvent, NG_EVENTS } from '@/lib/analytics-ng';

// Detect user location and return appropriate retailer domains
function getLocalizedRetailers() {
  // Try to detect location from browser
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isCanada = timezone.includes('America') && (
    timezone.includes('Toronto') || 
    timezone.includes('Vancouver') || 
    timezone.includes('Montreal') ||
    timezone.includes('Edmonton')
  );

  if (isCanada) {
    return [
      { name: 'Amazon', url: 'https://www.amazon.ca/s?k=', color: 'text-[#FF9900]' },
      { name: 'Wayfair', url: 'https://www.wayfair.ca/keyword.php?keyword=', color: 'text-[#7B189F]' },
      { name: 'Walmart', url: 'https://www.walmart.ca/search?q=', color: 'text-[#0071CE]' },
      { name: 'Temu', url: 'https://www.temu.com/search_result.html?search_key=', color: 'text-[#FF7A00]' }
    ];
  }

  // Default to US
  return [
    { name: 'Amazon', url: 'https://www.amazon.com/s?k=', color: 'text-[#FF9900]' },
    { name: 'Wayfair', url: 'https://www.wayfair.com/keyword.php?keyword=', color: 'text-[#7B189F]' },
    { name: 'Walmart', url: 'https://www.walmart.com/search?q=', color: 'text-[#0071CE]' },
    { name: 'Temu', url: 'https://www.temu.com/search_result.html?search_key=', color: 'text-[#FF7A00]' }
  ];
}

export default function ChecklistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<(ChecklistWithItems & { board_image_url?: string; board_name?: string }) | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGiftingModal, setShowGiftingModal] = useState(false);
  const [giftingUrl, setGiftingUrl] = useState<string | null>(null);
  const [enablingGifting, setEnablingGifting] = useState(false);
  const [giftingUrlCopied, setGiftingUrlCopied] = useState(false);
  const [retailers] = useState(getLocalizedRetailers());
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [inspirationLightboxOpen, setInspirationLightboxOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadChecklist();
    }
  }, [id]);

  const loadChecklist = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getChecklistById(id);
      if (!data) {
        setError('Shopping list not found');
        return;
      }
      setChecklist(data);
      setNewName(data.name);

      // Load board info if board_id exists
      if (data.board_id) {
        const boards = await getBoards();
        const foundBoard = boards.find(b => b.id === data.board_id);
        if (foundBoard) {
          setBoard(foundBoard);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load shopping list:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    if (!checklist) return;

    try {
      await updateChecklistItem(itemId, !currentStatus);
      
      // Update local state
      setChecklist({
        ...checklist,
        items: checklist.items.map(item =>
          item.id === itemId
            ? { ...item, is_completed: !currentStatus, completed_at: !currentStatus ? new Date().toISOString() : undefined }
            : item
        ),
        completed_count: !currentStatus 
          ? checklist.completed_count + 1 
          : checklist.completed_count - 1,
      });

      // Show celebration if all items completed
      if (!currentStatus && checklist.completed_count + 1 === checklist.total_count) {
        toast.success('🎉 Shopping list completed! Great job!');
      }
    } catch (err: unknown) {
      console.error('Failed to update item:', err);
      toast.error('Failed to update item');
    }
  };

  const handleSaveName = async () => {
    if (!checklist || !newName.trim()) return;

    try {
      setSavingName(true);
      await updateChecklistName(checklist.id, newName.trim());
      setChecklist({ ...checklist, name: newName.trim() });
      setEditingName(false);
      toast.success('Shopping list name updated');
    } catch (err: unknown) {
      console.error('Failed to update name:', err);
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setNewName(checklist?.name || '');
    setEditingName(false);
  };

  const handleDelete = async () => {
    if (!checklist) return;
    
    if (!confirm('Are you sure you want to delete this shopping list? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteChecklist(checklist.id);
      toast.success('Shopping list deleted');
      navigate('/checklists');
    } catch (err: unknown) {
      console.error('Failed to delete shopping list:', err);
      toast.error('Failed to delete shopping list');
    }
  };

  const handleGoogleSearch = (itemName: string) => {
    const searchQuery = encodeURIComponent(itemName);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  };

  const isNigerianExplore = !!checklist?.explore_scene_id;

  const renderItemActions = (item: ChecklistItem) => {
    const openGoogle = () => handleGoogleSearch(item.item_name);
    const googleItem = (
      <DropdownMenuItem key="google" onClick={openGoogle}>
        <Search className="mr-2 h-4 w-4" />
        Search on Google
      </DropdownMenuItem>
    );
    if (isNigerianExplore) {
      if (item.vendor_product_slug) {
        const slug = String(item.vendor_product_slug);
        const isExternalUrl = /^https?:\/\//.test(slug);

        // Explore checklist item that points to an external retailer URL (e.g. Canadian curated scenes)
        if (isExternalUrl) {
          const retailerName = (item.instagram_handle || '').trim() || 'Retailer';
          return (
            <div className="flex gap-0 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(slug, '_blank')}
                className="rounded-r-none border-r-0"
              >
                View on {retailerName}
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

        // Nigerian explore item pointing to an internal Homable product
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
              <DropdownMenuItem onClick={() => window.open(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(item.item_name)}`, '_blank')}>
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
          {retailers.map((retailer) => (
            <DropdownMenuItem
              key={retailer.name}
              onClick={() => window.open(`${retailer.url}${encodeURIComponent(item.item_name)}`, '_blank')}
            >
              <ExternalLink className={`mr-2 h-4 w-4 ${retailer.color}`} />
              {retailer.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const handleEnableGifting = async () => {
    if (!checklist) return;

    try {
      setEnablingGifting(true);
      const result = await enableGifting(checklist.id);
      setGiftingUrl(result.gifting_url);
      setShowGiftingModal(true);
      if (checklist.explore_scene_id) {
        trackNgEvent(NG_EVENTS.HOME_REGISTRY_SHARED, {
          checklist_id: checklist.id,
        });
      }
      // Update local state
      setChecklist({
        ...checklist,
        gifting_enabled: true,
        gifting_token: result.gifting_token,
      });
      
      toast.success('Gifting enabled! Share the link with friends.');
    } catch (err: unknown) {
      console.error('Failed to enable gifting:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to enable gifting');
    } finally {
      setEnablingGifting(false);
    }
  };

  const handleCopyGiftingUrl = async () => {
    // Use URL from checklist when gifting is already enabled (e.g. page load); otherwise use state from modal
    const urlToCopy =
      checklist?.gifting_enabled && checklist?.gifting_token
        ? `${window.location.origin}/checklists/gift/${checklist.gifting_token}`
        : giftingUrl;
    if (!urlToCopy) return;

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setGiftingUrlCopied(true);
      toast.success('Gifting link copied to clipboard!');
      setTimeout(() => setGiftingUrlCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleAddItem = async () => {
    if (!checklist || !newItemName.trim()) return;

    try {
      setAddingItem(true);
      await addChecklistItem(checklist.id, newItemName.trim());
      toast.success('Item added successfully');
      setNewItemName('');
      await loadChecklist();
    } catch (err: unknown) {
      console.error('Failed to add item:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!checklist) return;

    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setDeletingItemId(itemId);
      await deleteChecklistItem(itemId);
      toast.success('Item deleted');
      await loadChecklist();
    } catch (err: unknown) {
      console.error('Failed to delete item:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeletingItemId(null);
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
            <Button onClick={() => navigate('/checklists')}>
              Back to Shopping Lists
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Separate items: pending (unclaimed), claimed, and completed
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
  
  const progressPercent = checklist.total_count > 0
    ? Math.round((checklist.completed_count / checklist.total_count) * 100)
    : 0;
  const isFullyCompleted = checklist.completed_count === checklist.total_count && checklist.total_count > 0;
  
  // Get gifting URL if gifting is enabled
  const currentGiftingUrl = checklist.gifting_enabled && checklist.gifting_token
    ? `${window.location.origin}/checklists/gift/${checklist.gifting_token}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/checklists')}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shopping Lists
        </Button>

        {/* Inspiration Image (if available) — from checklist.board_image_url or board; click to view full size */}
        {(checklist?.board_image_url ?? board?.source_image_url) && (
          <div className="mb-6 flex justify-center">
            <button
              type="button"
              onClick={() => setInspirationLightboxOpen(true)}
              className="focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              aria-label="View full inspiration photo"
            >
              <img
                src={checklist?.board_image_url ?? board?.source_image_url}
                alt="Original Inspiration — click to view full size"
                className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-2xl shadow-lg border-2 border-white"
              />
            </button>
            <Dialog open={inspirationLightboxOpen} onOpenChange={setInspirationLightboxOpen}>
              <DialogContent className="max-w-[95vw] max-h-[90vh] w-auto p-0 border-0 bg-black/95 gap-0 overflow-hidden [&>button]:right-2 [&>button]:top-2 [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:h-9 [&>button]:w-9">
                <img
                  src={checklist?.board_image_url ?? board?.source_image_url}
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="text-lg font-semibold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={savingName || !newName.trim()}
                      className="shrink-0"
                    >
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={savingName}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Desktop: Title with inline edit button */}
                    <div className="hidden md:flex items-center gap-2">
                      <CardTitle className="text-2xl font-bold text-[#111111]">
                        {checklist.name}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingName(true)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Mobile: Title only (edit in menu) */}
                    <CardTitle className="md:hidden text-xl font-bold text-[#111111] pr-2">
                      {checklist.name}
                    </CardTitle>
                  </>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Created {formatDate(checklist.created_at)}
                </p>
              </div>

              {/* Desktop: Individual action buttons */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile: Options menu */}
              <div className="md:hidden shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setEditingName(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
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
              
              {/* Completion Badge */}
              {isFullyCompleted && (
                <div className="flex items-center gap-2 text-[#2F9E44] font-medium bg-emerald-50 px-4 py-2 rounded-lg">
                  <PartyPopper className="h-5 w-5" />
                  All items completed!
                </div>
              )}
              
              {/* Create Home Registry / Let friends help button */}
              {!checklist.gifting_enabled && (
                <Button
                  onClick={handleEnableGifting}
                  disabled={enablingGifting}
                  className="w-full bg-[#111111] hover:bg-[#333333] text-white mt-4"
                >
                  {enablingGifting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      {checklist.explore_scene_id ? 'Create Home Registry' : 'Let friends help'}
                    </>
                  )}
                </Button>
              )}
              
              {/* Gifting link display */}
              {checklist.gifting_enabled && currentGiftingUrl && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-[#C89F7A]" />
                    <span className="text-sm font-medium text-gray-700">Gifting enabled</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={currentGiftingUrl}
                      readOnly
                      className="flex-1 text-xs"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyGiftingUrl}
                    >
                      {giftingUrlCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Items Section (unclaimed) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111]">
              Pending Items ({pendingItems.length})
            </CardTitle>
          </CardHeader>
          {pendingItems.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {/* Add Item Input */}
                <div className="flex gap-2 pb-3 border-b">
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Add new item..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItemName.trim()) {
                        handleAddItem();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddItem}
                    disabled={addingItem || !newItemName.trim()}
                    size="sm"
                  >
                    {addingItem ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {pendingItems.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={item.is_completed}
                        onCheckedChange={() => handleToggleItem(item.id, item.is_completed)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`item-${item.id}`}
                          className="text-base font-medium text-[#111111] cursor-pointer block"
                        >
                          {item.item_name}
                        </label>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete item"
                        >
                          {deletingItemId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        {renderItemActions(item)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

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
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={item.is_completed}
                        onCheckedChange={() => handleToggleItem(item.id, item.is_completed)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`item-${item.id}`}
                          className="text-base font-medium text-[#111111] cursor-pointer block mb-1"
                        >
                          {item.item_name}
                        </label>
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
                      {renderItemActions(item)}
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
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={item.is_completed}
                        onCheckedChange={() => handleToggleItem(item.id, item.is_completed)}
                        className="mt-1 data-[state=checked]:bg-[#2F9E44] data-[state=checked]:border-[#2F9E44]"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`item-${item.id}`}
                          className="text-base text-[#6A6A6A] cursor-pointer block line-through"
                          style={{ opacity: 0.9 }}
                        >
                          {item.item_name}
                        </label>
                        {item.gift_note && (
                          <p className="text-sm text-gray-500 italic mt-1">
                            "{item.gift_note}"
                          </p>
                        )}
                      </div>
                      {renderItemActions(item)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        checklistId={checklist.id}
        boardName={checklist.name}
      />

      {/* Gifting URL Modal */}
      {showGiftingModal && giftingUrl && (
        <Dialog open={showGiftingModal} onOpenChange={setShowGiftingModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#111111] flex items-center gap-2">
                <Gift className="h-6 w-6 text-[#C89F7A]" />
                {checklist.explore_scene_id ? 'Create Home Registry ✨' : 'Let friends help ✨'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-gray-600">
                Share this link with friends so they can claim items from your shopping list.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#555555]">
                  Gifting Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={giftingUrl}
                    readOnly
                    className="flex-1"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    onClick={handleCopyGiftingUrl}
                    variant="outline"
                    className="shrink-0"
                  >
                    {giftingUrlCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowGiftingModal(false)}
                className="w-full bg-[#111111] hover:bg-[#333333] text-white"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}