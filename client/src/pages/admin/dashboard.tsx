import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  ShoppingCart, 
  Server, 
  Wallet, 
  TrendingUp,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";

interface AdminStats {
  onedashBalance: number;
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  activeOrders: number;
  totalVps: number;
  runningVps: number;
  recentOrders: Array<{
    id: string;
    username: string;
    tariffName: string;
    totalPrice: string;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, refetch, isRefetching } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your RDP reseller business
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-admin"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* OneDash Balance - Prominent */}
      <Card className="border-primary bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium">OneDash API Balance</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <>
              <div className="text-3xl font-bold font-mono text-primary" data-testid="text-onedash-balance">
                ${stats?.onedashBalance?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available for VPS provisioning
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.activeUsers || 0} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.activeOrders || 0} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-vps">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total VPS</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalVps || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.runningVps || 0} running
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-platform-health">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  Online
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All systems operational
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Orders
          </CardTitle>
          <CardDescription>
            Latest orders across all customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover-elevate"
                  data-testid={`recent-order-${order.id}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{order.username}</span>
                      <span className="text-muted-foreground">ordered</span>
                      <span className="font-medium">{order.tariffName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-medium">
                      ${parseFloat(order.totalPrice).toFixed(2)}
                    </div>
                    <StatusBadge status={order.status as any} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent orders
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
