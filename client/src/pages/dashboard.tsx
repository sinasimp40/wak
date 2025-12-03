import { useQuery } from "@tanstack/react-query";
import { Server, ShoppingCart, Wallet, Activity, Plus, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, LocationBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";

interface DashboardStats {
  balance: number;
  activeVps: number;
  totalOrders: number;
  pendingOrders: number;
}

interface RecentVps {
  id: string;
  ipAddress: string | null;
  status: "runned" | "not_runned" | "cloning";
  os: string;
  location: string;
  tariffName: string;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentVps, isLoading: vpsLoading } = useQuery<RecentVps[]>({
    queryKey: ["/api/vps"],
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Welcome back, {user?.username}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your RDP infrastructure
          </p>
        </div>
        <Button asChild data-testid="button-create-vps-header">
          <Link href="/create">
            <Plus className="h-4 w-4 mr-2" />
            Create VPS
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-balance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold font-mono" data-testid="text-balance">
                  ${stats?.balance?.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available for new orders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-active-vps">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active VPS</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-active-vps">
                  {stats?.activeVps || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently running
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
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-orders">
                  {stats?.totalOrders || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-pending">
                  {stats?.pendingOrders || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Being provisioned
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent VPS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Your VPS Instances</CardTitle>
            <CardDescription>
              Quick overview of your virtual private servers
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vps">
              View all
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {vpsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : recentVps && recentVps.length > 0 ? (
            <div className="space-y-3">
              {recentVps.slice(0, 5).map((vps) => (
                <div
                  key={vps.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
                  data-testid={`vps-row-${vps.id}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium truncate" data-testid={`text-ip-${vps.id}`}>
                        {vps.ipAddress || "Provisioning..."}
                      </span>
                      <LocationBadge location={vps.location as "msk" | "ams"} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {vps.os} | {vps.tariffName}
                    </p>
                  </div>
                  <StatusBadge status={vps.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No VPS instances yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first Windows VPS to get started
              </p>
              <Button asChild data-testid="button-create-first-vps">
                <Link href="/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create VPS
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
