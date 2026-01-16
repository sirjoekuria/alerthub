import { Receipt } from '@/hooks/useReceipts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Share2, Download, Loader2, Mail, MessageCircle } from 'lucide-react';
import { Receipt } from '@/hooks/useReceipts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Share2, Download, Loader2, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PrintableReceipt } from './PrintableReceipt';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ReceiptCardProps {
  receipt: Receipt;
}

export const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const generatePdfBlob = async (scale = 2): Promise<Blob | null> => {
    if (!receiptRef.current) return null;

    // Slight delay to ensure UI updates (e.g. dropdown closes) before heavy lift
    await new Promise(resolve => setTimeout(resolve, 100));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      scale: scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    };
    const canvas = await html2canvas(receiptRef.current, options);

    const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG with 0.8 quality
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  };

  const handleDownloadPDF = async (silent = false) => {
    try {
      if (!silent) setIsGeneratingPdf(true);

      // Use higher quality (scale 2) for direct downloads, slightly lower (1.5) for sharing speed
      const blob = await generatePdfBlob(silent ? 1.5 : 2);

      if (!blob) throw new Error("Failed to generate PDF");

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${receipt.receipt_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (!silent) {
        toast.success("Receipt Downloaded", {
          description: "Your receipt has been successfully saved.",
        });
      }
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (!silent) {
        toast.error("Download Failed", {
          description: "There was an error generating your PDF. Please try again.",
        });
      }
      return false;
    } finally {
      if (!silent) setIsGeneratingPdf(false);
    }
  };

  const shareViaNative = async () => {
    setIsSharing(true);
    try {
      const blob = await generatePdfBlob(3); // Higher quality for sharing
      if (!blob) throw new Error('Failed to generate receipt');

      const file = new File([blob], `receipt_${receipt.receipt_number}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Receipt - ${receipt.receipt_number}`,
          text: `Payment Receipt for ${receipt.mpesa_code}`
        });
        toast.success("Receipt shared successfully");
      } else {
        // Fallback or explicit instruction
        toast.error("Sharing files is not supported on this device/browser");
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error("Failed to share receipt");
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareWithDownload = async (type: 'email' | 'whatsapp' | 'sms') => {
    setIsSharing(true);
    try {
      const text = `Receipt: ${receipt.receipt_number}\nAmount: ${receipt.amount}\nCode: ${receipt.mpesa_code}`;
      let url = '';

      switch (type) {
        case 'email':
          url = `mailto:?subject=Receipt ${receipt.receipt_number}&body=${encodeURIComponent(text)}`;
          break;
        case 'whatsapp':
          url = `https://wa.me/?text=${encodeURIComponent(text)}`;
          break;
        case 'sms':
          url = `sms:?body=${encodeURIComponent(text)}`;
          break;
      }

      window.open(url, '_blank');
      toast.success("Opening share link...");
    } catch (error) {
      console.error('Error sharing link:', error);
      toast.error("Failed to open share link");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden container for PDF generation */}
      <div className="absolute top-0 left-0 overflow-hidden h-0 w-0">
        <PrintableReceipt ref={receiptRef} receipt={receipt} />
      </div>

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

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => handleDownloadPDF(false)}
          disabled={isGeneratingPdf || isSharing}
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" disabled={isSharing}>
              {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
              Share Receipt
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={shareViaNative} className="cursor-pointer font-medium">
              <Share2 className="w-4 h-4 mr-2" /> Share Receipt Image
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleShareWithDownload('whatsapp')} className="cursor-pointer">
              <Share2 className="w-4 h-4 mr-2" /> WhatsApp Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareWithDownload('email')} className="cursor-pointer">
              <Mail className="w-4 h-4 mr-2" /> Email Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};