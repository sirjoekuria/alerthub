import { useState } from "react";
import { Message } from "@/hooks/useMessages";
import { MessageListItem } from "./MessageListItem";
import { MessageDetail } from "./MessageDetail";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
}

type SearchFilter = "all" | "name" | "amount" | "code";

export const MessageList = ({ messages, onMarkAsRead }: MessageListProps) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleMessageClick = (message: Message) => {
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
      <div className="flex h-full">
        {/* Message List */}
        <div className="w-full md:w-96 border-r flex flex-col">
          {/* Search Bar */}
          <div className="p-3 md:p-4 border-b bg-card space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={searchFilter} onValueChange={(value: SearchFilter) => setSearchFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="name">Sender Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="code">Transaction Code</SelectItem>
              </SelectContent>
            </Select>
          </div>

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