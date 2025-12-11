import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Setup checklists tables request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create checklists table
    const { error: checklistsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS app_8574c59127_checklists (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users NOT NULL,
          name TEXT NOT NULL,
          board_id UUID REFERENCES boards,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS checklists_user_idx ON app_8574c59127_checklists(user_id);
        CREATE INDEX IF NOT EXISTS checklists_created_idx ON app_8574c59127_checklists(created_at DESC);
        
        ALTER TABLE app_8574c59127_checklists ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own checklists" ON app_8574c59127_checklists;
        CREATE POLICY "Users can view own checklists" ON app_8574c59127_checklists
          FOR SELECT TO authenticated USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can create own checklists" ON app_8574c59127_checklists;
        CREATE POLICY "Users can create own checklists" ON app_8574c59127_checklists
          FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can update own checklists" ON app_8574c59127_checklists;
        CREATE POLICY "Users can update own checklists" ON app_8574c59127_checklists
          FOR UPDATE TO authenticated USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can delete own checklists" ON app_8574c59127_checklists;
        CREATE POLICY "Users can delete own checklists" ON app_8574c59127_checklists
          FOR DELETE TO authenticated USING (auth.uid() = user_id);
      `
    });

    if (checklistsError) {
      console.error(`[${requestId}] Error creating checklists table:`, checklistsError);
    }

    // Create checklist_items table
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS app_8574c59127_checklist_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          checklist_id UUID REFERENCES app_8574c59127_checklists ON DELETE CASCADE NOT NULL,
          item_name TEXT NOT NULL,
          is_completed BOOLEAN DEFAULT false NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE,
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS checklist_items_checklist_idx ON app_8574c59127_checklist_items(checklist_id);
        CREATE INDEX IF NOT EXISTS checklist_items_sort_idx ON app_8574c59127_checklist_items(checklist_id, sort_order);
        
        ALTER TABLE app_8574c59127_checklist_items ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view items of own checklists" ON app_8574c59127_checklist_items;
        CREATE POLICY "Users can view items of own checklists" ON app_8574c59127_checklist_items
          FOR SELECT TO authenticated
          USING (EXISTS (
            SELECT 1 FROM app_8574c59127_checklists
            WHERE id = checklist_id AND user_id = auth.uid()
          ));
        
        DROP POLICY IF EXISTS "Users can create items in own checklists" ON app_8574c59127_checklist_items;
        CREATE POLICY "Users can create items in own checklists" ON app_8574c59127_checklist_items
          FOR INSERT TO authenticated
          WITH CHECK (EXISTS (
            SELECT 1 FROM app_8574c59127_checklists
            WHERE id = checklist_id AND user_id = auth.uid()
          ));
        
        DROP POLICY IF EXISTS "Users can update items in own checklists" ON app_8574c59127_checklist_items;
        CREATE POLICY "Users can update items in own checklists" ON app_8574c59127_checklist_items
          FOR UPDATE TO authenticated
          USING (EXISTS (
            SELECT 1 FROM app_8574c59127_checklists
            WHERE id = checklist_id AND user_id = auth.uid()
          ));
        
        DROP POLICY IF EXISTS "Users can delete items in own checklists" ON app_8574c59127_checklist_items;
        CREATE POLICY "Users can delete items in own checklists" ON app_8574c59127_checklist_items
          FOR DELETE TO authenticated
          USING (EXISTS (
            SELECT 1 FROM app_8574c59127_checklists
            WHERE id = checklist_id AND user_id = auth.uid()
          ));
      `
    });

    if (itemsError) {
      console.error(`[${requestId}] Error creating checklist_items table:`, itemsError);
    }

    console.log(`[${requestId}] Setup completed successfully`);

    return new Response(
      JSON.stringify({ success: true, message: 'Checklists tables created successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});