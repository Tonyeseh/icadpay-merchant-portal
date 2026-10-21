import { type FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { usePaymentLinksStore } from "@/store/usePaymentLinksStore";
import { toast } from "sonner";

export function CreateLinkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = usePaymentLinksStore((s) => s.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [customerChooses, setCustomerChooses] = useState(false);

  function reset() {
    setName(""); setDescription(""); setAmount(""); setRedirectUrl(""); setCustomerChooses(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const link = create({
      name,
      description: description || undefined,
      amount: customerChooses ? null : Math.round(Number(amount) * 100),
      currency: "NGN",
      redirectUrl: redirectUrl || undefined,
    });
    toast.success("Payment link created", {
      description: `pay.icad.ng/${link.slug} is live and ready to share.`,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create payment link</DialogTitle>
          <DialogDescription>
            Generate a hosted checkout you can share with customers — works over WhatsApp, email, or as a QR.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ankara Bundle Pack" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center justify-between rounded-none border border-border bg-muted/40 px-4 py-3">
            <div>
              <Label htmlFor="cc" className="cursor-pointer">Let customer choose amount</Label>
              <p className="text-[11px] text-muted-foreground">Useful for donations or tips.</p>
            </div>
            <Switch id="cc" checked={customerChooses} onCheckedChange={setCustomerChooses} />
          </div>
          {!customerChooses && (
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
                required={!customerChooses}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="redirect">Success redirect URL (optional)</Label>
            <Input id="redirect" type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://yoursite.com/thank-you" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create link</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
