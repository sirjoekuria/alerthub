import { useRef } from "react";
import { Message } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface MessageListItemProps {
  message: Message;
  onClick: () => void;
  isSelected: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onSelectToggle?: (checked: boolean) => void;
  onLongPress?: () => void;
}

export const MessageListItem = ({
  message,
  onClick,
  isSelected,
  selectionMode = false,
  selected = false,
  onSelectToggle,
  onLongPress,
}: MessageListItemProps) => {
  const pressTimer = useRef<number | null>(null);

  const handlePointerDown = () => {
    if (!onLongPress) return;
    pressTimer.current = window.setTimeout(() => {
      onLongPress();
    }, 500);
  };

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (selectionMode) {
      onSelectToggle?.(!selected);
    } else {
      onClick();
    }
  };

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
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      className={cn(
        "group relative p-5 border-b border-border/50 cursor-pointer transition-all duration-200",
        "hover:bg-accent/30 hover:border-primary/20 hover:shadow-sm",
        !message.is_read && "bg-gradient-to-r from-accent/40 to-accent/20 border-l-4 border-l-primary",
        isSelected && "bg-accent/50 border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectionMode && (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectToggle?.(Boolean(v))}
              className="mt-0.5"
            />
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-semibold text-foreground text-base truncate">
              {message.sender_name || "Unknown"}
            </span>
            {!message.is_read && (
              <Badge 
                variant="default" 
                className="text-xs px-2 py-0.5 bg-primary/90 hover:bg-primary font-medium shadow-sm"
              >
                NEW
              </Badge>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(message.received_timestamp)}
        </span>
      </div>
      
      <div className="space-y-2.5 pl-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(message.amount)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Code:</span>
          <span className="font-mono text-foreground bg-muted/50 px-2 py-0.5 rounded text-xs">
            {message.mpesa_code || "N/A"}
          </span>
        </div>
      </div>
      
      {/* Subtle hover indicator */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-1.5 h-8 bg-primary/20 rounded-full" />
      </div>
    </div>
  );
};