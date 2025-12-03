import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Server, 
  MapPin, 
  Monitor, 
  Calendar, 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Plus,
  Minus,
  Check,
  Loader2,
  Zap,
  Shield,
  Database,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OneDashTariff } from "@shared/schema";

interface TariffWithPricing extends OneDashTariff {
  displayPrice: number;
  originalPrice: number;
  discount: number;
}

export default function CreateVps() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedTariff, setSelectedTariff] = useState<number | null>(null);
  const [location, setLocationValue] = useState<"msk" | "ams">("msk");
  const [system, setSystem] = useState("");
  const [period, setPeriod] = useState(30);
  const [count, setCount] = useState(1);
  const [processor, setProcessor] = useState<"intel" | "amd">("intel");
  const [additionalOptions, setAdditionalOptions] = useState({
    staticIp: false,
    nvme: false,
    backup: false,
  });

  const { data: tariffs, isLoading: tariffsLoading } = useQuery<OneDashTariff[]>({
    queryKey: ["/api/tariffs"],
  });

  const { data: systems, isLoading: systemsLoading } = useQuery<string[]>({
    queryKey: ["/api/systems"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/orders", data);
    },
    onSuccess: () => {
      toast({ title: "VPS Created!", description: "Your VPS order has been placed successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setLocation("/orders");
    },
    onError: (error: Error) => {
      toast({ title: "Creation failed", description: error.message, variant: "destructive" });
    },
  });

  const getPrice = (tariff: OneDashTariff, loc: "msk" | "ams", days: number): { price: number; discount: number } => {
    const prices = loc === "msk" ? tariff.msk_prices : tariff.ams_prices;
    
    // Find the best matching price tier
    const sortedPrices = [...prices].sort((a, b) => a.period - b.period);
    let priceInfo = sortedPrices[0];
    
    for (const p of sortedPrices) {
      if (days >= p.period) {
        priceInfo = p;
      }
    }
    
    // Calculate price proportionally
    const dailyRate = priceInfo.price / priceInfo.period;
    const basePrice = dailyRate * days;
    const discount = priceInfo.discount || 0;
    const finalPrice = basePrice * (1 - discount / 100);
    
    return { price: Math.round(finalPrice * 100) / 100, discount };
  };

  const selectedTariffData = tariffs?.find((t) => t.id === selectedTariff);
  const priceInfo = selectedTariffData ? getPrice(selectedTariffData, location, period) : null;
  const totalPrice = priceInfo ? priceInfo.price * count : 0;

  const getOsDisplayName = (os: string) => {
    const names: Record<string, string> = {
      windows_10_en: "Windows 10 (English)",
      windows_10_ru: "Windows 10 (Russian)",
      windows_11_en: "Windows 11 (English)",
      windows_11_ru: "Windows 11 (Russian)",
    };
    return names[os] || os;
  };

  const handleSubmit = () => {
    if (!selectedTariff || !system) {
      toast({ title: "Missing fields", description: "Please select a tariff and operating system.", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      tariffId: selectedTariff,
      location,
      system,
      period,
      count,
      processor,
      additionalOptions,
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold">Create VPS</h1>
        <p className="text-muted-foreground mt-1">
          Configure and deploy your Windows virtual private server
        </p>
      </div>

      <div className="grid gap-6">
        {/* Tariff Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Select Tariff
            </CardTitle>
            <CardDescription>
              Choose the hardware configuration for your VPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tariffsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : (
              <RadioGroup
                value={selectedTariff?.toString()}
                onValueChange={(val) => setSelectedTariff(parseInt(val))}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {tariffs?.map((tariff) => {
                  const price = getPrice(tariff, location, period);
                  return (
                    <div key={tariff.id}>
                      <RadioGroupItem
                        value={tariff.id.toString()}
                        id={`tariff-${tariff.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`tariff-${tariff.id}`}
                        className="flex flex-col cursor-pointer rounded-lg border-2 p-4 hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        data-testid={`tariff-card-${tariff.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-lg">{tariff.name}</span>
                          {selectedTariff === tariff.id && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Cpu className="h-4 w-4" />
                            <span>{tariff.config_info.cpu} vCPU</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MemoryStick className="h-4 w-4" />
                            <span>{tariff.config_info.ram} GB RAM</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="h-4 w-4" />
                            <span>{tariff.config_info.hard} GB SSD</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold font-mono">${price.price.toFixed(2)}</span>
                            <span className="text-muted-foreground text-sm">/{period} days</span>
                          </div>
                          {price.discount > 0 && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              {price.discount}% discount applied
                            </span>
                          )}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Location Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Data Center Location
            </CardTitle>
            <CardDescription>
              Choose the nearest location for best performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={location}
              onValueChange={(val) => setLocationValue(val as "msk" | "ams")}
              className="grid gap-4 md:grid-cols-2"
            >
              <div>
                <RadioGroupItem value="msk" id="loc-msk" className="peer sr-only" />
                <Label
                  htmlFor="loc-msk"
                  className="flex items-center gap-4 cursor-pointer rounded-lg border-2 p-4 hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  data-testid="location-msk"
                >
                  <span className="text-2xl">🇷🇺</span>
                  <div className="flex-1">
                    <div className="font-medium">Moscow, Russia</div>
                    <div className="text-sm text-muted-foreground">Low latency for Eastern Europe & Asia</div>
                  </div>
                  {location === "msk" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="ams" id="loc-ams" className="peer sr-only" />
                <Label
                  htmlFor="loc-ams"
                  className="flex items-center gap-4 cursor-pointer rounded-lg border-2 p-4 hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  data-testid="location-ams"
                >
                  <span className="text-2xl">🇳🇱</span>
                  <div className="flex-1">
                    <div className="font-medium">Amsterdam, Netherlands</div>
                    <div className="text-sm text-muted-foreground">Low latency for Western Europe & Americas</div>
                  </div>
                  {location === "ams" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Operating System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Operating System
            </CardTitle>
            <CardDescription>
              Select the Windows version for your VPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {systemsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={system} onValueChange={setSystem}>
                <SelectTrigger className="w-full" data-testid="select-os">
                  <SelectValue placeholder="Choose an operating system" />
                </SelectTrigger>
                <SelectContent>
                  {systems?.map((os) => (
                    <SelectItem key={os} value={os}>
                      {getOsDisplayName(os)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Period & Count */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rental Period & Quantity
            </CardTitle>
            <CardDescription>
              Configure the duration and number of VPS instances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Rental Period</Label>
                <span className="font-mono font-medium">{period} days</span>
              </div>
              <Slider
                value={[period]}
                onValueChange={(val) => setPeriod(val[0])}
                min={7}
                max={360}
                step={1}
                className="w-full"
                data-testid="slider-period"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>7 days</span>
                <span>360 days</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Number of VPS</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCount(Math.max(1, count - 1))}
                    disabled={count <= 1}
                    data-testid="button-decrease-count"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-mono font-medium w-8 text-center">{count}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCount(Math.min(10, count + 1))}
                    disabled={count >= 10}
                    data-testid="button-increase-count"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum 10 VPS per order
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Processor Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Processor Type
            </CardTitle>
            <CardDescription>
              Choose your preferred CPU architecture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={processor}
              onValueChange={(val) => setProcessor(val as "intel" | "amd")}
              className="grid gap-4 md:grid-cols-2"
            >
              <div>
                <RadioGroupItem value="intel" id="proc-intel" className="peer sr-only" />
                <Label
                  htmlFor="proc-intel"
                  className="flex items-center gap-4 cursor-pointer rounded-lg border-2 p-4 hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  data-testid="processor-intel"
                >
                  <div className="flex-1">
                    <div className="font-medium">Intel Xeon</div>
                    <div className="text-sm text-muted-foreground">Enterprise-grade reliability</div>
                  </div>
                  {processor === "intel" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </Label>
              </div>
              <div>
                <RadioGroupItem value="amd" id="proc-amd" className="peer sr-only" />
                <Label
                  htmlFor="proc-amd"
                  className="flex items-center gap-4 cursor-pointer rounded-lg border-2 p-4 hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  data-testid="processor-amd"
                >
                  <div className="flex-1">
                    <div className="font-medium">AMD EPYC</div>
                    <div className="text-sm text-muted-foreground">High performance computing</div>
                  </div>
                  {processor === "amd" && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Additional Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Additional Options
            </CardTitle>
            <CardDescription>
              Enhance your VPS with premium features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Static IP Address</div>
                  <div className="text-sm text-muted-foreground">Dedicated IP that never changes</div>
                </div>
              </div>
              <Switch
                checked={additionalOptions.staticIp}
                onCheckedChange={(checked) =>
                  setAdditionalOptions({ ...additionalOptions, staticIp: checked })
                }
                data-testid="switch-static-ip"
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">NVMe Storage</div>
                  <div className="text-sm text-muted-foreground">Ultra-fast SSD storage</div>
                </div>
              </div>
              <Switch
                checked={additionalOptions.nvme}
                onCheckedChange={(checked) =>
                  setAdditionalOptions({ ...additionalOptions, nvme: checked })
                }
                data-testid="switch-nvme"
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Automatic Backups</div>
                  <div className="text-sm text-muted-foreground">Daily automated backups</div>
                </div>
              </div>
              <Switch
                checked={additionalOptions.backup}
                onCheckedChange={(checked) =>
                  setAdditionalOptions({ ...additionalOptions, backup: checked })
                }
                data-testid="switch-backup"
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedTariffData ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tariff</span>
                    <span className="font-medium">{selectedTariffData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{location === "msk" ? "Moscow" : "Amsterdam"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span className="font-medium">{period} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-medium">{count} VPS</span>
                  </div>
                  {priceInfo && priceInfo.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Discount</span>
                      <span>-{priceInfo.discount}%</span>
                    </div>
                  )}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold font-mono">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Select a tariff to see pricing
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={createMutation.isPending || !selectedTariff || !system}
          className="w-full"
          data-testid="button-create-order"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Server className="h-4 w-4 mr-2" />
          )}
          Create VPS Order
        </Button>
      </div>
    </div>
  );
}
