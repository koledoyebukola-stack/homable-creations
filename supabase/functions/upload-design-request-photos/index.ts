import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'design-requests';
const REF_PREFIX = 'HOM-';

function generateReferenceCode(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${REF_PREFIX}${num}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not set');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const formData = await req.formData();
    const email = formData.get('email');
    const roomType = formData.get('room_type');
    const style = formData.get('style');
    const notes = formData.get('notes');
    const files = formData.getAll('files').filter((f): f is File => f instanceof File);

    if (!email || typeof email !== 'string' || !email.trim()) {
      return new Response(JSON.stringify({ error: 'Missing or invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!roomType || typeof roomType !== 'string' || !roomType.trim()) {
      return new Response(JSON.stringify({ error: 'Missing or invalid room_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!style || typeof style !== 'string' || !style.trim()) {
      return new Response(JSON.stringify({ error: 'Missing or invalid style' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestId = crypto.randomUUID();
    let referenceCode = generateReferenceCode();
    const notesVal = notes && typeof notes === 'string' ? notes.trim() || null : null;

    let photoPaths: string[] = [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = ext === 'jpeg' ? 'jpg' : ext;
        const path = `design-requests/${requestId}/photo_${i + 1}.${safeExt}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });
        if (error) {
          console.error('Storage upload error:', error);
          return new Response(
            JSON.stringify({ error: `Upload failed: ${error.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        photoPaths.push(path);
      }
    }

    const insertPayload = {
      id: requestId,
      reference_code: referenceCode,
      email: email.trim(),
      room_type: roomType.trim(),
      style: style.trim(),
      notes: notesVal,
      photo_urls: photoPaths.length > 0 ? photoPaths : null,
      status: 'payment_pending',
      country: 'NG',
    };

    let { data: row, error } = await supabase
      .from('design_requests')
      .insert(insertPayload)
      .select()
      .single();

    if (error && error.code === '23505') {
      referenceCode = generateReferenceCode();
      const retryPayload = { ...insertPayload, reference_code: referenceCode };
      const retry = await supabase.from('design_requests').insert(retryPayload).select().single();
      if (retry.error) {
        console.error('design_requests insert error:', retry.error);
        return new Response(
          JSON.stringify({ error: `Failed to create request: ${retry.error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      row = retry.data;
    } else if (error) {
      console.error('design_requests insert error:', error);
      return new Response(
        JSON.stringify({ error: `Failed to create request: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(row), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('upload-design-request-photos error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
