import { Message } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface MessageListItemProps {
  message: Message;
  onClick: () => void;
  isSelected: boolean;
}

export const MessageListItem = ({ message, onClick, isSelected }: MessageListItemProps) => {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return `Ksh ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border-b cursor-pointer transition-colors hover:bg-message-hover",
        !message.is_read && "bg-message-unread font-medium",
        isSelected && "bg-accent"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {message.sender_name || "Unknown"}
          </span>
          {!message.is_read && (
            <Badge variant="default" className="text-xs px-1.5 py-0">
              UNREAD
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(message.received_timestamp)}
        </span>
      </div>
      
      <div className="space-y-1">
        <div className="text-sm text-foreground">
          {formatCurrency(message.amount)}
        </div>
        <div className="text-xs text-muted-foreground">
          Code: {message.mpesa_code || "N/A"}
        </div>
      </div>
    </div>
  );
};