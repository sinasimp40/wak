import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Server, 
  MoreVertical, 
  RotateCcw, 
  HardDrive, 
  Copy, 
  ExternalLink,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { StatusBadge, LocationBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface VpsInstance {
  id: string;
  orderId: string;
  onedashVpsId: number | null;
  ipAddress: string | null;
  status: "runned" | "not_runned" | "cloning";
  os: string;
  location: string;
  tariffName: string;
  finishDate: string | null;
  daysRemaining: number | null;
}

export default function VpsList() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [reinstallDialog, setReinstallDialog] = useState<{ open: boolean; vpsId: string | null }>({
    open: false,
    vpsId: null,
  });
  const [selectedOs, setSelectedOs] = useState("");

  const { data: vpsList, isLoading, refetch, isRefetching } = useQuery<VpsInstance[]>({
    queryKey: ["/api/vps"],
  });

  const { data: systems } = useQuery<string[]>({
    queryKey: ["/api/systems"],
  });

  const rebootMutation = useMutation({
    mutationFn: async (vpsId: string) => {
      return apiRequest("POST", `/api/vps/${vpsId}/reboot`);
    },
    onSuccess: () => {
      toast({ title: "Reboot initiated", description: "Your VPS is being rebooted." });
      queryClient.invalidateQueries({ queryKey: ["/api/vps"] });
    },
    onError: (error: Error) => {
      toast({ title: "Reboot failed", description: error.message, variant: "destructive" });
    },
  });

  const reinstallMutation = useMutation({
    mutationFn: async ({ vpsId, system }: { vpsId: string; system: string }) => {
      return apiRequest("POST", `/api/vps/${vpsId}/reinstall`, { system });
    },
    onSuccess: () => {
      toast({ title: "Reinstall started", description: "Your VPS OS is being reinstalled." });
      setReinstallDialog({ open: false, vpsId: null });
      queryClient.invalidateQueries({ queryKey: ["/api/vps"] });
    },
    onError: (error: Error) => {
      toast({ title: "Reinstall failed", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "IP address copied to clipboard." });
  };

  const filteredVps = vpsList?.filter((vps) =>
    vps.ipAddress?.includes(searchQuery) ||
    vps.os.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vps.tariffName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOsDisplayName = (os: string) => {
    const names: Record<string, string> = {
      windows_10_en: "Windows 10 (English)",
      windows_10_ru: "Windows 10 (Russian)",
      windows_11_en: "Windows 11 (English)",
      windows_11_ru: "Windows 11 (Russian)",
    };
    return names[os] || os;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My VPS</h1>
          <p className="text-muted-foreground mt-1">
            Manage your virtual private servers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by IP, OS, or tariff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-vps"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-vps"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VPS Instances</CardTitle>
          <CardDescription>
            {filteredVps?.length || 0} instance{filteredVps?.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : filteredVps && filteredVps.length > 0 ? (
            <div className="space-y-3">
              {filteredVps.map((vps) => (
                <div
                  key={vps.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-lg border hover-elevate"
                  data-testid={`vps-item-${vps.id}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Server className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium" data-testid={`text-vps-ip-${vps.id}`}>
                          {vps.ipAddress || "Provisioning..."}
                        </span>
                        {vps.ipAddress && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(vps.ipAddress!)}
                            data-testid={`button-copy-ip-${vps.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        <StatusBadge status={vps.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {getOsDisplayName(vps.os)}
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm text-muted-foreground">{vps.tariffName}</span>
                        <LocationBadge location={vps.location as "msk" | "ams"} />
                      </div>
                      {vps.daysRemaining !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {vps.daysRemaining} days remaining
                        </p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-vps-menu-${vps.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => rebootMutation.mutate(vps.id)}
                        disabled={rebootMutation.isPending}
                        data-testid={`menu-reboot-${vps.id}`}
                      >
                        {rebootMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Reboot VPS
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setReinstallDialog({ open: true, vpsId: vps.id });
                          setSelectedOs(vps.os);
                        }}
                        data-testid={`menu-reinstall-${vps.id}`}
                      >
                        <HardDrive className="h-4 w-4 mr-2" />
                        Reinstall OS
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {vps.ipAddress && (
                        <DropdownMenuItem
                          onClick={() => window.open(`rdp://${vps.ipAddress}`, "_blank")}
                          data-testid={`menu-connect-${vps.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect via RDP
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No VPS instances found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search query" : "Create your first VPS to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reinstall Dialog */}
      <Dialog
        open={reinstallDialog.open}
        onOpenChange={(open) => setReinstallDialog({ open, vpsId: open ? reinstallDialog.vpsId : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reinstall Operating System</DialogTitle>
            <DialogDescription>
              This will completely wipe your VPS and install a fresh OS. All data will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Select Operating System</label>
            <Select value={selectedOs} onValueChange={setSelectedOs}>
              <SelectTrigger data-testid="select-reinstall-os">
                <SelectValue placeholder="Choose an OS" />
              </SelectTrigger>
              <SelectContent>
                {systems?.map((os) => (
                  <SelectItem key={os} value={os}>
                    {getOsDisplayName(os)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReinstallDialog({ open: false, vpsId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (reinstallDialog.vpsId && selectedOs) {
                  reinstallMutation.mutate({ vpsId: reinstallDialog.vpsId, system: selectedOs });
                }
              }}
              disabled={reinstallMutation.isPending || !selectedOs}
              data-testid="button-confirm-reinstall"
            >
              {reinstallMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Reinstall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
