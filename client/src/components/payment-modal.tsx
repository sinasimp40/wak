import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Check, Loader2, QrCode, Clock, RefreshCw, ChevronRight, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const POPULAR_CURRENCIES = [
  { value: "btc", label: "Bitcoin", icon: "₿" },
  { value: "eth", label: "Ethereum", icon: "Ξ" },
  { value: "ltc", label: "Litecoin", icon: "Ł" },
  { value: "usdt", label: "Tether (USDT)", icon: "₮" },
  { value: "trx", label: "Tron", icon: "T" },
  { value: "bnb", label: "BNB", icon: "B" },
  { value: "xrp", label: "XRP", icon: "X" },
  { value: "doge", label: "Dogecoin", icon: "Ð" },
  { value: "sol", label: "Solana", icon: "S" },
  { value: "matic", label: "Polygon", icon: "P" },
];

export function PaymentModal({ open, onOpenChange, amount, onPaymentComplete }: PaymentModalProps) {
  const [step, setStep] = useState<"choose" | "deposit">("choose");
  const [selectedCurrency, setSelectedCurrency] = useState("btc");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();

  const { data: currenciesData } = useQuery({
    queryKey: ["payment-currencies"],
    queryFn: async () => {
      const response = await fetch("/api/payments/currencies", {
        credentials: "include",
      });
      if (!response.ok) return { currencies: POPULAR_CURRENCIES.map(c => c.value) };
      return response.json();
    },
    enabled: open,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (): Promise<PaymentDetails> => {
      const response = await fetch("/api/payments/create-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "USD", payCurrency: selectedCurrency }),
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
      setStep("deposit");
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
    enabled: !!paymentDetails?.paymentId && open && step === "deposit",
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
    if (!open) {
      setStep("choose");
      setPaymentDetails(null);
      setCopied(null);
      setNotifyEmail("");
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

  const handleNextStep = () => {
    createPaymentMutation.mutate();
  };

  const getCurrencyInfo = (value: string) => {
    return POPULAR_CURRENCIES.find(c => c.value === value) || { value, label: value.toUpperCase(), icon: value[0]?.toUpperCase() };
  };

  const availableCurrencies = currenciesData?.currencies 
    ? POPULAR_CURRENCIES.filter(c => currenciesData.currencies.includes(c.value))
    : POPULAR_CURRENCIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pay ${amount} with Crypto
          </DialogTitle>
          <DialogDescription>
            {step === "choose" ? "Choose your payment method" : "Send the exact amount to complete payment"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${step === "choose" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            1. Choose asset
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${step === "deposit" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            2. Send deposit
          </div>
        </div>
        
        {step === "choose" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select cryptocurrency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      const curr = getCurrencyInfo(selectedCurrency);
                      return (
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                            {curr.icon}
                          </span>
                          <span>{curr.label}</span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {currency.icon}
                        </span>
                        <span>{currency.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Amount to pay</div>
              <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Get notified when payment is received</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email for status updates"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <Button 
              onClick={handleNextStep} 
              className="w-full" 
              size="lg"
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating payment...
                </>
              ) : (
                <>
                  Next step
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
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
                  <div className="flex-1 p-3 bg-muted rounded-lg">
                    <div className="font-mono text-lg font-bold">
                      {paymentDetails.payAmount} {paymentDetails.payCurrency.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">~ ${amount}</div>
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
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
              <RefreshCw className={`h-4 w-4 ${statusData ? "animate-spin" : ""}`} />
              <span>Waiting for payment confirmation...</span>
            </div>

            <div className="text-center text-xs text-muted-foreground pt-2">
              Powered by <span className="font-semibold">NOWPayments</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
