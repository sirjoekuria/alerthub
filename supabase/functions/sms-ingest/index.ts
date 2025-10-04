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
    // Transaction code: e.g., "TJ4796EWEC" - alphanumeric code in the message
    code: /([A-Z0-9]{10})\s+Confirmed/i,
    // Amount: e.g., "Ksh500.00", "Ksh1,500.00"
    amount: /Ksh([\d,]+\.?\d*)/,
    // Recipient/Sender: "from [Name]" pattern in M-Pesa messages
    recipient: /from\s+([A-Za-z\s]+?)\s+\d{10}/i,
    // Date and time: "on 4/10/25 at 9:49 AM"
    date: /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i,
  };

  const codeMatch = message.match(patterns.code);
  const amountMatch = message.match(patterns.amount);
  const recipientMatch = message.match(patterns.recipient);
  const dateMatch = message.match(patterns.date);

  let transactionDate = null;
  if (dateMatch) {
    try {
      const dateStr = dateMatch[1];
      const timeStr = dateMatch[2].toUpperCase();
      // Parse date in format DD/MM/YY
      const [day, month, year] = dateStr.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      
      // Parse time with AM/PM
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3];
        
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        // Create date in UTC
        const date = new Date(Date.UTC(
          parseInt(fullYear, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          hour,
          minute,
          0
        ));
        
        transactionDate = date.toISOString();
      }
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

    // Normalize received timestamp with fallback to now()
    const receivedAt = (() => {
      try {
        if (payload.timestamp) {
          const isoTry = new Date(payload.timestamp);
          if (!isNaN(isoTry.getTime())) return isoTry.toISOString();
          const m = payload.timestamp.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?,\s*(\d{1,2}):(\d{2})\s*([AP]M|am|pm)?/i);
          if (m) {
            const day = parseInt(m[1], 10);
            const month = parseInt(m[2], 10);
            const yearPart = m[3];
            const now = new Date();
            const year = yearPart ? (yearPart.length === 2 ? 2000 + parseInt(yearPart, 10) : parseInt(yearPart, 10)) : now.getFullYear();
            let hour = parseInt(m[4], 10);
            const minute = parseInt(m[5], 10);
            const ampm = m[6]?.toLowerCase();
            if (ampm) {
              if (ampm === 'pm' && hour < 12) hour += 12;
              if (ampm === 'am' && hour === 12) hour = 0;
            }
            const dateUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
            return dateUtc.toISOString();
          }
        }
      } catch (e) {
        console.log('Failed to parse received timestamp:', e);
      }
      return new Date().toISOString();
    })();

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
        received_timestamp: receivedAt,
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