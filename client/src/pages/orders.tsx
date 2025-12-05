import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ShoppingCart, 
  Calendar, 
  Plus, 
  Clock, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Server,
  Loader2,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  User,
  Key,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge, LocationBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface OrderVps {
  id: string;
  ipAddress: string | null;
  status: "runned" | "not_runned" | "cloning";
  os: string;
  rdpUsername: string | null;
  rdpPassword: string | null;
}

interface Order {
  id: string;
  onedashOrderId: number | null;
  tariffName: string;
  location: string;
  period: number;
  count: number;
  totalPrice: string;
  status: "pending" | "active" | "expired" | "cancelled";
  finishDate: string | null;
  daysRemaining: number | null;
  createdAt: string;
  vpsList: OrderVps[];
}

export default function Orders() {
  const { toast } = useToast();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null,
  });
  const [extendPeriod, setExtendPeriod] = useState("30");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [editingCredentials, setEditingCredentials] = useState<{
    vpsId: string;
    field: "username" | "password";
    value: string;
  } | null>(null);

  const { data: orders, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const extendMutation = useMutation({
    mutationFn: async ({ orderId, period }: { orderId: string; period: number }) => {
      return apiRequest("POST", `/api/orders/${orderId}/extend`, { period });
    },
    onSuccess: () => {
      toast({ title: "Order extended", description: "Your order has been extended successfully." });
      setExtendDialog({ open: false, orderId: null });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({ title: "Extension failed", description: error.message, variant: "destructive" });
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async ({ vpsId, username, password }: { vpsId: string; username?: string; password?: string }) => {
      return apiRequest("PATCH", `/api/vps/${vpsId}/credentials`, { rdpUsername: username, rdpPassword: password });
    },
    onSuccess: () => {
      toast({ title: "Credentials updated", description: "VPS credentials have been updated." });
      setEditingCredentials(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const togglePasswordVisibility = (vpsId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(vpsId)) {
      newVisible.delete(vpsId);
    } else {
      newVisible.add(vpsId);
    }
    setVisiblePasswords(newVisible);
  };

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getOsDisplayName = (os: string) => {
    const names: Record<string, string> = {
      windows_10_en: "Windows 10 EN",
      windows_10_ru: "Windows 10 RU",
      windows_11_en: "Windows 11 EN",
      windows_11_ru: "Windows 11 RU",
    };
    return names[os] || os;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Orders</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your VPS orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-orders"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild data-testid="button-new-order">
            <Link href="/create">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} data-testid={`order-card-${order.id}`}>
              <Collapsible open={expandedOrders.has(order.id)}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {order.tariffName}
                          </CardTitle>
                          <StatusBadge status={order.status} />
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs">
                            #{order.onedashOrderId || order.id.slice(0, 8)}
                          </span>
                          <LocationBadge location={order.location as "msk" | "ams"} />
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-semibold">
                          ${parseFloat(order.totalPrice).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.count} VPS × {order.period} days
                        </div>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpanded(order.id)}
                          data-testid={`button-expand-${order.id}`}
                        >
                          {expandedOrders.has(order.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Order details */}
                      <div className="flex flex-wrap gap-6 text-sm border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Created:</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                        {order.finishDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Expires:</span>
                            <span>{formatDate(order.finishDate)}</span>
                            {order.daysRemaining !== null && (
                              <span className="text-muted-foreground">
                                ({order.daysRemaining} days left)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* VPS List */}
                      {order.vpsList && order.vpsList.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">VPS Instances</h4>
                          <div className="grid gap-2">
                            {order.vpsList.map((vps) => (
                              <div
                                key={vps.id}
                                className="p-3 rounded-lg bg-muted/50 space-y-2"
                              >
                                <div className="flex items-center gap-3">
                                  <Server className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-mono text-sm">
                                    {vps.ipAddress || "Provisioning..."}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {getOsDisplayName(vps.os)}
                                  </span>
                                  <StatusBadge status={vps.status} />
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm pl-7">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Username:</span>
                                    {editingCredentials?.vpsId === vps.id && editingCredentials.field === "username" ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          className="h-6 w-32 text-xs"
                                          value={editingCredentials.value}
                                          onChange={(e) => setEditingCredentials({ ...editingCredentials, value: e.target.value })}
                                          autoFocus
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            updateCredentialsMutation.mutate({ vpsId: vps.id, username: editingCredentials.value });
                                          }}
                                          disabled={updateCredentialsMutation.isPending}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => setEditingCredentials(null)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                                          {vps.rdpUsername || "Not set"}
                                        </code>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => setEditingCredentials({ vpsId: vps.id, field: "username", value: vps.rdpUsername || "" })}
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Key className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Password:</span>
                                    {editingCredentials?.vpsId === vps.id && editingCredentials.field === "password" ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          className="h-6 w-32 text-xs"
                                          type="text"
                                          value={editingCredentials.value}
                                          onChange={(e) => setEditingCredentials({ ...editingCredentials, value: e.target.value })}
                                          autoFocus
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            updateCredentialsMutation.mutate({ vpsId: vps.id, password: editingCredentials.value });
                                          }}
                                          disabled={updateCredentialsMutation.isPending}
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => setEditingCredentials(null)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                                          {vps.rdpPassword 
                                            ? (visiblePasswords.has(vps.id) ? vps.rdpPassword : "••••••••")
                                            : "Not set"}
                                        </code>
                                        {vps.rdpPassword && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => togglePasswordVisibility(vps.id)}
                                          >
                                            {visiblePasswords.has(vps.id) ? (
                                              <EyeOff className="h-3 w-3" />
                                            ) : (
                                              <Eye className="h-3 w-3" />
                                            )}
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => setEditingCredentials({ vpsId: vps.id, field: "password", value: vps.rdpPassword || "" })}
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {order.status === "active" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExtendDialog({ open: true, orderId: order.id })}
                            data-testid={`button-extend-${order.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Extend
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No orders yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first VPS order to get started
            </p>
            <Button asChild data-testid="button-create-first-order">
              <Link href="/create">
                <Plus className="h-4 w-4 mr-2" />
                Create VPS
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Extend Dialog */}
      <Dialog
        open={extendDialog.open}
        onOpenChange={(open) => setExtendDialog({ open, orderId: open ? extendDialog.orderId : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Order</DialogTitle>
            <DialogDescription>
              Extend your VPS rental period. The cost will be deducted from your balance.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Extension Period (days)</label>
            <Input
              type="number"
              min={7}
              max={360}
              value={extendPeriod}
              onChange={(e) => setExtendPeriod(e.target.value)}
              data-testid="input-extend-period"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Minimum 7 days, maximum 360 days
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialog({ open: false, orderId: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (extendDialog.orderId) {
                  extendMutation.mutate({
                    orderId: extendDialog.orderId,
                    period: parseInt(extendPeriod),
                  });
                }
              }}
              disabled={extendMutation.isPending || parseInt(extendPeriod) < 7}
              data-testid="button-confirm-extend"
            >
              {extendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Extend Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
