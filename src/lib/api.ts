import { supabase } from './supabase';
import type { Board, DetectedItem, Product, Checklist, ChecklistItem, ChecklistWithItems, HistoryItem, SpecsHistory, CarpenterSpec } from './types';

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

export async function createBoard(name: string, sourceImageUrl: string): Promise<Board> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const { data, error } = await supabase
    .from('boards')
    .insert({
      user_id: userId,
      name,
      source_image_url: sourceImageUrl,
      cover_image_url: sourceImageUrl,
    })
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
  items: string[]
): Promise<Checklist> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to create checklists');
  }

  const { data: checklist, error: checklistError } = await supabase
    .from('app_8574c59127_checklists')
    .insert({
      user_id: user.id,
      name,
      board_id: boardId || null,
    })
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
    const completedCount = checklistItems.filter(item => item.is_completed).length;
    
    return {
      ...checklist,
      items: checklistItems,
      completed_count: completedCount,
      total_count: checklistItems.length,
    };
  });

  return checklistsWithItems;
}

export async function getChecklistById(checklistId: string): Promise<ChecklistWithItems | null> {
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

  const completedCount = items?.filter(item => item.is_completed).length || 0;

  return {
    ...checklist,
    items: items || [],
    completed_count: completedCount,
    total_count: items?.length || 0,
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

  const updateData: Record<string, boolean | string | null> = {
    is_completed: isCompleted,
  };

  if (isCompleted) {
    updateData.completed_at = new Date().toISOString();
  } else {
    updateData.completed_at = null;
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

  // Sort by created_at descending
  historyItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return historyItems;
}