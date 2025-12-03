import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingCart, 
  Search, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  Server,
  User,
  Calendar,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge, LocationBadge } from "@/components/status-badge";

interface AdminOrderVps {
  id: string;
  ipAddress: string | null;
  status: "runned" | "not_runned" | "cloning";
  os: string;
}

interface AdminOrder {
  id: string;
  userId: string;
  username: string;
  email: string;
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
  vpsList: AdminOrderVps[];
}

export default function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: orders, isLoading, refetch, isRefetching } = useQuery<AdminOrder[]>({
    queryKey: ["/api/admin/orders"],
  });

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.tariffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-3xl font-semibold">All Orders</h1>
          <p className="text-muted-foreground mt-1">
            View and manage orders across all customers
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-orders"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-admin-orders"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders
          </CardTitle>
          <CardDescription>
            {filteredOrders?.length || 0} order{filteredOrders?.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
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
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden" data-testid={`admin-order-${order.id}`}>
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
                            <CardDescription className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs">
                                #{order.onedashOrderId || order.id.slice(0, 8)}
                              </span>
                              <span className="text-muted-foreground">|</span>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{order.username}</span>
                              </div>
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
                              {order.count} VPS x {order.period} days
                            </div>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpanded(order.id)}
                              data-testid={`button-expand-admin-${order.id}`}
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
                          {/* Customer Info */}
                          <div className="p-3 rounded-lg bg-muted/50">
                            <h4 className="text-sm font-medium mb-2">Customer</h4>
                            <div className="text-sm text-muted-foreground">
                              <p>{order.username} ({order.email})</p>
                            </div>
                          </div>

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
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                                  >
                                    <Server className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-mono text-sm">
                                      {vps.ipAddress || "Provisioning..."}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {getOsDisplayName(vps.os)}
                                    </span>
                                    <StatusBadge status={vps.status} />
                                  </div>
                                ))}
                              </div>
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No orders found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No orders have been placed yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
