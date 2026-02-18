import { supabase } from './supabase';
import type { Board, DetectedItem, Product, Checklist, ChecklistItem, ChecklistWithItems, HistoryItem, SpecsHistory, CarpenterSpec, Storefront, VendorProduct, ExploreScene, ExploreSceneItem, ExploreSceneItemWithProduct } from './types';

interface RoomMaterials {
  walls?: string;
  floors?: string;
}

// Type definition for search response with optional error message
type SearchResponse = {
  products: Product[];
  message?: string;
  message_category_context?: string;
};

// Helper function to validate product URL
function isValidProductUrl(url: string | undefined): boolean {
  if (!url) return false;
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  if (url.includes('XMAS') || url.includes('B09XMAS') || url.includes('xmas-')) {
    return false;
  }
  
  if (url.includes('amazon.ca/dp/')) {
    const asinMatch = url.match(/\/dp\/([A-Z0-9]+)/);
    if (!asinMatch) return false;
    const asin = asinMatch[1];
    return asin.length === 10 && /^B[0-9A-Z]{9}$/.test(asin);
  }
  
  return true;
}

// Helper function to check if item matches category keywords
function matchesCategory(itemName: string, itemCategory: string, productCategory: string): boolean {
  const itemLower = itemName.toLowerCase();
  const itemCatLower = itemCategory.toLowerCase();
  const prodCatLower = productCategory.toLowerCase();
  
  const categoryGroups: Record<string, string[]> = {
    'seating': ['sofa', 'couch', 'sectional', 'loveseat', 'chair', 'armchair', 'recliner', 'bench', 'ottoman', 'stool'],
    'table': ['table', 'console', 'desk', 'nightstand', 'end table', 'side table', 'coffee table', 'accent table', 'accent_table'],
    'tree': ['christmas tree', 'tree', 'artificial tree', 'pine tree', 'fir tree'],
    'garland': ['garland', 'wreath', 'greenery', 'swag', 'vine'],
    'ornament': ['ornament', 'decoration', 'bauble', 'christmas ball', 'hanging decor'],
    'lighting': ['candle', 'lantern', 'light', 'lamp', 'candleholder', 'candle holder', 'string lights'],
    'textile': ['pillow', 'cushion', 'throw', 'blanket', 'rug', 'carpet', 'curtain'],
    'decor': ['vase', 'mirror', 'picture frame', 'wall art', 'sculpture', 'figurine', 'bowl', 'tray', 'basket'],
  };
  
  for (const [, keywords] of Object.entries(categoryGroups)) {
    const itemInGroup = keywords.some(kw => itemLower.includes(kw) || itemCatLower.includes(kw));
    const prodInGroup = keywords.some(kw => prodCatLower.includes(kw));
    
    if (itemInGroup && prodInGroup) {
      return true;
    }
  }
  
  if (prodCatLower === 'decor') {
    const genericDecorItems = ['furniture', 'decoration', 'accent', 'home', 'interior'];
    if (genericDecorItems.some(kw => itemLower.includes(kw) || itemCatLower.includes(kw))) {
      return true;
    }
  }
  
  if (itemCatLower === prodCatLower) {
    return true;
  }
  
  const itemWords = itemCatLower.split(/\s+/);
  const prodWords = prodCatLower.split(/\s+/);
  for (const itemWord of itemWords) {
    for (const prodWord of prodWords) {
      if (itemWord.length > 3 && prodWord.length > 3 && 
          (itemWord.includes(prodWord) || prodWord.includes(itemWord))) {
        return true;
      }
    }
  }
  
  return false;
}

