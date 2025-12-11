import { supabase } from './supabase';
import { DetectedItem, Product, Board, Checklist, ChecklistItem, ChecklistWithItems } from './types';

// Type definition for search response with optional error message
type SearchResponse = {
  products: Product[];
  message?: string; // Custom user message when no products are found
  message_category_context?: string; // The item category used in the message
};

// Helper function to validate product URL
function isValidProductUrl(url: string | undefined): boolean {
  if (!url) return false;
  
  // Check if URL starts with http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Check if URL contains placeholder IDs or patterns
  if (url.includes('XMAS') || url.includes('B09XMAS') || url.includes('xmas-')) {
    return false;
  }
  
  // Check for incomplete Amazon URLs (missing proper ASIN format)
  if (url.includes('amazon.ca/dp/')) {
    const asinMatch = url.match(/\/dp\/([A-Z0-9]+)/);
    if (!asinMatch) return false;
    const asin = asinMatch[1];
    // Valid ASIN is exactly 10 characters
    return asin.length === 10 && /^B[0-9A-Z]{9}$/.test(asin);
  }
  
  return true;
}

// Helper function to check if item matches category keywords - RELAXED VERSION
function matchesCategory(itemName: string, itemCategory: string, productCategory: string): boolean {
  const itemLower = itemName.toLowerCase();
  const itemCatLower = itemCategory.toLowerCase();
  const prodCatLower = productCategory.toLowerCase();
  
  // Define EXPANDED category groups for very broad matching
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
  
  // Check if item and product belong to the same category group
  for (const [group, keywords] of Object.entries(categoryGroups)) {
    const itemInGroup = keywords.some(kw => itemLower.includes(kw) || itemCatLower.includes(kw));
    const prodInGroup = keywords.some(kw => prodCatLower.includes(kw));
    
    if (itemInGroup && prodInGroup) {
      return true;
    }
  }
  
  // RELAXED: If product is generic "decor", match with most furniture/decor items
  if (prodCatLower === 'decor') {
    const genericDecorItems = ['furniture', 'decoration', 'accent', 'home', 'interior'];
    if (genericDecorItems.some(kw => itemLower.includes(kw) || itemCatLower.includes(kw))) {
      return true;
    }
  }
  
  // Direct category match
  if (itemCatLower === prodCatLower) {
    return true;
  }
  
  // VERY RELAXED: Partial word matching
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
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  // Generate unique filename - use user ID if available, otherwise use 'anon' + timestamp
  const fileExt = file.name.split('.').pop();
  const userFolder = user?.id || `anon`;
  const fileName = `${userFolder}/${Date.now()}.${fileExt}`;

  // Upload to Supabase storage
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

  // Get public URL
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
    // Don't throw - treat validation errors as "valid" to allow upload to proceed
    return {
      is_valid: true,
      confidence: 0.5,
      reason: 'Validation service unavailable, allowing upload to proceed'
    };
  }

  return data;
}

export async function createBoard(name: string, sourceImageUrl: string): Promise<Board> {
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  // For anonymous users, use null for user_id
  const userId = user?.id || null;

  const { data, error } = await supabase
    .from('boards')
    .insert({
      user_id: userId,
      name,
      source_image_url: sourceImageUrl,
      cover_image_url: sourceImageUrl, // Set cover_image_url to the same as source_image_url
    })
    .select()
    .single();

  if (error) {
    console.error('Board creation error:', error);
    throw new Error(`Failed to create board: ${error.message}`);
  }

  return data;
}

export async function analyzeImage(boardId: string, imageUrl: string): Promise<DetectedItem[]> {
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

  return data.detected_items || [];
}

export function generateBoardName(detectedItems: DetectedItem[]): string {
  if (!detectedItems || detectedItems.length === 0) {
    return 'Untitled inspiration';
  }

  // Get unique styles
  const styles = [...new Set(detectedItems.map(item => item.style).filter(Boolean))];
  
  // Get unique categories
  const categories = [...new Set(detectedItems.map(item => item.category).filter(Boolean))];

  // Generate name based on detected items
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

export async function getBoards(): Promise<Board[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Return empty array for anonymous users
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
  // Use the junction table to get products for a detected item
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
  
  // Extract products from the nested structure and add match_score
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
  console.log(`[Frontend] searchProducts called with itemId: ${itemId}`);
  
  // Get the detected item details (no auth required)
  const { data: item, error: itemError } = await supabase
    .from('detected_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (itemError) {
    console.error('[Frontend] Failed to fetch detected item:', itemError);
    throw itemError;
  }

  console.log('[Frontend] Detected item:', {
    id: item.id,
    item_name: item.item_name,
    category: item.category,
    style: item.style,
    dominant_color: item.dominant_color
  });

  // Call the edge function to search for products
  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('app_8574c59127_search_products', {
    body: {
      detected_item_id: itemId,
    },
  });

  if (edgeError) {
    console.error('[Frontend] Edge function error:', edgeError);
    throw edgeError;
  }

  console.log('[Frontend] Edge function returned:', edgeData);

  // Check for the custom message in the Edge Function's direct response
  // If this data is present, the backend found no good matches and returned the user message
  if (edgeData.message && edgeData.products?.length === 0) {
    console.log('[Frontend] Returning custom no-match message from Edge Function.');
    
    return {
      products: [], // Explicitly empty array
      message: edgeData.message, // The custom message
      message_category_context: edgeData.message_category_context, // The category context
    };
  }

  // If no custom message was returned, proceed to fetch the newly inserted products
  const products = await getProductsForItem(itemId);
  console.log(`[Frontend] Final products count: ${products.length}`);
  
  // Return the products wrapped in the SearchResponse structure
  return { products };
}

export async function getRandomSeedProducts(itemName?: string, itemCategory?: string): Promise<Product[]> {
  // Fetch seed products with a higher limit to ensure we have enough to choose from
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_seed', true)
    .limit(500);

  if (error) throw error;
  
  if (!data || data.length === 0) {
    return [];
  }

  // Filter out products with invalid URLs first
  let validProducts = data.filter(p => isValidProductUrl(p.product_url));

  // If item details provided, try to match by category with RELAXED matching
  if (itemName && itemCategory && validProducts.length > 0) {
    const matchingProducts = validProducts.filter(p => 
      matchesCategory(itemName, itemCategory, p.category || '')
    );
    
    // If we have matching products, use them; otherwise fall back to all valid products
    if (matchingProducts.length > 0) {
      validProducts = matchingProducts;
    }
  }

  // Separate by merchant
  const amazonProducts = validProducts.filter(p => p.merchant === 'Amazon');
  const otherProducts = validProducts.filter(p => p.merchant !== 'Amazon');

  // Shuffle and select products - INCREASED from 5 to 8 per group for better variety
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

  // Combine and shuffle final selection
  const finalSelection = shuffleArray([...selectedAmazon, ...selectedOthers]);

  // Return at least 3 products, up to 10 total
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
    return; // Silent fail if not authenticated
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
    // Don't throw - logging should not break the user flow
  }
}

// ============================================
// CHECKLIST API FUNCTIONS
// ============================================

export async function createChecklist(
  name: string,
  boardId: string | undefined,
  items: string[]
): Promise<Checklist> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to create checklists');
  }

  // Create the checklist
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

  // Create checklist items
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
      // Don't throw - checklist was created successfully
    }
  }

  return checklist;
}

export async function getUserChecklists(): Promise<ChecklistWithItems[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // Get all checklists for the user
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

  // Get items for all checklists
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

  // Combine checklists with their items and calculate progress
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

  // Get the checklist
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

  // Get items for the checklist
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