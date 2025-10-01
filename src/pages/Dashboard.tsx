import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { LiveIndicator } from "@/components/LiveIndicator";
import { MessageList } from "@/components/MessageList";
import { Button } from "@/components/ui/button";
import { LogOut, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { messages, loading: messagesLoading, unreadCount, markAsRead } = useMessages(user?.id);

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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Inbox className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">MPESA Monitor</h1>
                <p className="text-sm text-muted-foreground">Transaction Hub</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LiveIndicator />
            <Button variant="outline" onClick={signOut} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-sidebar p-4 space-y-4">
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
            <MessageList messages={messages} onMarkAsRead={markAsRead} />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;