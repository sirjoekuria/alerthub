import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSPayload {
  sender: string;
  message: string;
  timestamp: string;
  userId?: string; // Optional: for authenticated requests
}

// Parse MPESA message to extract transaction details
function parseMPESAMessage(message: string) {
  const patterns = {
    // Transaction code: e.g., "FQ123HAZ18" - alphanumeric code at start
    code: /^([A-Z0-9]+)\s/,
    // Amount: e.g., "Ksh500.00", "Ksh1,500.00"
    amount: /Ksh([\d,]+\.?\d*)/,
    // Recipient/Sender: "sent to [Name]" or "received from [Name]" or "paid to [Name]"
    recipient: /(?:sent to|received from|paid to|from)\s+([A-Za-z\s]+?)(?:\s+on|\s+for|\.|\s+[0-9])/i,
    // Date and time: "28/2/24 at 4:20 PM" or "on 28/02/2024"
    date: /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
  };

  const codeMatch = message.match(patterns.code);
  const amountMatch = message.match(patterns.amount);
  const recipientMatch = message.match(patterns.recipient);
  const dateMatch = message.match(patterns.date);

  let transactionDate = null;
  if (dateMatch) {
    try {
      const dateStr = dateMatch[1];
      const timeStr = dateMatch[2];
      // Parse date in format DD/MM/YY or DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      transactionDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}`).toISOString();
    } catch (error) {
      console.log('Failed to parse transaction date:', error);
      transactionDate = null;
    }
  }

  return {
    mpesaCode: codeMatch ? codeMatch[1].trim() : null,
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    senderName: recipientMatch ? recipientMatch[1].trim() : null,
    transactionDate: transactionDate,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: SMSPayload = await req.json();
    console.log('Received SMS payload:', payload);

    // Validate required fields
    if (!payload.sender || !payload.message || !payload.timestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sender, message, timestamp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the message
    const parsed = parseMPESAMessage(payload.message);
    console.log('Parsed message:', parsed);

    // Get user ID from auth header or payload
    let userId = payload.userId;
    
    if (!userId) {
      // Try to get from auth header
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const { data: { user }, error } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user && !error) {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User authentication required. Please provide userId or valid auth token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert message into database
    const { data, error } = await supabaseClient
      .from('messages')
      .insert({
        user_id: userId,
        original_text: payload.message,
        amount: parsed.amount,
        sender_name: parsed.senderName,
        transaction_date: parsed.transactionDate,
        mpesa_code: parsed.mpesaCode,
        sms_sender: payload.sender,
        is_read: false,
        received_timestamp: payload.timestamp,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store message', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Message stored successfully:', data);

    return new Response(
      JSON.stringify({ success: true, message: 'SMS processed successfully', data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing SMS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});