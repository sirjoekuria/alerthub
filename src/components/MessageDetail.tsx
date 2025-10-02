import { useState } from "react";
import { Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MessageDetailProps {
  message: Message;
}

export const MessageDetail = ({ message }: MessageDetailProps) => {
  const [isOriginalOpen, setIsOriginalOpen] = useState(false);

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

  return (
    <div className="h-full overflow-y-auto p-3 md:p-6 bg-background">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl md:text-2xl">Transaction Details</CardTitle>
            <Badge variant={message.is_read ? "secondary" : "default"}>
              {message.is_read ? "Read" : "Unread"}
            </Badge>
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
              <label className="text-sm font-medium text-muted-foreground">Transaction Date</label>
              <p className="text-sm">{formatDate(message.transaction_date)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Received At</label>
              <p className="text-sm">{formatDate(message.received_timestamp)}</p>
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
                <p className="text-sm font-mono whitespace-pre-wrap">{message.original_text}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};