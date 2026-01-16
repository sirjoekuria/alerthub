import { useState } from "react";
import { Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessageDetailProps {
  message: Message;
}

export const MessageDetail = ({ message }: MessageDetailProps) => {
  const [isOriginalOpen, setIsOriginalOpen] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const navigate = useNavigate();

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return `Ksh ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const handleViewReceipt = async () => {
    setLoadingReceipt(true);
    try {
      // Check if receipt exists
      const { data: existingReceipt } = await supabase
        .from('receipts')
        .select('id')
        .eq('message_id', message.id)
        .single();

      if (existingReceipt) {
        navigate('/receipts');
        return;
      }

      // Create receipt if it doesn't exist
      const { error } = await supabase.from('receipts').insert({
        user_id: message.user_id,
        message_id: message.id,
        receipt_number: `RCPT-${message.mpesa_code}`,
        amount: message.amount || 0,
        sender_name: message.sender_name || 'Unknown',
        sender_phone: message.sms_sender,
        mpesa_code: message.mpesa_code || '',
        transaction_date: message.transaction_date || new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Receipt generated successfully");
      navigate('/receipts');
    } catch (error) {
      console.error("Error accessing receipt:", error);
      toast.error("Failed to access receipt");
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-3 md:p-6 bg-background">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl md:text-2xl">Transaction Details</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewReceipt}
                disabled={loadingReceipt}
                className="gap-2"
              >
                <Receipt className="w-4 h-4" />
                {loadingReceipt ? "Loading..." : "Receipt"}
              </Button>
              <Badge variant={message.is_read ? "secondary" : "default"}>
                {message.is_read ? "Read" : "Unread"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
          {/* Transaction Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <p className="text-2xl font-bold text-primary">{formatCurrency(message.amount)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Transaction Code</label>
              <p className="text-lg font-mono font-semibold">{message.mpesa_code || "N/A"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Sender/Recipient</label>
              <p className="text-lg">{message.sender_name || "Unknown"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Transaction Date & Time</label>
              <p className="text-sm">{formatDate(message.transaction_date)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Source</label>
              <p className="text-sm font-medium">{message.sms_sender}</p>
            </div>
          </div>

          {/* Original Message */}
          <Collapsible open={isOriginalOpen} onOpenChange={setIsOriginalOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full flex items-center justify-between">
                <span>View Original Message</span>
                {isOriginalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-mono whitespace-pre-wrap">
                  {message.original_text.replace(/New M-PESA balance is Ksh[\d,]+\.\d{2}/gi, '').trim()}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};