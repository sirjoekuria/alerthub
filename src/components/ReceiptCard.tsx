import { Receipt } from '@/hooks/useReceipts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Share2, Download, Loader2, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PrintableReceipt } from './PrintableReceipt';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReceiptCardProps {
  receipt: Receipt;
}

export const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!receiptRef.current) return null;

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  };

  const handleDownloadPDF = async (silent = false) => {
    try {
      if (!silent) setIsGeneratingPdf(true);
      const blob = await generatePdfBlob();

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
        toast({
          title: "Receipt Downloaded",
          description: "Your receipt has been successfully saved.",
        });
      }
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (!silent) {
        toast({
          title: "Download Failed",
          description: "There was an error generating your PDF. Please try again.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      if (!silent) setIsGeneratingPdf(false);
    }
  };

  const shareViaNative = async () => {
    try {
      setIsSharing(true);
      const blob = await generatePdfBlob();

      if (!blob) throw new Error("Failed to generate PDF");

      const file = new File([blob], `receipt_${receipt.receipt_number}.pdf`, {
        type: 'application/pdf',
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Payment Receipt',
          text: `Payment Receipt for ${receipt.mpesa_code}`,
        });
        toast({
          title: "Shared Successfully",
          description: "Receipt shared successfully.",
        });
      } else {
        throw new Error("Sharing not supported");
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Share options",
          description: "Please select a specific app to share with.",
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareWithDownload = async (type: 'email' | 'whatsapp' | 'sms') => {
    setIsSharing(true);
    // 1. Auto-download the Receipt first
    const success = await handleDownloadPDF(true); // silent download

    if (success) {
      // 2. Open the specific app
      if (type === 'email') {
        const subject = `Payment Receipt - ${receipt.receipt_number}`;
        const body = `Please find attached the receipt for transaction ${receipt.mpesa_code}.\n\nReceipt Number: ${receipt.receipt_number}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);

        toast({
          title: "PDF Saved",
          description: "Receipt downloaded. Please attach it to your email.",
        });
      } else if (type === 'whatsapp') {
        const message = `*PAYMENT RECEIPT*\nReceipt No: ${receipt.receipt_number}\nTransaction: ${receipt.mpesa_code}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);

        toast({
          title: "PDF Saved",
          description: "Receipt downloaded. Please attach it to your WhatsApp message.",
        });
      } else if (type === 'sms') {
        const message = `Receipt: ${receipt.receipt_number} | ${receipt.mpesa_code}`;
        window.open(`sms:?body=${encodeURIComponent(message)}`);

        toast({
          title: "PDF Saved",
          description: "Receipt downloaded. Please attach it if your messaging app supports files.",
        });
      }
    }
    setIsSharing(false);
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
            <Button variant="default" className="flex-1" disabled={isSharing}>
              {isSharing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={shareViaNative}>
              <Share2 className="w-4 h-4 mr-2" />
              Share File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareWithDownload('email')}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareWithDownload('whatsapp')}>
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareWithDownload('sms')}>
              <MessageCircle className="w-4 h-4 mr-2" />
              SMS
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};