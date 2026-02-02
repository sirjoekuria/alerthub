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
    const colors = ["bg-orange-100 text-orange-600", "bg-blue-100 text-blue-600", "bg-green-100 text-green-600", "bg-purple-100 text-purple-600"];
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
        "group relative mb-3 mx-2 overflow-hidden border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md bg-white",
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
            <h3 className="font-bold text-base text-gray-900 truncate max-w-[180px] sm:max-w-xs uppercase">
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
            <span className="text-xl font-bold text-green-600 block">
              {formatCurrency(message.amount)}
            </span>
          </div>

          {/* Code */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">Code:</span>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-700 hover:bg-gray-200">
              {message.mpesa_code || "N/A"}
            </Badge>
          </div>

          {/* Balance */}
          {message.balance !== null && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[10px]">Balance:</span>
              <span className="text-gray-700 text-xs font-semibold">
                {formatCurrency(message.balance)}
              </span>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex flex-col items-end justify-between h-auto gap-4">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatDate(message.received_timestamp)}
          </span>
          {getLogo(message.sender_name || "")}
        </div>
      </div>
    </Card>
  );
};