export interface MpesaMessage {
    mpesa_code: string;
    amount: number;
    sender_name: string;
    transaction_date: string;
    original_text: string;
    sms_sender: string;
    balance: number | null;
}

export const parseMpesaMessage = (text: string, sender: string = "MPESA"): MpesaMessage | null => {
    // Basic patterns - can be expanded
    // Updated pattern to handle variations:
    // 1. Optional space after "Confirmed."
    // 2. Sender name including phone numbers (non-greedy capture until " on ")
    // 3. Flexible date format
    const receivedPattern = /([A-Z0-9]+)\s+Confirmed\.[\s\S]*?You\s+have\s+received\s+Ksh([0-9,.]+)\s+from\s+(.*?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i;

    // Strict verification: Must contain "You have received" insensitive of case
    if (!/You\s+have\s+received/i.test(text)) {
        return null;
    }

    const match = text.match(receivedPattern);

    if (match) {
        const [_, code, amountStr, rawSenderName, dateStr, timeStr] = match;
        const amount = parseFloat(amountStr.replace(/,/g, ""));

        // Clean sender name (remove phone numbers if they appear at the end)
        // e.g., "FAITH KAMAU 0719483590" -> "FAITH KAMAU"
        const senderName = rawSenderName.replace(/\s*\d+$/, "").trim();

        // Parse date - simplistic approach, might need robust library if format varies
        // Assuming DD/MM/YY
        const [day, month, year] = dateStr.split('/').map(Number);
        // Handle 2-digit vs 4-digit year
        const fullYear = year < 100 ? 2000 + year : year;

        // Construct ISO string roughly
        // Time parsing (e.g., 5:30 PM)
        const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
        let hours = 0, minutes = 0;
        if (timeParts) {
            hours = parseInt(timeParts[1]);
            minutes = parseInt(timeParts[2]);
            const meridiem = timeParts[3].toUpperCase();
            if (meridiem === 'PM' && hours < 12) hours += 12;
            if (meridiem === 'AM' && hours === 12) hours = 0;
        }

        const date = new Date(fullYear, month - 1, day, hours, minutes);

        // Extract balance - patterns like "New M-PESA balance is Ksh1,234.00" or "M-PESA balance is Ksh500.00"
        const balancePattern = /(?:New\s+)?M-PESA\s+balance\s+is\s+Ksh([0-9,]+\.?\d*)/i;
        const balanceMatch = text.match(balancePattern);
        const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;

        return {
            mpesa_code: code,
            amount,
            sender_name: senderName,
            transaction_date: date.toISOString(),
            original_text: text,
            sms_sender: sender,
            balance
        };
    }

    // Fallback or other patterns can be added here
    // For now return null if not a standard "Received" message
    return null;
};
