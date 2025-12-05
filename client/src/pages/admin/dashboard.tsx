import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  ShoppingCart, 
  Server, 
  Wallet, 
  TrendingUp,
  Activity,
  RefreshCw,
  CloudDownload,
  Loader2,
  RotateCcw,
  HardDrive,
  MoreVertical,
  Key,
  Eye,
  EyeOff,
  Copy,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

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

interface OneDashOrder {
  order_id: number;
  tariff: { id: number; name: string };
  location: string | null;
  vps_list: Array<{
    id: number;
    os: string;
    vps_ip: { ip: string; ssh_port: number } | string | null;
    vps_status: "runned" | "not_runned" | "cloning";
  }>;
  finish_time: {
    epoch: number;
    days_remaining: number;
    date: string;
  };
}

interface SystemInfo {
  name: string;
  id: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "reboot" | "reinstall" | null;
    vpsId: number | null;
    vpsIp: string;
  }>({ open: false, type: null, vpsId: null, vpsIp: "" });
  const [selectedSystem, setSelectedSystem] = useState("");
  const [credentialsDialog, setCredentialsDialog] = useState<{
    open: boolean;
    vpsId: number | null;
    vpsIp: string;
    username: string;
    password: string;
    showPassword: boolean;
    mode: "view" | "edit";
    loading: boolean;
  }>({ open: false, vpsId: null, vpsIp: "", username: "", password: "", showPassword: false, mode: "view", loading: false });
  
  const { data: stats, isLoading, refetch, isRefetching } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: liveBalance, refetch: refetchBalance } = useQuery<{ balance: number; success: boolean; error?: string }>({
    queryKey: ["/api/admin/balance"],
    refetchInterval: 30000,
  });

  const { data: onedashOrders, isLoading: onedashLoading, refetch: refetchOrders } = useQuery<OneDashOrder[]>({
    queryKey: ["/api/admin/onedash/orders"],
  });

  const { data: systems } = useQuery<SystemInfo[]>({
    queryKey: ["/api/systems"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/sync-vps", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Sync failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync completed",
        description: `Synced ${data.synced} orders, updated ${data.updated} VPS instances. Total in OneDash: ${data.totalOneDash}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onedash/orders"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: error.message,
      });
    },
  });

  const rebootMutation = useMutation({
    mutationFn: async (vpsId: number) => {
      return apiRequest("POST", `/api/admin/vps/${vpsId}/reboot`);
    },
    onSuccess: () => {
      toast({ title: "VPS Reboot", description: "VPS reboot has been initiated." });
      setActionDialog({ open: false, type: null, vpsId: null, vpsIp: "" });
      refetchOrders();
    },
    onError: (error: Error) => {
      toast({ title: "Reboot Failed", description: error.message, variant: "destructive" });
    },
  });

  const reinstallMutation = useMutation({
    mutationFn: async ({ vpsId, system }: { vpsId: number; system: string }) => {
      return apiRequest("POST", `/api/admin/vps/${vpsId}/reinstall`, { system });
    },
    onSuccess: () => {
      toast({ title: "VPS Reinstall", description: "VPS reinstall has been initiated." });
      setActionDialog({ open: false, type: null, vpsId: null, vpsIp: "" });
      setSelectedSystem("");
      refetchOrders();
    },
    onError: (error: Error) => {
      toast({ title: "Reinstall Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async ({ vpsId, username, password }: { vpsId: number; username: string; password: string }) => {
      return apiRequest("PATCH", `/api/admin/vps/${vpsId}/credentials`, { username, password });
    },
    onSuccess: () => {
      toast({ title: "Credentials Updated", description: "VPS credentials have been updated." });
      setCredentialsDialog(prev => ({ ...prev, open: false, mode: "view" }));
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const fetchCredentials = async (vpsId: number, vpsIp: string) => {
    setCredentialsDialog({ open: true, vpsId, vpsIp, username: "", password: "", showPassword: false, mode: "view", loading: true });
    try {
      const response = await fetch(`/api/admin/vps/${vpsId}/credentials`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch credentials");
      }
      setCredentialsDialog(prev => ({
        ...prev,
        username: data.username || "Administrator",
        password: data.password || "",
        loading: false,
      }));
    } catch (error: any) {
      setCredentialsDialog(prev => ({ ...prev, loading: false }));
      toast({ title: "Error", description: error.message || "Failed to fetch credentials", variant: "destructive" });
    }
  };

  const handleAction = () => {
    if (!actionDialog.vpsId) return;
    
    if (actionDialog.type === "reboot") {
      rebootMutation.mutate(actionDialog.vpsId);
    } else if (actionDialog.type === "reinstall" && selectedSystem) {
      reinstallMutation.mutate({ vpsId: actionDialog.vpsId, system: selectedSystem });
    }
  };

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
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">OneDash API Balance</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetchBalance()}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <>
              <div className="text-3xl font-bold font-mono text-primary" data-testid="text-onedash-balance">
                ${(liveBalance?.balance ?? stats?.onedashBalance ?? 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available for VPS provisioning
                {liveBalance?.success === false && liveBalance?.error && (
                  <span className="text-destructive ml-2">({liveBalance.error})</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Auto-refreshes every 30 seconds
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

      {/* OneDash VPS - Direct from API */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CloudDownload className="h-5 w-5" />
              OneDash VPS (Live)
            </CardTitle>
            <CardDescription>
              Active VPS instances directly from OneDash API
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync to Local
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {onedashLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : onedashOrders && onedashOrders.length > 0 ? (
            <div className="space-y-3">
              {onedashOrders.map((order) => (
                <div key={order.order_id} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Server className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{order.tariff.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Order #{order.order_id} • {order.location?.toUpperCase() || "N/A"} • 
                          {order.finish_time?.days_remaining} days remaining
                        </div>
                      </div>
                    </div>
                  </div>
                  {order.vps_list && order.vps_list.length > 0 && (
                    <div className="ml-13 grid gap-2">
                      {order.vps_list.map((vps) => {
                        const ipDisplay = vps.vps_ip 
                          ? (typeof vps.vps_ip === 'object' ? vps.vps_ip.ip : vps.vps_ip)
                          : "Provisioning...";
                        return (
                          <div key={vps.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{ipDisplay}</span>
                              <span className="text-xs text-muted-foreground">({vps.os})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={vps.vps_status} />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setActionDialog({
                                        open: true,
                                        type: "reboot",
                                        vpsId: vps.id,
                                        vpsIp: ipDisplay,
                                      })
                                    }
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reboot
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setActionDialog({
                                        open: true,
                                        type: "reinstall",
                                        vpsId: vps.id,
                                        vpsIp: ipDisplay,
                                      })
                                    }
                                  >
                                    <HardDrive className="h-4 w-4 mr-2" />
                                    Reinstall OS
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => fetchCredentials(vps.id, ipDisplay)}
                                  >
                                    <Key className="h-4 w-4 mr-2" />
                                    View Credentials
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active VPS in OneDash
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Reboot Confirmation Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === "reboot"}
        onOpenChange={(open) => {
          if (!open) setActionDialog({ open: false, type: null, vpsId: null, vpsIp: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reboot VPS</DialogTitle>
            <DialogDescription>
              Are you sure you want to reboot the VPS at {actionDialog.vpsIp}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, vpsId: null, vpsIp: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={rebootMutation.isPending}
            >
              {rebootMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reboot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstall Dialog */}
      <Dialog
        open={actionDialog.open && actionDialog.type === "reinstall"}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ open: false, type: null, vpsId: null, vpsIp: "" });
            setSelectedSystem("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reinstall OS</DialogTitle>
            <DialogDescription>
              Select a new operating system for VPS at {actionDialog.vpsIp}. This will erase all data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Operating System</Label>
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger>
                  <SelectValue placeholder="Select OS" />
                </SelectTrigger>
                <SelectContent>
                  {systems?.map((sys) => (
                    <SelectItem key={sys.id} value={sys.id}>
                      {sys.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, type: null, vpsId: null, vpsIp: "" });
                setSelectedSystem("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleAction}
              disabled={reinstallMutation.isPending || !selectedSystem}
            >
              {reinstallMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reinstall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog
        open={credentialsDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCredentialsDialog({ open: false, vpsId: null, vpsIp: "", username: "", password: "", showPassword: false, mode: "view", loading: false });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {credentialsDialog.mode === "view" ? "VPS Credentials" : "Edit Credentials"}
            </DialogTitle>
            <DialogDescription>
              {credentialsDialog.mode === "view" 
                ? `Credentials for VPS at ${credentialsDialog.vpsIp}`
                : "Update VPS credentials"}
            </DialogDescription>
          </DialogHeader>
          {credentialsDialog.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>IP Address</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                    {credentialsDialog.vpsIp}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsDialog.vpsIp);
                      toast({ title: "Copied!", description: "IP address copied to clipboard." });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                {credentialsDialog.mode === "view" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                      {credentialsDialog.username}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(credentialsDialog.username);
                        toast({ title: "Copied!", description: "Username copied to clipboard." });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    value={credentialsDialog.username}
                    onChange={(e) => setCredentialsDialog(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Username"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                {credentialsDialog.mode === "view" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                      {credentialsDialog.showPassword 
                        ? (credentialsDialog.password || "Not set")
                        : (credentialsDialog.password ? "••••••••" : "Not set")}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCredentialsDialog(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    >
                      {credentialsDialog.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {credentialsDialog.password && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(credentialsDialog.password);
                          toast({ title: "Copied!", description: "Password copied to clipboard." });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type={credentialsDialog.showPassword ? "text" : "password"}
                      value={credentialsDialog.password}
                      onChange={(e) => setCredentialsDialog(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Password"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCredentialsDialog(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    >
                      {credentialsDialog.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {credentialsDialog.mode === "view" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCredentialsDialog(prev => ({ ...prev, mode: "edit" }))}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => setCredentialsDialog({ open: false, vpsId: null, vpsIp: "", username: "", password: "", showPassword: false, mode: "view", loading: false })}
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCredentialsDialog(prev => ({ ...prev, mode: "view" }))}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (credentialsDialog.vpsId) {
                      updateCredentialsMutation.mutate({
                        vpsId: credentialsDialog.vpsId,
                        username: credentialsDialog.username,
                        password: credentialsDialog.password,
                      });
                    }
                  }}
                  disabled={updateCredentialsMutation.isPending}
                >
                  {updateCredentialsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
