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

// Parse MPESA "received" message to extract transaction details
// Only processes messages containing "You have received"
function parseMPESAMessage(message: string) {
  // MUST contain "You have received" - this is the key indicator for received payments
  if (!/you\s+have\s+received/i.test(message)) {
    console.log('Message does not contain "You have received" - skipping');
    return null;
  }

  // Pattern for received messages:
  // Example: "TJ4796EWEC Confirmed. You have received Ksh500.00 from JOHN DOE 0712345678 on 4/10/25 at 9:49 AM. New M-PESA balance is Ksh1,234.00"
  const patterns = {
    // Transaction code: 10-character alphanumeric code before "Confirmed"
    code: /([A-Z0-9]{10})\s+Confirmed/i,
    // Amount received: "You have received Ksh500.00" or "Ksh1,500.00"
    amount: /You\s+have\s+received\s+Ksh([\d,]+\.?\d*)/i,
    // Sender name and phone: "from JOHN DOE 0712345678"
    sender: /from\s+([A-Z\s]+?)\s+(\d{10})/i,
    // Date and time: "on 4/10/25 at 9:49 AM"
    datetime: /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i,
    // Balance (optional): "New M-PESA balance is Ksh1,234.00"
    balance: /(?:New\s+)?M-PESA\s+balance\s+is\s+Ksh([\d,]+\.?\d*)/i,
  };

  const codeMatch = message.match(patterns.code);
  const amountMatch = message.match(patterns.amount);
  const senderMatch = message.match(patterns.sender);
  const datetimeMatch = message.match(patterns.datetime);
  const balanceMatch = message.match(patterns.balance);

  // Must have at least the code and amount for a valid transaction
  if (!codeMatch || !amountMatch) {
    console.log('Could not extract MPESA code or amount from message');
    return null;
  }

  let transactionDate = null;
  if (datetimeMatch) {
    try {
      const dateStr = datetimeMatch[1];
      const timeStr = datetimeMatch[2].toUpperCase();
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
        
        // M-Pesa timestamps are in East Africa Time (UTC+3)
        // Subtract 3 hours to convert to UTC
        const date = new Date(Date.UTC(
          parseInt(fullYear, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          hour - 3, // Convert EAT (UTC+3) to UTC
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

  const result = {
    mpesaCode: codeMatch[1].trim(),
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    senderName: senderMatch ? senderMatch[1].trim() : null,
    senderPhone: senderMatch ? senderMatch[2] : null,
    transactionDate: transactionDate,
    balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null,
  };

  console.log('Parsed MPESA received message:', result);
  return result;
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

    // Parse the message - only processes "You have received" messages
    const parsed = parseMPESAMessage(payload.message);
    
    // If not a valid received payment message, reject it
    if (!parsed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Not a valid M-PESA received payment message. Must contain "You have received".' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Parsed message:', parsed);

    // Get user ID from payload first (for native Android calls), then try auth header
    let userId = payload.userId;
    
    if (!userId) {
      // Try to get from auth header (for web calls)
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const { data: { user }, error } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user && !error) {
          userId = user.id;
        }
      }
    }

    // If still no userId, check if this is coming from a trusted source with service role
    // For Android native, we trust the userId in payload since it's sent from our app
    if (!userId) {
      console.log('No userId found in payload or auth header');
      return new Response(
        JSON.stringify({ error: 'User authentication required. Please provide userId or valid auth token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using userId:', userId);

    // Normalize received timestamp with fallback to now()
    // Format: "04/10, 10:28 am" - East Africa Time (UTC+3)
    const receivedAt = (() => {
      try {
        if (payload.timestamp) {
          const ts = String(payload.timestamp).trim();
          // Only treat as ISO/epoch if it clearly contains a year or timezone info
          const isLikelyIso =
            /^\d{4}-\d{2}-\d{2}T/.test(ts) ||
            ts.endsWith('Z') ||
            /[+-]\d{2}:\d{2}$/.test(ts) ||
            /^\d{10,13}$/.test(ts);
          if (isLikelyIso) {
            const d = /^\d{10,13}$/.test(ts)
              ? new Date(ts.length === 10 ? Number(ts) * 1000 : Number(ts))
              : new Date(ts);
            if (!isNaN(d.getTime())) return d.toISOString();
          }
          const m = ts.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?,\s*(\d{1,2}):(\d{2})\s*([AP]M|am|pm)?/i);
          if (m) {
            const day = parseInt(m[1], 10);
            const month = parseInt(m[2], 10);
            const yearPart = m[3];
            const now = new Date();
            const year = yearPart
              ? (yearPart.length === 2 ? 2000 + parseInt(yearPart, 10) : parseInt(yearPart, 10))
              : now.getFullYear();
            let hour = parseInt(m[4], 10);
            const minute = parseInt(m[5], 10);
            const ampm = m[6]?.toLowerCase();
            if (ampm) {
              if (ampm === 'pm' && hour < 12) hour += 12;
              if (ampm === 'am' && hour === 12) hour = 0;
            }
            // Build as EAT (UTC+3) and convert to UTC by subtracting 3 hours
            const dateUtc = new Date(Date.UTC(year, month - 1, day, hour - 3, minute));
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
        balance: parsed.balance,
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

    // Generate receipt if this is a M-PESA transaction with amount
    if (parsed.amount && parsed.amount > 0) {
      console.log('Generating receipt for transaction...');
      
      const { data: receiptNumData } = await supabaseClient.rpc('generate_receipt_number');
      
      const { data: receiptData, error: receiptError } = await supabaseClient
        .from('receipts')
        .insert({
          user_id: userId,
          message_id: data.id,
          receipt_number: receiptNumData || `RCP-${Date.now()}`,
          amount: parsed.amount,
          sender_name: parsed.senderName || 'Unknown',
          sender_phone: payload.sender || 'Unknown',
          mpesa_code: parsed.mpesaCode || 'N/A',
          transaction_date: parsed.transactionDate || receivedAt,
        })
        .select()
        .single();

      if (receiptError) {
        console.error('Error creating receipt:', receiptError);
        // Don't fail the whole request if receipt creation fails
      } else {
        console.log('Receipt created successfully:', receiptData);
      }
    }

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