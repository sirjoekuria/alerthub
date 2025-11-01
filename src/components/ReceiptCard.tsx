import { Receipt } from '@/hooks/useReceipts';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';

interface ReceiptCardProps {
  receipt: Receipt;
}

export const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  return (
    <Card className="p-6 space-y-4 bg-card border">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <h2 className="text-2xl font-bold text-primary">PAYMENT RECEIPT</h2>
        <p className="text-sm text-muted-foreground mt-1">Thank you for your payment</p>
      </div>

      {/* Receipt Details */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Receipt Number:</span>
          <span className="font-semibold text-foreground">{receipt.receipt_number}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Transaction Code:</span>
          <span className="font-mono text-foreground">{receipt.mpesa_code}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Date & Time:</span>
          <span className="text-foreground">
            {format(new Date(receipt.transaction_date), 'dd MMM yyyy, HH:mm')}
          </span>
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">From:</span>
            <div className="text-right">
              <p className="font-semibold text-foreground">{receipt.sender_name}</p>
              <p className="text-sm text-muted-foreground">{receipt.sender_phone}</p>
            </div>
          </div>
        </div>

        {/* Amount - Highlighted */}
        <div className="bg-primary/10 rounded-lg p-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Amount Received:</span>
            <span className="text-2xl font-bold text-primary">
              KSh {Number(receipt.amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          This is a computer-generated receipt. No signature required.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Receipt generated on {format(new Date(receipt.created_at), 'dd MMM yyyy, HH:mm')}
        </p>
      </div>
    </Card>
  );
};