export async function uploadImage(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const fileExt = file.name.split('.').pop();
  const userFolder = user?.id || `anon`;
  const fileName = `${userFolder}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('inspiration-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('inspiration-images')
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function validateDecorImage(imageUrl: string): Promise<{
  is_valid: boolean;
  confidence: number;
  reason: string;
}> {
  const { data, error } = await supabase.functions.invoke('homable_validate_decor', {
    body: { image_url: imageUrl },
  });

  if (error) {
    console.error('Validation error:', error);
    return {
      is_valid: true,
      confidence: 0.5,
      reason: 'Validation service unavailable, allowing upload to proceed'
    };
  }

  return data;
}

export async function createBoard(
  name: string,
  sourceImageUrl: string,
  testCountry?: string,
  referrerCode?: string | null
): Promise<Board> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const boardData: {
    user_id: string | null;
    name: string;
    source_image_url: string;
    cover_image_url: string;
    country?: string;
    referrer_code?: string | null;
  } = {
    user_id: userId,
    name,
    source_image_url: sourceImageUrl,
    cover_image_url: sourceImageUrl,
  };

  if (testCountry) {
    boardData.country = testCountry;
    console.log('Creating board with test country:', testCountry);
  }
  if (referrerCode != null && referrerCode !== '') {
    boardData.referrer_code = referrerCode;
  }

  const { data, error } = await supabase
    .from('boards')
    .insert(boardData)
    .select()
    .single();

  if (error) {
    console.error('Board creation error:', error);
    throw new Error(`Failed to create board: ${error.message}`);
  }

  return data;
}

export async function analyzeImage(boardId: string, imageUrl: string): Promise<{ detected_items: DetectedItem[]; room_materials?: RoomMaterials }> {
  const { data, error } = await supabase.functions.invoke('app_8574c59127_analyze_image', {
    body: {
      board_id: boardId,
      image_url: imageUrl,
    },
  });

  if (error) {
    console.error('Analysis error:', error);
    
    // Check if this is a "not_decor" error from the edge function
    if (error.message && error.message.includes('not_decor')) {
      throw new Error("We couldn't detect any furniture or decor in this image. Please upload a photo that clearly shows interior decor, furniture, or home styling.");
    }
    
    throw error;
  }

  return data;
}

export async function seeMoreItems(boardId: string): Promise<{ detected_items: DetectedItem[]; room_materials?: RoomMaterials; new_items_count: number }> {
  const { data, error } = await supabase.functions.invoke('app_8574c59127_see_more_items', {
    body: {
      board_id: boardId,
    },
  });

  if (error) {
    console.error('See more items error:', error);
    throw error;
  }

  return data;
}

// Generate carpenter specifications for Nigeria users (on-demand)
export async function generateCarpenterSpec(item: DetectedItem): Promise<CarpenterSpec> {
  const { data, error } = await supabase.functions.invoke('app_8574c59127_generate_carpenter_specs', {
    body: {
      item_id: item.id,
      item_name: item.item_name,
      category: item.category,
      style: item.style,
      description: item.description,
      color: item.dominant_color,
    },
  });

  if (error) {
    console.error('Carpenter spec generation error:', error);
    throw error;
  }

  return data.carpenter_spec;
}

export function generateBoardName(detectedItems: DetectedItem[]): string {
  if (!detectedItems || detectedItems.length === 0) {
    return 'Untitled inspiration';
  }

  const styles = [...new Set(detectedItems.map(item => item.style).filter(Boolean))];
  const categories = [...new Set(detectedItems.map(item => item.category).filter(Boolean))];

  if (styles.length > 0 && categories.length > 0) {
    const style = styles[0];
    const category = categories[0];
    return `${style} ${category}`;
  } else if (categories.length > 0) {
    return `${categories[0]} inspiration`;
  } else if (styles.length > 0) {
    return `${styles[0]} decor`;
  }

  return 'Home inspiration';
}

export async function updateBoardName(boardId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('boards')
    .update({ name })
    .eq('id', boardId);

  if (error) {
    console.error('Failed to update board name:', error);
    throw error;
  }
}

export async function getBoardById(boardId: string): Promise<Board | null> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('id', boardId)
    .single();

  if (error) {
    console.error('Failed to fetch board:', error);
    return null;
  }
  
  return data;
}

export async function getBoards(): Promise<Board[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId);

  if (error) {
    console.error('Failed to delete board:', error);
    throw error;
  }
}

/**
 * Attach the current board to the authenticated user (post-auth backfill).
 * Only updates if board exists and user_id is null. Idempotent: no-op if board already has a user.
 */
export async function attachBoardToUser(boardId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('boards')
    .update({ user_id: user.id })
    .eq('id', boardId)
    .is('user_id', null);

  if (error) {
    console.warn('[attachBoardToUser] Failed to attach board:', boardId, error);
  }
}

export async function getDetectedItems(boardId: string): Promise<DetectedItem[]> {
  const { data, error } = await supabase
    .from('detected_items')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getProductsForItem(itemId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('item_product_matches')
    .select(`
      match_score,
      is_top_pick,
      products (*)
    `)
    .eq('detected_item_id', itemId)
    .order('match_score', { ascending: false });

  if (error) throw error;
  
  const products = (data || [])
    .map(match => ({
      ...match.products,
      match_score: match.match_score,
      is_top_pick: match.is_top_pick
    }))
    .filter(p => isValidProductUrl(p.product_url));
  
  return products;
}

export async function searchProducts(itemId: string): Promise<SearchResponse> {
  const { data: item, error: itemError } = await supabase
    .from('detected_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (itemError) {
    console.error('Failed to fetch detected item:', itemError);
    throw itemError;
  }

  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('app_8574c59127_search_products', {
    body: {
      detected_item_id: itemId,
    },
  });

  if (edgeError) {
    console.error('Edge function error:', edgeError);
    throw edgeError;
  }

  if (edgeData.message && edgeData.products?.length === 0) {
    return {
      products: [],
      message: edgeData.message,
      message_category_context: edgeData.message_category_context,
    };
  }

  const products = await getProductsForItem(itemId);
  return { products };
}

export async function getRandomSeedProducts(itemName?: string, itemCategory?: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_seed', true)
    .limit(500);

  if (error) throw error;
  
  if (!data || data.length === 0) {
    return [];
  }

  let validProducts = data.filter(p => isValidProductUrl(p.product_url));

  if (itemName && itemCategory && validProducts.length > 0) {
    const matchingProducts = validProducts.filter(p => 
      matchesCategory(itemName, itemCategory, p.category || '')
    );
    
    if (matchingProducts.length > 0) {
      validProducts = matchingProducts;
    }
  }

  const amazonProducts = validProducts.filter(p => p.merchant === 'Amazon');
  const otherProducts = validProducts.filter(p => p.merchant !== 'Amazon');

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const selectedAmazon = shuffleArray(amazonProducts).slice(0, 8);
  const selectedOthers = shuffleArray(otherProducts).slice(0, 8);

  const finalSelection = shuffleArray([...selectedAmazon, ...selectedOthers]);

  return finalSelection.slice(0, Math.max(3, Math.min(10, finalSelection.length)));
}

export async function logAnalysis(
  boardId: string,
  numberOfItemsDetected: number,
  numberOfItemsWithProducts: number,
  numberOfProductsShown: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return;
  }

  const { error } = await supabase
    .from('analysis_logs')
    .insert({
      board_id: boardId,
      user_id: user.id,
      number_of_items_detected: numberOfItemsDetected,
      number_of_items_with_products: numberOfItemsWithProducts,
      number_of_products_shown: numberOfProductsShown,
    });

  if (error) {
    console.error('Failed to log analysis:', error);
  }
}

export async function createChecklist(
  name: string,
  boardId: string | undefined,
  items: string[],
  options?: { sourceImageUrl?: string; exploreSceneId?: string }
): Promise<Checklist> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to create checklists');
  }

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    name,
    board_id: boardId || null,
  };
  if (options?.sourceImageUrl) {
    insertPayload.source_image_url = options.sourceImageUrl;
  }
  if (options?.exploreSceneId) {
    insertPayload.explore_scene_id = options.exploreSceneId;
  }

  const { data: checklist, error: checklistError } = await supabase
    .from('app_8574c59127_checklists')
    .insert(insertPayload)
    .select()
    .single();

  if (checklistError) {
    console.error('Failed to create checklist:', checklistError);
    throw new Error(`Failed to create checklist: ${checklistError.message}`);
  }

  if (items.length > 0) {
    const checklistItems = items.map((itemName, index) => ({
      checklist_id: checklist.id,
      item_name: itemName,
      is_completed: false,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from('app_8574c59127_checklist_items')
      .insert(checklistItems);

    if (itemsError) {
      console.error('Failed to create checklist items:', itemsError);
    }
  }

  return checklist;
}

export async function getChecklistByBoardId(boardId: string): Promise<Checklist | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('app_8574c59127_checklists')
    .select('*')
    .eq('board_id', boardId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch checklist by board ID:', error);
    return null;
  }

  return data;
}

export async function getChecklistByExploreSceneId(sceneId: string): Promise<Checklist | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('app_8574c59127_checklists')
    .select('*')
    .eq('explore_scene_id', sceneId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch checklist by explore scene ID:', error);
    return null;
  }

  return data;
}

export async function getUserChecklists(): Promise<ChecklistWithItems[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data: checklists, error: checklistsError } = await supabase
    .from('app_8574c59127_checklists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (checklistsError) {
    console.error('Failed to fetch checklists:', checklistsError);
    throw checklistsError;
  }

  if (!checklists || checklists.length === 0) {
    return [];
  }

  const checklistIds = checklists.map(c => c.id);
  const { data: items, error: itemsError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('*')
    .in('checklist_id', checklistIds)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Failed to fetch checklist items:', itemsError);
    throw itemsError;
  }

  const checklistsWithItems: ChecklistWithItems[] = checklists.map(checklist => {
    const checklistItems = items?.filter(item => item.checklist_id === checklist.id) || [];
    // Calculate completed count (only items with status='completed' or is_completed=true)
    const completedCount = checklistItems.filter(item => item.status === 'completed' || item.is_completed).length;
    
    return {
      ...checklist,
      items: checklistItems,
      completed_count: completedCount,
      total_count: checklistItems.length,
    };
  });

  return checklistsWithItems;
}

export async function getChecklistById(checklistId: string): Promise<(ChecklistWithItems & { board_image_url?: string; board_name?: string }) | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { data: checklist, error: checklistError } = await supabase
    .from('app_8574c59127_checklists')
    .select('*')
    .eq('id', checklistId)
    .eq('user_id', user.id)
    .single();

  if (checklistError) {
    console.error('Failed to fetch checklist:', checklistError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Failed to fetch checklist items:', itemsError);
    throw itemsError;
  }

  // Fetch board inspiration image when board_id exists; otherwise use checklist source_image_url (e.g. explore scene hero)
  let boardImageUrl: string | undefined;
  let boardName: string | undefined;
  if (checklist.board_id) {
    const board = await getBoardByIdPublic(checklist.board_id);
    if (board) {
      boardImageUrl = board.source_image_url || board.cover_image_url;
      boardName = board.name;
    }
  }
  if (!boardImageUrl && checklist.source_image_url) {
    boardImageUrl = checklist.source_image_url;
  }

  // Calculate completed count (only items with status='completed' or is_completed=true)
  const completedCount = items?.filter(item => item.status === 'completed' || item.is_completed).length || 0;

  return {
    ...checklist,
    items: items || [],
    completed_count: completedCount,
    total_count: items?.length || 0,
    board_image_url: boardImageUrl,
    board_name: boardName,
  };
}

export async function updateChecklistItem(
  itemId: string,
  isCompleted: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // First, get the current item to check if it was claimed
  const { data: currentItem } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('status, claimed_by_name')
    .eq('id', itemId)
    .single();

  const updateData: Record<string, boolean | string | null> = {
    is_completed: isCompleted,
  };

  if (isCompleted) {
    updateData.status = 'completed';
    updateData.completed_at = new Date().toISOString();
    // Keep claim data when completing (for gift note display)
  } else {
    updateData.completed_at = null;
    // When uncompleting, restore to previous status:
    // If it was claimed, set status back to 'claimed'
    // If it wasn't claimed, set status back to 'pending'
    if (currentItem?.claimed_by_name) {
      updateData.status = 'claimed';
    } else {
      updateData.status = 'pending';
    }
  }

  const { error } = await supabase
    .from('app_8574c59127_checklist_items')
    .update(updateData)
    .eq('id', itemId);

  if (error) {
    console.error('Failed to update checklist item:', error);
    throw new Error(`Failed to update item: ${error.message}`);
  }
}

export async function updateChecklistName(
  checklistId: string,
  name: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabase
    .from('app_8574c59127_checklists')
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checklistId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to update checklist name:', error);
    throw new Error(`Failed to update checklist: ${error.message}`);
  }
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const { error } = await supabase
    .from('app_8574c59127_checklists')
    .delete()
    .eq('id', checklistId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete checklist:', error);
    throw new Error(`Failed to delete checklist: ${error.message}`);
  }
}

export async function getCombinedHistory(): Promise<HistoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // Fetch inspiration boards
  const { data: boards, error: boardsError } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (boardsError) {
    console.error('Failed to fetch boards:', boardsError);
  }

  // Fetch specs history
  const { data: specs, error: specsError } = await supabase
    .from('app_8574c59127_specs_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (specsError) {
    console.error('Failed to fetch specs history:', specsError);
  }

  // Fetch explore scene views
  const { data: exploreViews, error: exploreError } = await supabase
    .from('explore_scene_views')
    .select('*')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: false });

  if (exploreError) {
    console.error('Failed to fetch explore scene views:', exploreError);
  }

  const historyItems: HistoryItem[] = [];

  // Convert boards to history items
  if (boards) {
    boards.forEach(board => {
      historyItems.push({
        id: board.id,
        type: 'inspiration',
        title: board.name,
        created_at: board.created_at,
        image_url: board.cover_image_url,
        board_id: board.id,
      });
    });
  }

  // Convert specs to history items
  if (specs) {
    specs.forEach((spec: SpecsHistory) => {
      historyItems.push({
        id: spec.id,
        type: 'specs',
        title: `${spec.category} search`,
        created_at: spec.created_at,
        category: spec.category,
        specifications: spec.specifications,
        search_queries: spec.search_queries,
      });
    });
  }

  // Convert explore scene views to history items
  if (exploreViews) {
    exploreViews.forEach((view: { id: string; scene_slug: string; scene_title: string; scene_image_url: string | null; viewed_at: string }) => {
      historyItems.push({
        id: view.id,
        type: 'explore',
        title: view.scene_title,
        created_at: view.viewed_at,
        image_url: view.scene_image_url || undefined,
        scene_slug: view.scene_slug,
      });
    });
  }

  // Sort by created_at/viewed_at descending
  historyItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return historyItems;
}

/**
 * Generate a short alphanumeric token (6-8 characters)
 */
function generateShortToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let token = '';
  for (let i = 0; i < 7; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Enable gifting on a checklist and generate a shareable token
 */
export async function enableGifting(checklistId: string): Promise<{ gifting_token: string; gifting_url: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Generate a short, human-friendly token (7 characters)
  let giftingToken = generateShortToken();
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure uniqueness
  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('app_8574c59127_checklists')
      .select('id')
      .eq('gifting_token', giftingToken)
      .maybeSingle();

    if (!existing) {
      break; // Token is unique
    }

    giftingToken = generateShortToken();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    // Fallback to UUID if we can't generate a unique short token
    giftingToken = crypto.randomUUID();
  }

  const { data, error } = await supabase
    .from('app_8574c59127_checklists')
    .update({
      gifting_enabled: true,
      gifting_token: giftingToken,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checklistId)
    .eq('user_id', user.id)
    .select('gifting_token')
    .single();

  if (error) {
    console.error('Failed to enable gifting:', error);
    throw new Error(`Failed to enable gifting: ${error.message}`);
  }

  const giftingUrl = `${window.location.origin}/checklists/gift/${giftingToken}`;

  return {
    gifting_token: data.gifting_token,
    gifting_url: giftingUrl,
  };
}

/**
 * Get board by ID (public access for gifting view)
 */
async function getBoardByIdPublic(boardId: string): Promise<{ source_image_url?: string; cover_image_url?: string; name?: string } | null> {
  const { data, error } = await supabase
    .from('boards')
    .select('source_image_url, cover_image_url, name')
    .eq('id', boardId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to fetch board:', error);
    return null;
  }

  return data;
}

/**
 * Get checklist by gifting token (for shared gifting view)
 * This allows unauthenticated users to view and claim items
 * Supports both short tokens and UUID tokens (fallback)
 */
export async function getChecklistByGiftingToken(token: string): Promise<ChecklistWithItems & { board_image_url?: string; board_name?: string } | null> {
  // Try to find checklist by token (supports both short and UUID tokens)
  const { data: checklist, error: checklistError } = await supabase
    .from('app_8574c59127_checklists')
    .select('*')
    .eq('gifting_token', token)
    .eq('gifting_enabled', true)
    .single();

  if (checklistError || !checklist) {
    console.error('Failed to fetch checklist by token:', checklistError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('*')
    .eq('checklist_id', checklist.id)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('Failed to fetch checklist items:', itemsError);
    throw itemsError;
  }

  // Fetch board info if board_id exists; otherwise use checklist source_image_url (e.g. explore scene hero)
  let boardImageUrl: string | undefined;
  let boardName: string | undefined;
  if (checklist.board_id) {
    const board = await getBoardByIdPublic(checklist.board_id);
    if (board) {
      boardImageUrl = board.source_image_url || board.cover_image_url;
      boardName = board.name;
    }
  }
  if (!boardImageUrl && checklist.source_image_url) {
    boardImageUrl = checklist.source_image_url;
  }

  // Calculate completed count (only items with status='completed')
  const completedCount = items?.filter(item => item.status === 'completed' || item.is_completed).length || 0;

  return {
    ...checklist,
    items: items || [],
    completed_count: completedCount,
    total_count: items?.length || 0,
    board_image_url: boardImageUrl,
    board_name: boardName,
  };
}

/**
 * Claim a checklist item (for gifters)
 * If user is signed in, also link the claim to their account
 */
export async function claimChecklistItem(
  itemId: string,
  claimedByName: string,
  expectedDate?: string,
  giftNote?: string
): Promise<void> {
  // Check if user is authenticated (optional - allows linking claims to accounts)
  const { data: { user } } = await supabase.auth.getUser();

  const updateData: Record<string, string | null> = {
    status: 'claimed',
    claimed_by_name: claimedByName,
    claimed_at: new Date().toISOString(),
  };

  // Link to user account if signed in
  if (user) {
    updateData.claimed_by_user_id = user.id;
  }

  if (expectedDate) {
    updateData.expected_date = expectedDate;
  } else {
    updateData.expected_date = null;
  }

  if (giftNote) {
    updateData.gift_note = giftNote;
  } else {
    updateData.gift_note = null;
  }

  // First, verify the item exists and is claimable (pending status or no status + not completed)
  const { data: currentItem, error: checkError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('status, is_completed, claimed_by_name')
    .eq('id', itemId)
    .single();

  if (checkError || !currentItem) {
    throw new Error('Item not found');
  }

  // Check if item is already claimed or completed
  if (currentItem.claimed_by_name) {
    throw new Error('This item has already been claimed');
  }

  if (currentItem.is_completed || currentItem.status === 'completed') {
    throw new Error('This item has already been completed');
  }

  // Only allow claiming if status is 'pending' or not set (backward compatibility)
  if (currentItem.status && currentItem.status !== 'pending') {
    throw new Error('This item cannot be claimed');
  }

  const { error } = await supabase
    .from('app_8574c59127_checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .or('status.is.null,status.eq.pending') // Allow claiming if status is null (old items) or 'pending'

  if (error) {
    console.error('Failed to claim checklist item:', error);
    throw new Error(`Failed to claim item: ${error.message}`);
  }
}

/**
 * Update a claim (edit expected date or gift note)
 * Requires authentication - user must be the claimer
 */
export async function updateClaim(
  itemId: string,
  expectedDate?: string,
  giftNote?: string,
  claimedByName?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to edit claims');
  }

  // Verify user owns this claim
  const { data: item, error: checkError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('claimed_by_name, claimed_by_user_id, status')
    .eq('id', itemId)
    .single();

  if (checkError || !item) {
    throw new Error('Item not found');
  }

  if (item.status !== 'claimed') {
    throw new Error('Item is not claimed');
  }

  // Check if user owns the claim
  // If user_id is set, it must match
  // If user_id is null, check by name (for claims made before sign-in)
  if (item.claimed_by_user_id) {
    if (item.claimed_by_user_id !== user.id) {
      throw new Error('You can only edit your own claims');
    }
  } else if (claimedByName && item.claimed_by_name !== claimedByName) {
    throw new Error('You can only edit your own claims');
  }

  const updateData: Record<string, string | null> = {};
  
  // Link claim to user if not already linked
  if (!item.claimed_by_user_id) {
    updateData.claimed_by_user_id = user.id;
  }
  
  if (expectedDate !== undefined) {
    updateData.expected_date = expectedDate || null;
  }
  
  if (giftNote !== undefined) {
    updateData.gift_note = giftNote || null;
  }

  const { error } = await supabase
    .from('app_8574c59127_checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('status', 'claimed');

  if (error) {
    console.error('Failed to update claim:', error);
    throw new Error(`Failed to update claim: ${error.message}`);
  }
}

/**
 * Unclaim an item
 * Requires authentication - user must be the claimer
 */
export async function unclaimItem(itemId: string, claimedByName?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to unclaim items');
  }

  // Verify user owns this claim
  const { data: item, error: checkError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('claimed_by_name, claimed_by_user_id, status')
    .eq('id', itemId)
    .single();

  if (checkError || !item) {
    throw new Error('Item not found');
  }

  if (item.status !== 'claimed') {
    throw new Error('Item is not claimed');
  }

  // Check if user owns the claim
  // If user_id is set, it must match
  // If user_id is null, verify by name (for claims made before sign-in)
  if (item.claimed_by_user_id) {
    if (item.claimed_by_user_id !== user.id) {
      throw new Error('You can only unclaim your own items');
    }
  } else if (claimedByName && item.claimed_by_name !== claimedByName) {
    throw new Error('You can only unclaim your own items');
  }

  // Fully revert to pending state - clear all claim data
  const { error } = await supabase
    .from('app_8574c59127_checklist_items')
    .update({
      status: 'pending',
      claimed_by_name: null,
      claimed_at: null,
      claimed_by_user_id: null,
      expected_date: null,
      gift_note: null,
    })
    .eq('id', itemId)
    .eq('status', 'claimed');

  if (error) {
    console.error('Failed to unclaim item:', error);
    throw new Error(`Failed to unclaim item: ${error.message}`);
  }
}

/**
 * Link a claim to a user account (after sign-in)
 */
export async function linkClaimToUser(itemId: string, claimedByName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Verify the claim exists and name matches
  const { data: item, error: checkError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('claimed_by_name, status')
    .eq('id', itemId)
    .single();

  if (checkError || !item) {
    throw new Error('Item not found');
  }

  if (item.claimed_by_name !== claimedByName) {
    throw new Error('Claim name does not match');
  }

  if (item.status !== 'claimed') {
    throw new Error('Item is not claimed');
  }

  // Link the claim to the user
  const { error } = await supabase
    .from('app_8574c59127_checklist_items')
    .update({
      claimed_by_user_id: user.id,
    })
    .eq('id', itemId);

  if (error) {
    console.error('Failed to link claim to user:', error);
    throw new Error(`Failed to link claim: ${error.message}`);
  }
}

/**
 * Link unlinked claims from localStorage to user account
 */
async function linkUnlinkedClaims(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return;
  }

  try {
    const unlinkedClaims = JSON.parse(localStorage.getItem('unlinked_claims') || '[]');
    
    if (unlinkedClaims.length === 0) {
      return;
    }

    // Try to link each unlinked claim
    const linkedItemIds: string[] = [];
    
    for (const claimInfo of unlinkedClaims) {
      try {
        // Verify the claim still exists and matches
        const { data: item } = await supabase
          .from('app_8574c59127_checklist_items')
          .select('claimed_by_name, status, claimed_by_user_id')
          .eq('id', claimInfo.itemId)
          .single();

        if (item && 
            item.status === 'claimed' && 
            item.claimed_by_name === claimInfo.claimedByName &&
            !item.claimed_by_user_id) {
          // Link the claim
          await linkClaimToUser(claimInfo.itemId, claimInfo.claimedByName);
          linkedItemIds.push(claimInfo.itemId);
        }
      } catch (error) {
        console.warn('Failed to link claim:', error);
        // Continue with other claims
      }
    }

    // Remove linked claims from localStorage
    if (linkedItemIds.length > 0) {
      const remainingClaims = unlinkedClaims.filter(
        (claim: any) => !linkedItemIds.includes(claim.itemId)
      );
      localStorage.setItem('unlinked_claims', JSON.stringify(remainingClaims));
    }
  } catch (error) {
    console.error('Failed to link unlinked claims:', error);
  }
}

/**
 * Get checklists where the current user has claimed items
 */
export async function getChecklistsWithMyClaims(): Promise<ChecklistWithItems[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // First, try to link any unlinked claims from localStorage
  await linkUnlinkedClaims();

  // Find all items claimed by this user (by user_id)
  const { data: claimedItems, error: itemsError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('checklist_id')
    .eq('claimed_by_user_id', user.id)
    .eq('status', 'claimed');

  // Also check for unlinked claims in localStorage that might belong to this user
  const unlinkedClaims = JSON.parse(localStorage.getItem('unlinked_claims') || '[]');
  const unlinkedChecklistIds = [...new Set(unlinkedClaims.map((claim: any) => claim.checklistId))];

  // Combine both sets of checklist IDs
  const linkedChecklistIds = claimedItems ? [...new Set(claimedItems.map(item => item.checklist_id))] : [];
  const allChecklistIds = [...new Set([...linkedChecklistIds, ...unlinkedChecklistIds])];

  // Fetch checklists for linked claims (via normal query)
  let checklists: any[] = [];
  if (linkedChecklistIds.length > 0) {
    const { data: linkedChecklists, error: checklistsError } = await supabase
      .from('app_8574c59127_checklists')
      .select('*')
      .in('id', linkedChecklistIds)
      .eq('gifting_enabled', true)
      .order('created_at', { ascending: false });

    if (checklistsError) {
      console.error('Failed to fetch linked checklists:', checklistsError);
    } else if (linkedChecklists) {
      checklists = linkedChecklists;
    }
  }

  // For unlinked claims, fetch via gifting token (public access)
  const unlinkedChecklists: any[] = [];
  if (unlinkedClaims.length > 0) {
    const uniqueTokens = [...new Set(unlinkedClaims.map((claim: any) => claim.giftingToken).filter(Boolean))];
    
    for (const token of uniqueTokens) {
      try {
        const checklist = await getChecklistByGiftingToken(token);
        if (checklist && !checklists.find(c => c.id === checklist.id)) {
          unlinkedChecklists.push(checklist);
        }
      } catch (error) {
        console.warn('Failed to fetch unlinked checklist via token:', error);
      }
    }
  }

  const allChecklists = [...checklists, ...unlinkedChecklists];

  if (allChecklists.length === 0) {
    return [];
  }

  const checklistIds = allChecklists.map(c => c.id);

  // Fetch all items for these checklists
  const { data: allItems, error: allItemsError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('*')
    .in('checklist_id', checklistIds)
    .order('sort_order', { ascending: true });

  if (allItemsError) {
    console.error('Failed to fetch items:', allItemsError);
    return [];
  }

  const checklistsWithItems: ChecklistWithItems[] = allChecklists.map(checklist => {
    const checklistItems = allItems?.filter(item => item.checklist_id === checklist.id) || [];
    const completedCount = checklistItems.filter(item => item.status === 'completed' || item.is_completed).length;
    
    return {
      ...checklist,
      items: checklistItems,
      completed_count: completedCount,
      total_count: checklistItems.length,
    };
  });

  return checklistsWithItems;
}

/**
 * Add an item to a checklist (owner only)
 */
export async function addChecklistItem(checklistId: string, itemName: string): Promise<ChecklistItem> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Verify user owns the checklist
  const { data: checklist, error: checkError } = await supabase
    .from('app_8574c59127_checklists')
    .select('id')
    .eq('id', checklistId)
    .eq('user_id', user.id)
    .single();

  if (checkError || !checklist) {
    throw new Error('Checklist not found or access denied');
  }

  // Get max sort_order
  const { data: existingItems } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('sort_order')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingItems && existingItems.length > 0
    ? (existingItems[0].sort_order || 0) + 1
    : 0;

  const { data: newItem, error: insertError } = await supabase
    .from('app_8574c59127_checklist_items')
    .insert({
      checklist_id: checklistId,
      item_name: itemName,
      is_completed: false,
      status: 'pending',
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to add item:', insertError);
    throw new Error(`Failed to add item: ${insertError.message}`);
  }

  return newItem;
}

/**
 * Delete an item from a checklist (owner only)
 */
export async function deleteChecklistItem(itemId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Verify user owns the checklist
  const { data: item, error: itemError } = await supabase
    .from('app_8574c59127_checklist_items')
    .select('checklist_id, app_8574c59127_checklists!inner(user_id)')
    .eq('id', itemId)
    .single();

  if (itemError || !item) {
    throw new Error('Item not found');
  }

  // Note: The join above ensures we can only delete if user owns the checklist
  // But we need to verify this explicitly
  const { data: checklist } = await supabase
    .from('app_8574c59127_checklists')
    .select('user_id')
    .eq('id', item.checklist_id)
    .single();

  if (!checklist || checklist.user_id !== user.id) {
    throw new Error('Access denied');
  }

  const { error } = await supabase
    .from('app_8574c59127_checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Failed to delete item:', error);
    throw new Error(`Failed to delete item: ${error.message}`);
  }
}

/** Fields needed for storefront listing only (smaller payload, faster for slow networks). */
const VENDOR_PRODUCTS_LIST_FIELDS =
  'id,storefront_id,slug,name,category,room,price_min,price_max,image_url,sort_order,created_at';

const STOREFRONT_PAGE_SIZE = 24;
const STOREFRONT_PAGINATION_THRESHOLD = 50;

/**
 * Fetch storefront by slug with its vendor products (for /stores/:slug and /stores/:slug/:category).
 * Returns null if not found.
 * When categoryFilter is set, products are filtered server-side (WHERE category = categoryFilter).
 * Performance: selects only list-needed fields; if product count > 50, returns first page only (24)
 * so "Load more" can fetch next page via getStorefrontProductsPage.
 */
export async function getStorefrontBySlug(
  slug: string,
  categoryFilter?: string | null
): Promise<{
  storefront: Storefront;
  products: VendorProduct[];
  totalCount: number;
  hasMore: boolean;
  categories: string[];
} | null> {
  const { data: storefront, error: storeError } = await supabase
    .from('storefronts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (storeError || !storefront) {
    return null;
  }

  const countQuery = supabase
    .from('vendor_products')
    .select('*', { count: 'exact', head: true })
    .eq('storefront_id', storefront.id);
  if (categoryFilter) countQuery.eq('category', categoryFilter);
  const { count, error: countError } = await countQuery;

  const totalCount = countError ? 0 : count ?? 0;
  const usePagination = totalCount > STOREFRONT_PAGINATION_THRESHOLD;

  const limit = usePagination ? STOREFRONT_PAGE_SIZE : totalCount || 100;
  const productsQuery = supabase
    .from('vendor_products')
    .select(VENDOR_PRODUCTS_LIST_FIELDS)
    .eq('storefront_id', storefront.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .range(0, limit - 1);
  if (categoryFilter) productsQuery.eq('category', categoryFilter);

  const [productsRes, categoriesRes] = await Promise.all([
    productsQuery,
    supabase.from('vendor_products').select('category').eq('storefront_id', storefront.id),
  ]);

  const { data: products, error: productsError } = productsRes;
  const { data: categoryRows } = categoriesRes;

  const categories: string[] = categoryRows
    ? [...new Set((categoryRows as { category: string | null }[]).map(r => r.category).filter(Boolean))].sort() as string[]
    : [];

  if (productsError) {
    return {
      storefront: storefront as Storefront,
      products: [],
      totalCount: 0,
      hasMore: false,
      categories,
    };
  }

  return {
    storefront: storefront as Storefront,
    products: (products || []) as VendorProduct[],
    totalCount,
    hasMore: usePagination && (products?.length ?? 0) >= STOREFRONT_PAGE_SIZE,
    categories,
  };
}

/**
 * Fetch next page of vendor products for a storefront (for "Load more" when totalCount > 50).
 * When categoryFilter is set, only products in that category are returned (server-side).
 */
export async function getStorefrontProductsPage(
  storefrontId: string,
  offset: number,
  limit: number = STOREFRONT_PAGE_SIZE,
  categoryFilter?: string | null
): Promise<VendorProduct[]> {
  const query = supabase
    .from('vendor_products')
    .select(VENDOR_PRODUCTS_LIST_FIELDS)
    .eq('storefront_id', storefrontId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
  if (categoryFilter) query.eq('category', categoryFilter);
  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch storefront products page:', error);
    return [];
  }
  return (data || []) as VendorProduct[];
}

/**
 * Fetch all active storefronts for a given location (country code) and their products.
 * Used for the public Shops homepage to power the location-based marketplace.
 *
 * - storefronts: all active vendors in the given location
 * - products: all products from those storefronts (caller can slice for featured grids)
 */
export async function getActiveStorefrontsByLocation(
  location: string
): Promise<{ storefronts: Storefront[]; products: VendorProduct[] }> {
  const { data: storefronts, error: storefrontsError } = await supabase
    .from('storefronts')
    .select('*')
    .eq('status', 'active')
    .eq('location', location);

  if (storefrontsError) {
    console.error('Failed to fetch storefronts by location:', storefrontsError);
    return { storefronts: [], products: [] };
  }

  if (!storefronts || storefronts.length === 0) {
    return { storefronts: [], products: [] };
  }

  const storefrontIds = (storefronts as Storefront[]).map(sf => sf.id);

  const { data: products, error: productsError } = await supabase
    .from('vendor_products')
    .select('*')
    .in('storefront_id', storefrontIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (productsError) {
    console.error('Failed to fetch vendor products by location:', productsError);
    return {
      storefronts: storefronts as Storefront[],
      products: [],
    };
  }

  return {
    storefronts: storefronts as Storefront[],
    products: (products || []) as VendorProduct[],
  };
}

/**
 * Fetch a vendor product by its globally-unique slug, including parent storefront.
 * Returns null if not found or storefront missing.
 */
export async function getProductBySlug(slug: string): Promise<{ storefront: Storefront; product: VendorProduct } | null> {
  const { data: product, error: productError } = await supabase
    .from('vendor_products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (productError || !product) {
    return null;
  }

  const { data: storefront, error: storeError } = await supabase
    .from('storefronts')
    .select('*')
    .eq('id', (product as VendorProduct).storefront_id)
    .maybeSingle();

  if (storeError || !storefront) {
    return null;
  }

  return {
    storefront: storefront as Storefront,
    product: product as VendorProduct,
  };
}

/**
 * Fetch up to `limit` other products from the same storefront, excluding a given product ID.
 */
export async function getOtherVendorProducts(
  storefrontId: string,
  excludeProductId: string,
  limit = 4
): Promise<VendorProduct[]> {
  const { data, error } = await supabase
    .from('vendor_products')
    .select('*')
    .eq('storefront_id', storefrontId)
    .neq('id', excludeProductId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch other vendor products:', error);
    return [];
  }

  return (data || []) as VendorProduct[];
}

// ——— Explore (curated room inspirations) ———

/**
 * Sum catalog (vendor product) prices for items. Uses price_min, else price_max; 0 if both null.
 * Used to compute catalog_budget_ngn from related vendor_products.
 */
function computeCatalogBudgetFromItems(
  items: { vendor_product?: { price_min?: number | null; price_max?: number | null } | null }[]
): number {
  return items.reduce((sum, item) => {
    const p = item.vendor_product;
    if (!p) return sum;
    const price = p.price_min != null ? p.price_min : (p.price_max != null ? p.price_max : 0);
    return sum + Number(price);
  }, 0);
}

/**
 * Fetch published explore scenes for a location.
 * Ordered by display_order ASC (nulls last), then created_at DESC for items without display_order.
 * catalog_budget_ngn is computed from related vendor_products (not the stored column).
 */
export async function getExploreScenes(
  location: string,
  limit?: number
): Promise<ExploreScene[]> {
  let query = supabase
    .from('explore_scenes')
    .select('*')
    .eq('status', 'published')
    .eq('location', location)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (limit != null) {
    query = query.limit(limit);
  }

  const { data: scenes, error } = await query;

  if (error) {
    console.error('Failed to fetch explore scenes:', error);
    return [];
  }

  const sceneList = (scenes || []) as ExploreScene[];
  if (sceneList.length === 0) return sceneList;

  const sceneIds = sceneList.map((s) => s.id);
  const { data: sceneItems } = await supabase
    .from('explore_scene_items')
    .select('scene_id, vendor_product_id')
    .in('scene_id', sceneIds)
    .eq('item_type', 'catalog_product')
    .not('vendor_product_id', 'is', null);

  const itemsList = (sceneItems || []) as { scene_id: string; vendor_product_id: string }[];
  const productIds = [...new Set(itemsList.map((i) => i.vendor_product_id))];
  if (productIds.length === 0) {
    return sceneList.map((s) => ({ ...s, catalog_budget_ngn: 0 }));
  }

  const { data: products } = await supabase
    .from('vendor_products')
    .select('id, price_min, price_max')
    .in('id', productIds);
  const productPriceMap = new Map(
    (products || []).map((p: { id: string; price_min?: number | null; price_max?: number | null }) => [
      p.id,
      p.price_min != null ? p.price_min : (p.price_max != null ? p.price_max : 0),
    ])
  );

  const budgetByScene: Record<string, number> = {};
  for (const item of itemsList) {
    const price = productPriceMap.get(item.vendor_product_id) ?? 0;
    budgetByScene[item.scene_id] = (budgetByScene[item.scene_id] ?? 0) + price;
  }

  return sceneList.map((s) => ({
    ...s,
    catalog_budget_ngn: budgetByScene[s.id] ?? 0,
  }));
}

/**
 * Fetch a single published scene by slug with all items.
 * For catalog_product items, includes vendor_products and storefronts.
 * catalog_budget_ngn is computed from related vendor_products (not the stored column).
 */
export async function getExploreSceneBySlug(slug: string): Promise<{
  scene: ExploreScene;
  items: ExploreSceneItemWithProduct[];
} | null> {
  const { data: scene, error: sceneError } = await supabase
    .from('explore_scenes')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (sceneError) {
    console.error('[getExploreSceneBySlug] Scene query error:', sceneError);
    return null;
  }

  if (!scene) {
    console.warn('[getExploreSceneBySlug] No scene found for slug:', slug);
    return null;
  }

  const sceneId = (scene as ExploreScene).id;
  console.log('[getExploreSceneBySlug] Scene found:', {
    id: sceneId,
    title: (scene as ExploreScene).title,
    slug: (scene as ExploreScene).slug,
  });
  console.log('[getExploreSceneBySlug] Fetching items for scene ID:', sceneId);
  
  const { data: items, error: itemsError } = await supabase
    .from('explore_scene_items')
    .select('*')
    .eq('scene_id', sceneId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('[getExploreSceneBySlug] Failed to fetch explore scene items:', itemsError);
    console.error('[getExploreSceneBySlug] Error details:', JSON.stringify(itemsError, null, 2));
    return { scene: scene as ExploreScene, items: [] };
  }

  console.log('[getExploreSceneBySlug] Raw items response:', {
    items: items,
    itemsLength: items?.length || 0,
    itemsType: typeof items,
    isArray: Array.isArray(items),
  });
  
  const rawItems = (items || []) as ExploreSceneItem[];
  
  if (rawItems.length === 0) {
    console.warn('[getExploreSceneBySlug] No items found for scene:', sceneId, '- This might be expected if scene has no items yet');
  } else {
    console.log('[getExploreSceneBySlug] Raw items breakdown:', {
      total: rawItems.length,
      catalog_product: rawItems.filter(i => i.item_type === 'catalog_product').length,
      custom_build: rawItems.filter(i => i.item_type === 'custom_build').length,
      instagram_link: rawItems.filter(i => i.item_type === 'instagram_link').length,
    });
  }

  const productIds = rawItems
    .filter((i) => i.item_type === 'catalog_product' && i.vendor_product_id)
    .map((i) => i.vendor_product_id as string);

  let products: { id: string; [key: string]: unknown }[] = [];
  let storefronts: { id: string; [key: string]: unknown }[] = [];

  if (productIds.length > 0) {
    const { data: productsData } = await supabase
      .from('vendor_products')
      .select('*')
      .in('id', productIds);
    products = (productsData || []) as { id: string; [key: string]: unknown }[];

    const storefrontIds = [...new Set(products.map((p) => p.storefront_id as string))];
    if (storefrontIds.length > 0) {
      const { data: storefrontsData } = await supabase
        .from('storefronts')
        .select('*')
        .in('id', storefrontIds);
      storefronts = (storefrontsData || []) as { id: string; [key: string]: unknown }[];
    }
  }

  const storefrontMap = Object.fromEntries(storefronts.map((s) => [s.id, s]));
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  console.log('[getExploreSceneBySlug] Product IDs to fetch:', productIds);
  console.log('[getExploreSceneBySlug] Products fetched:', products.length);
  console.log('[getExploreSceneBySlug] Storefronts fetched:', storefronts.length);

  const itemsWithProduct: ExploreSceneItemWithProduct[] = rawItems.map((item) => {
    const out: ExploreSceneItemWithProduct = { ...item, vendor_product: null, storefront: null };
    if (item.item_type === 'catalog_product' && item.vendor_product_id) {
      const prod = productMap[item.vendor_product_id];
      if (prod) {
        out.vendor_product = prod as VendorProduct;
        out.storefront = (storefrontMap[(prod as VendorProduct).storefront_id] as Storefront) ?? null;
      } else {
        console.warn('[getExploreSceneBySlug] Product not found for vendor_product_id:', item.vendor_product_id);
      }
    }
    return out;
  });

  console.log('[getExploreSceneBySlug] Items with product mapped:', itemsWithProduct.length);
  console.log('[getExploreSceneBySlug] Item types breakdown:', {
    catalog: itemsWithProduct.filter(i => i.item_type === 'catalog_product').length,
    custom_build: itemsWithProduct.filter(i => i.item_type === 'custom_build').length,
    instagram_link: itemsWithProduct.filter(i => i.item_type === 'instagram_link').length,
  });

  const catalogBudgetNgn = computeCatalogBudgetFromItems(itemsWithProduct);
  const sceneWithBudget: ExploreScene = { ...(scene as ExploreScene), catalog_budget_ngn: catalogBudgetNgn };

  return {
    scene: sceneWithBudget,
    items: itemsWithProduct,
  };
}