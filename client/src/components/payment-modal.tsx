import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Check, Loader2, QrCode, Clock, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PaymentDetails {
  paymentId: string;
  payAddress: string;
  payAmount: string;
  payCurrency: string;
  expiresAt: string;
  qrCodeUrl: string;
  status: string;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onPaymentComplete: () => void;
}

export function PaymentModal({ open, onOpenChange, amount, onPaymentComplete }: PaymentModalProps) {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();

  const createPaymentMutation = useMutation({
    mutationFn: async (): Promise<PaymentDetails> => {
      const response = await fetch("/api/payments/create-direct", {
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
      setPaymentDetails(data);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error.message,
      });
    },
  });

  const { data: statusData } = useQuery({
    queryKey: ["payment-status", paymentDetails?.paymentId],
    queryFn: async () => {
      if (!paymentDetails?.paymentId) return null;
      const response = await fetch(`/api/payments/status/${paymentDetails.paymentId}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!paymentDetails?.paymentId && open,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (statusData?.status === "finished" || statusData?.status === "confirmed") {
      toast({
        title: "Payment confirmed!",
        description: "Your balance has been updated.",
      });
      onPaymentComplete();
      onOpenChange(false);
    }
  }, [statusData?.status, onPaymentComplete, onOpenChange, toast]);

  useEffect(() => {
    if (open && !paymentDetails) {
      createPaymentMutation.mutate();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPaymentDetails(null);
      setCopied(null);
    }
  }, [open]);

  useEffect(() => {
    if (paymentDetails?.expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expires = new Date(paymentDetails.expiresAt).getTime();
        const diff = Math.max(0, Math.floor((expires - now) / 1000));
        setTimeLeft(diff);
        
        if (diff === 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [paymentDetails?.expiresAt]);

  const copyToClipboard = async (text: string, type: "address" | "amount") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
      toast({
        title: "Copied!",
        description: `${type === "address" ? "Wallet address" : "Amount"} copied to clipboard`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please copy manually",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pay ${amount} with Crypto
          </DialogTitle>
          <DialogDescription>
            Send the exact amount to the address below
          </DialogDescription>
        </DialogHeader>
        
        {createPaymentMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Creating payment...</p>
          </div>
        ) : paymentDetails ? (
          <div className="space-y-4">
            {timeLeft > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2">
                <Clock className="h-4 w-4" />
                <span>Time remaining: <strong className="text-foreground">{formatTime(timeLeft)}</strong></span>
              </div>
            )}
            
            <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
              <img 
                src={paymentDetails.qrCodeUrl} 
                alt="Payment QR Code" 
                className="w-48 h-48"
              />
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Amount to send</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    {paymentDetails.payAmount} {paymentDetails.payCurrency.toUpperCase()}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(paymentDetails.payAmount, "amount")}
                  >
                    {copied === "amount" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Send to address</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-xs break-all">
                    {paymentDetails.payAddress}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(paymentDetails.payAddress, "address")}
                  >
                    {copied === "address" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className={`h-4 w-4 ${statusData ? "animate-spin" : ""}`} />
              <span>Waiting for payment confirmation...</span>
            </div>
          </div>
        ) : createPaymentMutation.isError ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <p className="text-sm text-destructive">Failed to create payment</p>
            <Button onClick={() => createPaymentMutation.mutate()}>
              Try Again
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
