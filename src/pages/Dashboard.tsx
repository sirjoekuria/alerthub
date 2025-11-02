import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useStats } from "@/hooks/useStats";
import { LiveIndicator } from "@/components/LiveIndicator";
import { MessageList } from "@/components/MessageList";
import { Button } from "@/components/ui/button";
import { LogOut, Inbox, Menu, User, FileText, TrendingUp, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManualPaymentDialog } from "@/components/ManualPaymentDialog";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { messages, loading: messagesLoading, unreadCount, markAsRead, deleteMessages } = useMessages(user?.id);
  const { stats } = useStats(user?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
      {/* Today's Stats Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Today's Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Messages</span>
            <span className="text-lg font-bold">{stats.total_messages}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Total Amount</span>
            <span className="text-lg font-bold">KES {stats.total_amount.toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">Resets monthly on 1st</p>
        </CardContent>
      </Card>

      {/* Manual Payment Button */}
      <ManualPaymentDialog userId={user.id} />

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

      {/* Navigation Links */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate("/profile")}
        >
          <User className="w-4 h-4 mr-2" />
          My Profile
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate("/financial-report")}
        >
          <FileText className="w-4 h-4 mr-2" />
          Financial Report
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate("/receipts")}
        >
          <Receipt className="w-4 h-4 mr-2" />
          Receipts
        </Button>
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