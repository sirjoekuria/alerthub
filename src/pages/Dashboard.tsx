import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { LiveIndicator } from "@/components/LiveIndicator";
import { MessageList } from "@/components/MessageList";
import { Button } from "@/components/ui/button";
import { LogOut, Inbox, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { messages, loading: messagesLoading, unreadCount, markAsRead, deleteMessages } = useMessages(user?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  const SidebarContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent">
          <span className="font-semibold text-sidebar-accent-foreground">MPESA Inbox</span>
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="px-3 py-2 text-sm text-sidebar-foreground">
          <p>Total Messages: {messages.length}</p>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <div className="px-3">
          <p className="text-xs font-semibold text-sidebar-foreground mb-2">Your User ID</p>
          <div className="bg-sidebar-accent/50 rounded p-2 break-all">
            <code className="text-xs text-sidebar-accent-foreground">{user?.id}</code>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use this ID in your SMS forwarder app or include it in the JSON payload as "userId".
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="px-3 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 bg-sidebar">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-xl flex items-center justify-center">
                <Inbox className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold">MPESA Monitor</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Transaction Hub</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <LiveIndicator />
            <Button variant="outline" onClick={signOut} size="sm" className="hidden sm:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <Button variant="outline" onClick={signOut} size="icon" className="sm:hidden">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 border-r bg-sidebar p-4 space-y-4 overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Message List */}
        <main className="flex-1 overflow-hidden">
          {messagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} onMarkAsRead={markAsRead} onDelete={deleteMessages} />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;