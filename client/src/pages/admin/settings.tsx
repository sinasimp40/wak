import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  maxelpay: {
    apiKeyConfigured: boolean;
    secretConfigured: boolean;
    keyPreview: string | null;
  };
}

interface SystemInfo {
  version: string;
  environment: string;
  uptime: string;
}

export default function AdminSettings() {
  const { data: apiHealth, isLoading: healthLoading, refetch, isRefetching } = useQuery<ApiHealthCheck>({
    queryKey: ["/api/admin/health"],
    refetchInterval: 60000,
  });

  const { data: apiKeysStatus, isLoading: keysLoading, refetch: refetchKeys } = useQuery<ApiKeysStatus>({
    queryKey: ["/api/admin/api-keys-status"],
  });

  const systemInfo: SystemInfo = {
    version: "1.0.0",
    environment: "production",
    uptime: "99.9%",
  };

  const handleRefresh = () => {
    refetch();
    refetchKeys();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Platform configuration and API health
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

      {/* API Keys Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys Configuration
          </CardTitle>
          <CardDescription>
            Manage your OneDash and MaxelPay API credentials. Update keys in the Secrets tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* OneDash API Key */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
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
                        ? `Configured: ${apiKeysStatus.onedash.keyPreview}`
                        : "Not configured - Set ONEDASH_API_KEY in Secrets"}
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

              {/* MaxelPay API Key */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  {apiKeysStatus?.maxelpay.apiKeyConfigured ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                      <CreditCard className="h-5 w-5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                      <CreditCard className="h-5 w-5 text-amber-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">MaxelPay API Key</div>
                    <div className="text-sm text-muted-foreground">
                      {apiKeysStatus?.maxelpay.apiKeyConfigured
                        ? `Configured: ${apiKeysStatus.maxelpay.keyPreview}`
                        : "Not configured - Set MAXELPAY_API_KEY in Secrets"}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    apiKeysStatus?.maxelpay.apiKeyConfigured
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }
                >
                  {apiKeysStatus?.maxelpay.apiKeyConfigured ? "Configured" : "Missing"}
                </Badge>
              </div>

              {/* MaxelPay Secret */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  {apiKeysStatus?.maxelpay.secretConfigured ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                      <Shield className="h-5 w-5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                      <Shield className="h-5 w-5 text-amber-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">MaxelPay API Secret</div>
                    <div className="text-sm text-muted-foreground">
                      {apiKeysStatus?.maxelpay.secretConfigured
                        ? "Secret is configured"
                        : "Not configured - Set MAXELPAY_API_SECRET in Secrets"}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    apiKeysStatus?.maxelpay.secretConfigured
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }
                >
                  {apiKeysStatus?.maxelpay.secretConfigured ? "Configured" : "Missing"}
                </Badge>
              </div>

              {(!apiKeysStatus?.onedash.configured || !apiKeysStatus?.maxelpay.apiKeyConfigured || !apiKeysStatus?.maxelpay.secretConfigured) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Some API keys are missing. Go to the Secrets tab in your Replit workspace to configure them.
                    Required keys: ONEDASH_API_KEY, MAXELPAY_API_KEY, MAXELPAY_API_SECRET
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Connection Status */}
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

      {/* System Information */}
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

      {/* API Endpoints Reference */}
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
