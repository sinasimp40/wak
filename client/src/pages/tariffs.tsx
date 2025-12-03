import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Package, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  MapPin,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { OneDashTariff } from "@shared/schema";

export default function Tariffs() {
  const [selectedLocation, setSelectedLocation] = useState<"msk" | "ams">("msk");

  const { data: tariffs, isLoading, refetch, isRefetching } = useQuery<OneDashTariff[]>({
    queryKey: ["/api/tariffs"],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Tariffs</h1>
          <p className="text-muted-foreground mt-1">
            View available VPS configurations and pricing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-tariffs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild>
            <Link href="/create">
              Create VPS
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Location Tabs */}
      <Tabs value={selectedLocation} onValueChange={(v) => setSelectedLocation(v as "msk" | "ams")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="msk" className="gap-2" data-testid="tab-msk">
            <span>🇷🇺</span> Moscow
          </TabsTrigger>
          <TabsTrigger value="ams" className="gap-2" data-testid="tab-ams">
            <span>🇳🇱</span> Amsterdam
          </TabsTrigger>
        </TabsList>

        <TabsContent value="msk" className="mt-6">
          <TariffGrid tariffs={tariffs} location="msk" isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="ams" className="mt-6">
          <TariffGrid tariffs={tariffs} location="ams" isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TariffGrid({ 
  tariffs, 
  location, 
  isLoading 
}: { 
  tariffs?: OneDashTariff[]; 
  location: "msk" | "ams";
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (!tariffs || tariffs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No tariffs available</h3>
          <p className="text-sm text-muted-foreground">
            Please try again later
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cards View */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tariffs.map((tariff, index) => {
          const prices = location === "msk" ? tariff.msk_prices : tariff.ams_prices;
          const basePrice = prices[0];

          return (
            <Card 
              key={tariff.id} 
              className={index === 1 ? "border-primary relative" : ""}
              data-testid={`tariff-${tariff.id}`}
            >
              {index === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{tariff.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location === "msk" ? "Moscow" : "Amsterdam"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Specs */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Cpu className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{tariff.config_info.cpu} vCPU</div>
                      <div className="text-xs text-muted-foreground">Virtual CPU Cores</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <MemoryStick className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{tariff.config_info.ram} GB</div>
                      <div className="text-xs text-muted-foreground">DDR4 RAM</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <HardDrive className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{tariff.config_info.hard} GB</div>
                      <div className="text-xs text-muted-foreground">SSD Storage</div>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="border-t pt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono">
                      ${basePrice.price}
                    </span>
                    <span className="text-muted-foreground">/{basePrice.period} days</span>
                  </div>
                  {basePrice.discount > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      {basePrice.discount}% discount available
                    </Badge>
                  )}
                </div>

                <Button asChild className="w-full" variant={index === 1 ? "default" : "outline"}>
                  <Link href="/create">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Pricing</CardTitle>
          <CardDescription>
            Pricing varies by rental period - longer periods receive discounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tariff</TableHead>
                <TableHead>Specs</TableHead>
                {tariffs[0] && (location === "msk" ? tariffs[0].msk_prices : tariffs[0].ams_prices).map((p) => (
                  <TableHead key={p.period} className="text-right">
                    {p.period} days
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.map((tariff) => {
                const prices = location === "msk" ? tariff.msk_prices : tariff.ams_prices;
                return (
                  <TableRow key={tariff.id}>
                    <TableCell className="font-medium">{tariff.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {tariff.config_info.cpu} CPU / {tariff.config_info.ram}GB RAM / {tariff.config_info.hard}GB
                    </TableCell>
                    {prices.map((p) => (
                      <TableCell key={p.period} className="text-right">
                        <div className="font-mono font-medium">${p.price}</div>
                        {p.discount > 0 && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400">
                            -{p.discount}%
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
