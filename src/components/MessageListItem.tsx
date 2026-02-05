import { useRef } from "react";
import { Message } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react"; // Generic logo placeholder

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
      return formatInTimeZone(new Date(dateString), "Africa/Nairobi", "MMM d, h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  // Logic to determine logo based on sender name (Mock implementation)
  const getLogo = (name: string) => {
    // In a real app, you'd map names to specific image assets
    // For now, we return a generic icon with a colored background
    // random color based on name length
    const colors = [
      "bg-orange-500/15 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400",
      "bg-blue-500/15 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400",
      "bg-green-500/15 text-green-500 dark:bg-green-500/20 dark:text-green-400",
      "bg-purple-500/15 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400"
    ];
    const colorIndex = name.length % colors.length;

    return (
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colors[colorIndex])}>
        <ShoppingBag className="w-5 h-5" />
      </div>
    );
  };

  return (
    <Card
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      className={cn(
        "group relative mb-3 mx-2 overflow-hidden border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md bg-card",
        !message.is_read ? "border-l-4 border-l-primary" : "border-border",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="p-4 flex justify-between items-start gap-3">
        {/* Left Section */}
        <div className="flex-1 space-y-3">
          {/* Header: Name + Badge */}
          <div className="flex items-center gap-2">
            {selectionMode && (
              <Checkbox
                checked={selected}
                onCheckedChange={(v) => onSelectToggle?.(Boolean(v))}
                className="mr-2"
              />
            )}
            <h3 className="font-bold text-base text-foreground truncate max-w-[180px] sm:max-w-xs uppercase">
              {message.sender_name || "Unknown"}
            </h3>
            {!message.is_read && (
              <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-green-500 hover:bg-green-600">
                NEW
              </Badge>
            )}
          </div>

          {/* Amount */}
          <div>
            <span className="text-xl font-bold text-primary block">
              {formatCurrency(message.amount)}
            </span>
          </div>

          {/* Code */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Code:</span>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 bg-muted text-muted-foreground hover:bg-muted/80">
              {message.mpesa_code || "N/A"}
            </Badge>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col items-end justify-between h-auto gap-4">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(message.received_timestamp)}
          </span>
          {getLogo(message.sender_name || "")}
        </div>
      </div>
    </Card>
  );
};