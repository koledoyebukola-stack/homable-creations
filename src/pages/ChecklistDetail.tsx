import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChecklistById, updateChecklistItem, updateChecklistName, deleteChecklist, getBoards } from '@/lib/api';
import { ChecklistWithItems, Board } from '@/lib/types';
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
  ExternalLink
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareModal from '@/components/ShareModal';
import { toast } from 'sonner';

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
  const [checklist, setChecklist] = useState<ChecklistWithItems | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [retailers] = useState(getLocalizedRetailers());

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

  const pendingItems = checklist.items.filter(item => !item.is_completed);
  const completedItems = checklist.items.filter(item => item.is_completed);
  const progressPercent = checklist.total_count > 0
    ? Math.round((checklist.completed_count / checklist.total_count) * 100)
    : 0;
  const isFullyCompleted = checklist.completed_count === checklist.total_count && checklist.total_count > 0;

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
            </div>
          </CardContent>
        </Card>

        {/* Pending Items Section */}
        {pendingItems.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#111111]">
                Pending Items ({pendingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                          >
                            <Search className="h-4 w-4 mr-1" />
                            Search
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleGoogleSearch(item.item_name)}>
                            <Search className="mr-2 h-4 w-4" />
                            Google Search
                          </DropdownMenuItem>
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
                          className="text-base text-[#6A6A6A] cursor-pointer block"
                          style={{ opacity: 0.9 }}
                        >
                          {item.item_name}
                        </label>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                          >
                            <Search className="h-4 w-4 mr-1" />
                            Search
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleGoogleSearch(item.item_name)}>
                            <Search className="mr-2 h-4 w-4" />
                            Google Search
                          </DropdownMenuItem>
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {checklist.board_id && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          boardId={checklist.board_id}
          boardName={checklist.name}
        />
      )}

      <Footer />
    </div>
  );
}