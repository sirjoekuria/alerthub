import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { manualPaymentSchema, type ManualPaymentInput } from "@/lib/validations";

interface ManualPaymentDialogProps {
  userId: string;
}

export const ManualPaymentDialog = ({ userId }: ManualPaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    senderName: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const result = manualPaymentSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("messages").insert({
        user_id: userId,
        amount: parseFloat(formData.amount),
        sender_name: formData.senderName.trim(),
        sms_sender: "CASH",
        original_text: `Manual cash payment: ${formData.notes?.trim() || "No notes"}`,
        mpesa_code: `CASH-${Date.now()}`,
        transaction_date: new Date().toISOString(),
        is_read: false,
      });

      if (error) throw error;

      toast({
        title: "Payment Added",
        description: "Manual cash payment has been recorded successfully",
      });

      setFormData({ amount: "", senderName: "", notes: "" });
      setErrors({});
      setOpen(false);
    } catch (error) {
      console.error("Error adding manual payment:", error);
      toast({
        title: "Error",
        description: "Failed to add manual payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setErrors({});
      setFormData({ amount: "", senderName: "", notes: "" });
    }
  };

  const ErrorMessage = ({ field }: { field: string }) => {
    if (!errors[field]) return null;
    return (
      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {errors[field]}
      </p>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Cash Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Cash Payment</DialogTitle>
            <DialogDescription>
              Add a manual payment record for cash transactions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={errors.amount ? "border-destructive" : ""}
              />
              <ErrorMessage field="amount" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="senderName">Sender/Payer Name</Label>
              <Input
                id="senderName"
                placeholder="John Doe"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                className={errors.senderName ? "border-destructive" : ""}
              />
              <ErrorMessage field="senderName" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this payment..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className={errors.notes ? "border-destructive" : ""}
              />
              <ErrorMessage field="notes" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
