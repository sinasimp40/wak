import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  message?: string;
}

export function AddBalanceDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showPaymentFrame, setShowPaymentFrame] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPaymentMutation = useMutation({
    mutationFn: async (amount: number): Promise<PaymentResponse> => {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "USD" }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.paymentUrl) {
        setPaymentUrl(data.paymentUrl);
        setShowPaymentFrame(true);
        toast({
          title: "Payment ready",
          description: "Complete your payment in the popup below.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Payment error",
          description: "Could not create payment link. Please try again.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter an amount of at least $1",
      });
      return;
    }
    createPaymentMutation.mutate(amountNum);
  };

  const handleClosePayment = () => {
    setShowPaymentFrame(false);
    setPaymentUrl(null);
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  };

  const quickAmounts = [10, 25, 50, 100];

  if (showPaymentFrame && paymentUrl) {
    return (
      <Dialog open={true} onOpenChange={handleClosePayment}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] h-[80vh] max-h-[700px] p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Complete Payment</h2>
              <p className="text-sm text-muted-foreground">
                Paying ${amount} USD via NOWPayments
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClosePayment}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 h-full">
            <iframe
              src={paymentUrl}
              className="w-full h-full border-0"
              style={{ minHeight: "550px" }}
              title="NOWPayments Payment"
              allow="payment"
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Balance
          </DialogTitle>
          <DialogDescription>
            Add funds to your account using cryptocurrency via NOWPayments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant={amount === String(quickAmount) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(String(quickAmount))}
                >
                  ${quickAmount}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createPaymentMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ${amount || "0"} with Crypto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
