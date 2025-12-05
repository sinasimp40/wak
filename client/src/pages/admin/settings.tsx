import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Key,
  Server,
  Globe,
  Shield,
  AlertCircle,
  CreditCard,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  DollarSign,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ApiHealthCheck {
  status: "connected" | "error";
  balance: number | null;
  currency: string | null;
  lastChecked: string;
}

interface ApiKeysStatus {
  onedash: {
    configured: boolean;
    keyPreview: string | null;
  };
  nowpayments: {
    configured: boolean;
    keyPreview: string | null;
  };
}

interface SystemInfo {
  version: string;
  environment: string;
  uptime: string;
}

interface PendingTransaction {
  id: string;
  userId: string;
  username: string;
  email: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  externalId: string | null;
  createdAt: string;
}

interface SyncResult {
  success: boolean;
  total: number;
  synced: number;
  completed: number;
  failed: number;
  results: Array<{ id: string; status: string; message: string }>;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [onedashKey, setOnedashKey] = useState("");
  const [nowpaymentsKey, setNowpaymentsKey] = useState("");
  const [showOnedashKey, setShowOnedashKey] = useState(false);
  const [showNowpaymentsKey, setShowNowpaymentsKey] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult | null>(null);

  const { data: apiHealth, isLoading: healthLoading, refetch, isRefetching } = useQuery<ApiHealthCheck>({
    queryKey: ["/api/admin/health"],
    refetchInterval: 60000,
  });

  const { data: apiKeysStatus, isLoading: keysLoading, refetch: refetchKeys } = useQuery<ApiKeysStatus>({
    queryKey: ["/api/admin/api-keys-status"],
  });

  const { data: pendingTransactions, isLoading: pendingLoading, refetch: refetchPending } = useQuery<PendingTransaction[]>({
    queryKey: ["/api/admin/transactions/pending"],
  });

