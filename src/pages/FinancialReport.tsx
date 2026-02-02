import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { haptics } from "@/utils/haptics";
import { FinancialReportSkeleton } from "@/components/skeletons/FinancialReportSkeleton";
import { Pagination } from "@/components/Pagination";

interface DailyStats {
  date: string;
  total_messages: number;
  total_amount: number;
}

const ITEMS_PER_PAGE = 10;

const FinancialReport = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadStats();
    }
  }, [user, authLoading, navigate]);

  const loadStats = async () => {
    try {
      // Get the first day of the current month
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("message_stats")
        .select("*")
        .eq("user_id", user?.id)
        .gte("date", firstDayOfMonth)
        .order("date", { ascending: false });

      if (error) throw error;

      setStats(data || []);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <FinancialReportSkeleton />;
  }

  const totalPages = Math.ceil(stats.length / ITEMS_PER_PAGE);
  const paginatedStats = stats.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalMessages = stats.reduce((sum, s) => sum + s.total_messages, 0);
  const totalAmount = stats.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const averageDaily = stats.length > 0 ? totalAmount / stats.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => {
          haptics.light();
          navigate("/dashboard");
        }} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Financial Report</h1>
          <p className="text-muted-foreground">Monthly overview of your MPESA transactions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMessages}</div>
              <p className="text-xs text-muted-foreground">Transactions this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Monthly total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Average per transaction day</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Transaction summary by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transaction data yet</p>
              ) : (
                <div className="space-y-2">
                  {paginatedStats.map((stat) => (
                    <div
                      key={stat.date}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {formatInTimeZone(new Date(stat.date), "Africa/Nairobi", "EEEE, MMMM d, yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {stat.total_messages} message{stat.total_messages !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">KES {Number(stat.total_amount).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {stats.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={stats.length}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialReport;
