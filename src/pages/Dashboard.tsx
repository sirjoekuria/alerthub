import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useStats } from "@/hooks/useStats";
import { LiveIndicator } from "@/components/LiveIndicator";
import { MessageList } from "@/components/MessageList";
import { Button } from "@/components/ui/button";
import { LogOut, Inbox, Menu, User, FileText, TrendingUp, Receipt, Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ManualPaymentDialog } from "@/components/ManualPaymentDialog";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { setTheme } = useTheme();
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
    <div className="space-y-6">
      {/* Today's Activity Card */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="p-4 bg-white border-b border-gray-100">
          <h3 className="font-bold text-base flex items-center gap-2 text-gray-900">
            Today's Activity
          </h3>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_messages}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-medium mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">KES {stats.total_amount.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 text-center">
            Resets monthly on 1st
          </p>
        </CardContent>
      </Card>

      {/* Manual Payment Button */}
      <ManualPaymentDialog userId={user.id} />

      {/* Menu List */}
      <div className="space-y-2">
        <h4 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu</h4>

        <div
          className="flex items-center justify-between p-3 rounded-xl bg-green-50 text-green-700 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => { }} // Inbox is default view
        >
          <div className="flex items-center gap-3">
            <Inbox className="w-5 h-5" />
            <span className="font-medium">MPESA Inbox</span>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-green-600 hover:bg-green-700 text-white border-none rounded-full px-2">
              {unreadCount}
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full justify-between items-center p-3 h-auto text-base hover:bg-gray-100 rounded-xl font-normal text-muted-foreground hover:text-gray-900 group"
          onClick={() => navigate("/profile")}
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5" />
            <span>My Profile</span>
          </div>
          <LogOut className="w-4 h-4 opacity-0 group-hover:opacity-50 rotate-180" /> {/* Chevron placeholder using specific icon if needed, or stick to simple */}
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between items-center p-3 h-auto text-base hover:bg-gray-100 rounded-xl font-normal text-muted-foreground hover:text-gray-900 group"
          onClick={() => navigate("/financial-report")}
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5" />
            <span>Financial Report</span>
          </div>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-between items-center p-3 h-auto text-base hover:bg-gray-100 rounded-xl font-normal text-muted-foreground hover:text-gray-900 group"
          onClick={() => navigate("/receipts")}
        >
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5" />
            <span>Receipts</span>
          </div>
        </Button>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-3 pt-6 border-t">
        <p className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme</p>
        <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTheme("light")}
            className="flex items-center justify-center py-1.5 rounded-lg bg-white text-gray-900 shadow-sm text-sm font-medium transition-all"
          >
            Light
          </button>
          <button
            onClick={() => setTheme("dark")}
            className="flex items-center justify-center py-1.5 rounded-lg text-gray-500 hover:text-gray-900 text-sm font-medium transition-all"
          >
            Dark
          </button>
          <button
            onClick={() => setTheme("system")}
            className="flex items-center justify-center py-1.5 rounded-lg text-gray-500 hover:text-gray-900 text-sm font-medium transition-all"
          >
            System
          </button>
        </div>
      </div>

      {/* User ID */}
      <div className="pt-2">
        <p className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your User ID</p>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center justify-between group cursor-pointer relative overflow-hidden"
          onClick={() => {
            navigator.clipboard.writeText(user.id);
            // toast functionality would go here
          }}>
          <code className="text-xs font-mono text-green-700 truncate max-w-[200px]">{user.id}</code>
          <FileText className="w-4 h-4 text-green-600 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-sm z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-background border-r">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-xl leading-none">M-PESA</h2>
                      <span className="text-sm font-medium text-muted-foreground">Monitor</span>
                    </div>
                  </div>
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3 md:hidden">
              <span className="font-bold text-lg">M-PESA Monitor</span>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Inbox className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-none">M-PESA</h1>
                <p className="text-sm text-muted-foreground font-medium">Monitor</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-green-100 text-green-700 px-3 py-1.5 rounded-full items-center gap-2 text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              Live Monitoring
            </div>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden bg-gray-50/50">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-80 border-r bg-background p-6 space-y-6 overflow-y-auto">
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
            <MessageList
              messages={messages}
              onMarkAsRead={markAsRead}
              onDelete={deleteMessages}
              dailyTotal={stats.total_amount}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;