  const syncPaymentsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/payments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to sync payments");
      }
      return response.json();
    },
    onSuccess: (data: SyncResult) => {
      setSyncResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions/pending"] });
      toast({
        title: "Payment Sync Complete",
        description: `Synced ${data.synced} payments. ${data.completed} completed, ${data.failed} failed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    },
  });

  const completeTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(`/api/admin/transactions/${transactionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to complete transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions/pending"] });
      toast({
        title: "Transaction Completed",
        description: "Balance has been added to the user's account.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error.message,
      });
    },
  });

  const updateKeyMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update API key");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "API Key Updated",
        description: `${variables.key} has been saved successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health"] });
      if (variables.key === "ONEDASH_API_KEY") setOnedashKey("");
      if (variables.key === "NOWPAYMENTS_API_KEY") setNowpaymentsKey("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    },
  });

  const systemInfo: SystemInfo = {
    version: "1.0.0",
    environment: "production",
    uptime: "99.9%",
  };

  const handleRefresh = () => {
    refetch();
    refetchKeys();
    refetchPending();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleSaveOnedash = () => {
    if (onedashKey.trim()) {
      updateKeyMutation.mutate({ key: "ONEDASH_API_KEY", value: onedashKey });
    }
  };

  const handleSaveNowpayments = () => {
    if (nowpaymentsKey.trim()) {
      updateKeyMutation.mutate({ key: "NOWPAYMENTS_API_KEY", value: nowpaymentsKey });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Platform configuration and API management
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefetching}
          data-testid="button-refresh-settings"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys Configuration
          </CardTitle>
          <CardDescription>
            Configure your OneDash and NOWPayments API credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {apiKeysStatus?.onedash.configured ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">OneDash API Key</div>
                      <div className="text-sm text-muted-foreground">
                        {apiKeysStatus?.onedash.configured
                          ? `Current: ${apiKeysStatus.onedash.keyPreview}`
                          : "Not configured"}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      apiKeysStatus?.onedash.configured
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    }
                  >
                    {apiKeysStatus?.onedash.configured ? "Configured" : "Missing"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showOnedashKey ? "text" : "password"}
                      placeholder="Enter OneDash API Key"
                      value={onedashKey}
                      onChange={(e) => setOnedashKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowOnedashKey(!showOnedashKey)}
                    >
                      {showOnedashKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    onClick={handleSaveOnedash}
                    disabled={!onedashKey.trim() || updateKeyMutation.isPending}
                  >
                    {updateKeyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="ml-2">Save</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {apiKeysStatus?.nowpayments?.configured ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                        <CreditCard className="h-5 w-5 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                        <CreditCard className="h-5 w-5 text-amber-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">NOWPayments API Key</div>
                      <div className="text-sm text-muted-foreground">
                        {apiKeysStatus?.nowpayments?.configured
                          ? `Current: ${apiKeysStatus.nowpayments.keyPreview}`
                          : "Not configured"}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      apiKeysStatus?.nowpayments?.configured
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    }
                  >
                    {apiKeysStatus?.nowpayments?.configured ? "Configured" : "Missing"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showNowpaymentsKey ? "text" : "password"}
                      placeholder="Enter NOWPayments API Key"
                      value={nowpaymentsKey}
                      onChange={(e) => setNowpaymentsKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNowpaymentsKey(!showNowpaymentsKey)}
                    >
                      {showNowpaymentsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    onClick={handleSaveNowpayments}
                    disabled={!nowpaymentsKey.trim() || updateKeyMutation.isPending}
                  >
                    {updateKeyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="ml-2">Save</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OneDash API Connection
          </CardTitle>
          <CardDescription>
            Monitor your connection to the OneDash RDP API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  {apiHealth?.status === "connected" ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">API Status</div>
                    <div className="text-sm text-muted-foreground">
                      {apiHealth?.status === "connected"
                        ? "Connected and operational"
                        : "Connection error - check API key"}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    apiHealth?.status === "connected"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
                  }
                >
                  {apiHealth?.status === "connected" ? "Connected" : "Error"}
                </Badge>
              </div>

              {apiHealth?.status === "connected" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">API Balance</div>
                    <div className="text-2xl font-bold font-mono">
                      ${apiHealth.balance?.toFixed(2) || "0.00"} {apiHealth.currency}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Last Checked</div>
                    <div className="text-lg font-medium">
                      {apiHealth.lastChecked
                        ? new Date(apiHealth.lastChecked).toLocaleString()
                        : "Never"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment Status Sync
          </CardTitle>
          <CardDescription>
            Check and sync pending payments from NOWPayments for missed webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium">Pending Transactions</div>
                  <div className="text-sm text-muted-foreground">
                    {pendingLoading
                      ? "Loading..."
                      : `${pendingTransactions?.length || 0} pending payment(s) awaiting confirmation`}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => refetchPending()}
                  disabled={pendingLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${pendingLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => syncPaymentsMutation.mutate()}
                  disabled={syncPaymentsMutation.isPending || !pendingTransactions?.length}
                >
                  {syncPaymentsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync All Payments
                </Button>
              </div>
            </div>

            {syncResults && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium mb-2">Last Sync Results</h4>
                <div className="grid gap-2 md:grid-cols-4 mb-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total:</span> {syncResults.total}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Synced:</span> {syncResults.synced}
                  </div>
                  <div className="text-sm text-emerald-600">
                    <span className="text-muted-foreground">Completed:</span> {syncResults.completed}
                  </div>
                  <div className="text-sm text-red-600">
                    <span className="text-muted-foreground">Failed:</span> {syncResults.failed}
                  </div>
                </div>
                {syncResults.results.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {syncResults.results.map((r, i) => (
                      <div key={i} className="text-xs font-mono p-1 rounded bg-muted">
                        <span className={
                          r.status === "completed" ? "text-emerald-600" :
                          r.status === "failed" || r.status === "expired" ? "text-red-600" :
                          "text-amber-600"
                        }>
                          [{r.status}]
                        </span>{" "}
                        {r.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pendingTransactions && pendingTransactions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Pending Transactions</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {pendingTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                          <DollarSign className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="font-medium">${parseFloat(tx.amount).toFixed(2)} {tx.currency}</div>
                          <div className="text-sm text-muted-foreground">
                            {tx.username} ({tx.email}) - {formatDate(tx.createdAt)}
                          </div>
                          {tx.externalId && (
                            <div className="text-xs font-mono text-muted-foreground">
                              ID: {tx.externalId}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => completeTransactionMutation.mutate(tx.id)}
                        disabled={completeTransactionMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>
            Platform version and environment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Globe className="h-4 w-4" />
                Version
              </div>
              <div className="text-lg font-medium">{systemInfo.version}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Server className="h-4 w-4" />
                Environment
              </div>
              <div className="text-lg font-medium capitalize">{systemInfo.environment}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Shield className="h-4 w-4" />
                Uptime
              </div>
              <div className="text-lg font-medium">{systemInfo.uptime}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            OneDash API endpoints used by this platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">GET</Badge>
              <span>/web-api/balance</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">GET</Badge>
              <span>/web-api/tariffs</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">GET</Badge>
              <span>/web-api/systems-list</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">GET</Badge>
              <span>/web-api/all-orders</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">POST</Badge>
              <span>/web-api/create-vps</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">POST</Badge>
              <span>/web-api/restart-vps</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">POST</Badge>
              <span>/web-api/reinstall-system</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">POST</Badge>
              <span>/web-api/renew-order</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
