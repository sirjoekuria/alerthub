export interface MpesaMessage {
    mpesa_code: string;
    amount: number;
    sender_name: string;
    transaction_date: string;
    original_text: string;
    sms_sender: string;
}

export const parseMpesaMessage = (text: string, sender: string = "MPESA"): MpesaMessage | null => {
    // Basic patterns - can be expanded
    const receivedPattern = /([A-Z0-9]+)\s+Confirmed\.\s+You\s+have\s+received\s+Ksh([0-9,.]+)\s+from\s+([A-Z\s]+)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i;

    const match = text.match(receivedPattern);

    if (match) {
        const [_, code, amountStr, senderName, dateStr, timeStr] = match;
        const amount = parseFloat(amountStr.replace(/,/g, ""));

        // Parse date - simplistic approach, might need robust library if format varies
        // Assuming DD/MM/YY
        const [day, month, year] = dateStr.split('/').map(Number);
        // Assuming current century 20xx
        const fullYear = 2000 + year;

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

        return {
            mpesa_code: code,
            amount,
            sender_name: senderName.trim(),
            transaction_date: date.toISOString(),
            original_text: text,
            sms_sender: sender
        };
    }

    // Fallback or other patterns can be added here
    // For now return null if not a standard "Received" message
    return null;
};
