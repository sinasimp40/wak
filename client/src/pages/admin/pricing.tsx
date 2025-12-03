import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DollarSign, 
  RefreshCw, 
  Save,
  Percent,
  Plus,
  Loader2,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OneDashTariff, PricingRule } from "@shared/schema";

export default function AdminPricing() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    tariffId: "",
    location: "msk" as "msk" | "ams",
    markupType: "percentage" as "percentage" | "fixed",
    markupValue: "20",
  });

  const { data: tariffs, isLoading: tariffsLoading } = useQuery<OneDashTariff[]>({
    queryKey: ["/api/tariffs"],
  });

  const { data: pricingRules, isLoading: rulesLoading, refetch } = useQuery<PricingRule[]>({
    queryKey: ["/api/admin/pricing"],
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof newRule) => {
      return apiRequest("POST", "/api/admin/pricing", {
        ...data,
        tariffId: parseInt(data.tariffId),
        markupValue: data.markupValue,
      });
    },
    onSuccess: () => {
      toast({ title: "Pricing rule created", description: "The new pricing rule has been saved." });
      setAddDialogOpen(false);
      setNewRule({ tariffId: "", location: "msk", markupType: "percentage", markupValue: "20" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create rule", description: error.message, variant: "destructive" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; isActive?: boolean; markupValue?: string }) => {
      return apiRequest("PATCH", `/api/admin/pricing/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Pricing rule updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update rule", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = tariffsLoading || rulesLoading;

  const getTariffName = (tariffId: number) => {
    return tariffs?.find((t) => t.id === tariffId)?.name || `Tariff ${tariffId}`;
  };

  const calculateFinalPrice = (basePrice: number, rule?: PricingRule) => {
    if (!rule || !rule.isActive) return basePrice;
    
    const markupValue = parseFloat(rule.markupValue?.toString() || "0");
    if (rule.markupType === "percentage") {
      return basePrice * (1 + markupValue / 100);
    }
    return basePrice + markupValue;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Pricing Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Set your markup on OneDash prices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-pricing"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-rule">
                <Plus className="h-4 w-4 mr-2" />
                Add Pricing Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Pricing Rule</DialogTitle>
                <DialogDescription>
                  Create a new markup rule for a specific tariff and location
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tariff</Label>
                  <Select
                    value={newRule.tariffId}
                    onValueChange={(v) => setNewRule({ ...newRule, tariffId: v })}
                  >
                    <SelectTrigger data-testid="select-tariff">
                      <SelectValue placeholder="Select a tariff" />
                    </SelectTrigger>
                    <SelectContent>
                      {tariffs?.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={newRule.location}
                    onValueChange={(v) => setNewRule({ ...newRule, location: v as "msk" | "ams" })}
                  >
                    <SelectTrigger data-testid="select-location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msk">Moscow</SelectItem>
                      <SelectItem value="ams">Amsterdam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Markup Type</Label>
                  <Select
                    value={newRule.markupType}
                    onValueChange={(v) => setNewRule({ ...newRule, markupType: v as "percentage" | "fixed" })}
                  >
                    <SelectTrigger data-testid="select-markup-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Markup Value</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newRule.markupValue}
                      onChange={(e) => setNewRule({ ...newRule, markupValue: e.target.value })}
                      className="pr-8"
                      data-testid="input-markup-value"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {newRule.markupType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createRuleMutation.mutate(newRule)}
                  disabled={createRuleMutation.isPending || !newRule.tariffId}
                  data-testid="button-save-rule"
                >
                  {createRuleMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Save className="h-4 w-4 mr-2" />
                  Save Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">
              How Pricing Works
            </p>
            <p className="text-muted-foreground">
              Configure markup rules to add your profit margin on top of OneDash base prices. 
              You can set a percentage markup (e.g., 20% = customer pays 20% more) or a fixed 
              dollar amount. Rules can be set per tariff and location.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Active Pricing Rules
          </CardTitle>
          <CardDescription>
            Manage your markup configuration for each tariff
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pricingRules && pricingRules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tariff</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Markup Type</TableHead>
                  <TableHead>Markup Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingRules.map((rule) => {
                  const tariff = tariffs?.find((t) => t.id === rule.tariffId);
                  const basePrice = tariff
                    ? (rule.location === "msk" ? tariff.msk_prices[0]?.price : tariff.ams_prices[0]?.price) || 0
                    : 0;
                  const finalPrice = calculateFinalPrice(basePrice, rule);

                  return (
                    <TableRow key={rule.id} data-testid={`pricing-rule-${rule.id}`}>
                      <TableCell className="font-medium">
                        {getTariffName(rule.tariffId)}
                      </TableCell>
                      <TableCell>
                        {rule.location === "msk" ? "🇷🇺 Moscow" : "🇳🇱 Amsterdam"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {rule.markupType === "percentage" ? (
                            <Percent className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                          )}
                          {rule.markupType === "percentage" ? "Percentage" : "Fixed"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {rule.markupType === "percentage" 
                            ? `${rule.markupValue}%` 
                            : `$${rule.markupValue}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) =>
                              updateRuleMutation.mutate({ id: rule.id, isActive: checked })
                            }
                            data-testid={`switch-rule-${rule.id}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {rule.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground line-through">
                                ${basePrice.toFixed(2)}
                              </div>
                              <div className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                ${finalPrice.toFixed(2)}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Base: ${basePrice.toFixed(2)}</p>
                            <p>Your price: ${finalPrice.toFixed(2)}</p>
                            <p>Profit: ${(finalPrice - basePrice).toFixed(2)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No pricing rules configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add markup rules to set your profit margins
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Tariffs Reference */}
      <Card>
        <CardHeader>
          <CardTitle>OneDash Base Prices</CardTitle>
          <CardDescription>
            Reference prices from OneDash API (before your markup)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tariffsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tariff</TableHead>
                  <TableHead>Specs</TableHead>
                  <TableHead className="text-right">Moscow Price</TableHead>
                  <TableHead className="text-right">Amsterdam Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tariffs?.map((tariff) => (
                  <TableRow key={tariff.id}>
                    <TableCell className="font-medium">{tariff.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {tariff.config_info.cpu} vCPU / {tariff.config_info.ram}GB RAM / {tariff.config_info.hard}GB SSD
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${tariff.msk_prices[0]?.price || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${tariff.ams_prices[0]?.price || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
