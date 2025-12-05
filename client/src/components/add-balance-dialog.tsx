import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus } from "lucide-react";
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
import { PaymentModal } from "./payment-modal";

export function AddBalanceDialog() {
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    setOpen(false);
    setPaymentOpen(true);
  };

  const handlePaymentComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    toast({
      title: "Balance updated",
      description: "Your payment has been confirmed and your balance has been updated.",
    });
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <>
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
              <Button type="submit" className="w-full sm:w-auto">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${amount || "0"} with Crypto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        amount={parseFloat(amount) || 0}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}
