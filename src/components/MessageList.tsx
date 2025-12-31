import { useState } from "react";
import { Message } from "@/hooks/useMessages";
import { MessageListItem } from "./MessageListItem";
import { MessageDetail } from "./MessageDetail";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface MessageListProps {
  messages: Message[];
  onMarkAsRead: (messageId: string) => void;
  onDelete: (ids: string[]) => Promise<void> | void;
  dailyTotal?: number;
}

type SearchFilter = "all" | "name" | "amount" | "code";

export const MessageList = ({ messages, onMarkAsRead, onDelete, dailyTotal = 0 }: MessageListProps) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const enterSelectionMode = (message: Message) => {
    setSelectionMode(true);
    setSelectedIds(new Set([message.id]));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await onDelete(ids);
    exitSelectionMode();
  };

  const handleMessageClick = (message: Message) => {
    if (selectionMode) {
      toggleSelection(message.id, !selectedIds.has(message.id));
      return;
    }
    setSelectedMessage(message);
    if (!message.is_read) {
      onMarkAsRead(message.id);
    }
    if (isMobile) {
      setDrawerOpen(true);
    }
  };

  const filteredMessages = messages.filter((message) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    switch (searchFilter) {
      case "name":
        return message.sender_name?.toLowerCase().includes(query);
      case "amount":
        return message.amount?.toString().includes(query);
      case "code":
        return message.mpesa_code?.toLowerCase().includes(query);
      default:
        return (
          message.sender_name?.toLowerCase().includes(query) ||
          message.amount?.toString().includes(query) ||
          message.mpesa_code?.toLowerCase().includes(query)
        );
    }
  });

  return (
    <>
      <div className="flex h-full bg-gray-50/50">
        {/* Message List */}
        <div className="w-full md:w-96 border-r flex flex-col bg-background">
          {/* Search Bar & Total */}
          <div className="p-4 space-y-4 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-primary text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground rounded-xl hover:bg-gray-100">
                <Filter className="w-5 h-5 text-gray-600" />
              </Button>
            </div>

            {/* Daily Total Card */}
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-1">Today's Total</p>
              <div className="text-2xl font-bold text-gray-900">
                Ksh {dailyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {selectionMode && (
            <div className="p-3 border-b flex items-center justify-between bg-card/50">
              <div className="text-sm">{selectedIds.size} selected</div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>Delete</Button>
                <Button variant="outline" size="sm" onClick={exitSelectionMode}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? "No messages match your search" : "No messages yet"}
              </div>
            ) : (
              filteredMessages.map((message) => (
                <MessageListItem
                  key={message.id}
                  message={message}
                  onClick={() => handleMessageClick(message)}
                  isSelected={selectedMessage?.id === message.id}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(message.id)}
                  onSelectToggle={(checked) => toggleSelection(message.id, checked)}
                  onLongPress={() => enterSelectionMode(message)}
                />
              ))
            )}
          </div>
        </div>

        {/* Desktop Message Detail */}
        <div className="hidden md:block flex-1">
          {selectedMessage ? (
            <MessageDetail message={selectedMessage} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a message to view details
            </div>
          )}
        </div>
      </div>

      {/* Mobile Message Detail Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Transaction Details</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            {selectedMessage && <MessageDetail message={selectedMessage} />}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};