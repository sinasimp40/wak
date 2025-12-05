import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Receipt, 
  RefreshCw, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AddBalanceDialog } from "@/components/add-balance-dialog";

interface Transaction {
  id: string;
  type: "topup" | "purchase";
  amount: string;
  currency: string;
  status: "pending" | "completed" | "failed" | "expired" | "refunded" | "cancelled";
  paymentMethod: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Billing() {
  const { data: transactions, isLoading, refetch, isRefetching } = useQuery<Transaction[]>({
    queryKey: ["/api/payments/transactions"],
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="outline" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20">
            <ArrowUpCircle className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "topup") {
      return <ArrowUpCircle className="h-5 w-5 text-emerald-500" />;
    }
    return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
  };

  const totalDeposits = transactions
    ?.filter((t) => t.type === "topup" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  const pendingDeposits = transactions
    ?.filter((t) => t.type === "topup" && t.status === "pending")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Billing</h1>
          <p className="text-muted-foreground mt-1">
            View your payment history and transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <AddBalanceDialog />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Deposited</CardDescription>
            <CardTitle className="text-2xl font-mono">${totalDeposits.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Deposits</CardDescription>
            <CardTitle className="text-2xl font-mono">${pendingDeposits.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            {transactions?.length || 0} transaction{transactions?.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                      {getTypeIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {tx.type === "topup" ? "Deposit" : "Purchase"}
                        </span>
                        {getStatusBadge(tx.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{formatDate(tx.createdAt)}</span>
                        {tx.paymentMethod && (
                          <>
                            <span>|</span>
                            <span className="capitalize">{tx.paymentMethod}</span>
                          </>
                        )}
                        {tx.externalId && (
                          <>
                            <span>|</span>
                            <span className="font-mono text-xs">ID: {tx.externalId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-semibold ${tx.type === "topup" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {tx.type === "topup" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">{tx.currency}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No transactions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add funds to your account to get started
              </p>
              <AddBalanceDialog />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
