
import React from 'react';
import { Receipt } from '@/hooks/useReceipts';
import { format } from 'date-fns';

interface PrintableReceiptProps {
  receipt: Receipt;
  logoUrl?: string; // Optional logo
}

// Using a forwardRef to allow the parent to capture this component
export const PrintableReceipt = React.forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ receipt }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[794px] min-h-[1123px] bg-slate-100 p-8 flex justify-center items-start"
        id="printable-receipt"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <div className="bg-white w-[500px] shadow-lg p-8 rounded-none border-t-8 border-green-600">
          {/* Header Section */}
          <div className="text-center border-b border-dashed border-gray-200 pb-8 mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">M-PESA CONFIRMED</h1>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Transaction Receipt</p>
            <div className="mt-6 inline-block bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
              <span className="text-sm text-green-700 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                SUCCESSFUL
              </span>
            </div>
          </div>

          {/* Amount Section */}
          <div className="text-center mb-8">
            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Total Amount</span>
            <h2 className="text-5xl font-bold text-slate-900 mt-2">
              <span className="text-2xl font-medium text-slate-400 align-top mr-1">KES</span>
              {Number(receipt.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </h2>
          </div>

          {/* Details Table */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Receipt No.</span>
              <span className="font-mono text-slate-900 font-bold">{receipt.receipt_number}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Transaction Code</span>
              <span className="font-mono text-slate-900 font-bold bg-slate-50 px-2 py-0.5 rounded">{receipt.mpesa_code}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Date</span>
              <span className="text-slate-900 font-medium">{format(new Date(receipt.transaction_date), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Time</span>
              <span className="text-slate-900 font-medium">{format(new Date(receipt.transaction_date), 'HH:mm a')}</span>
            </div>
          </div>

          {/* Sender Details */}
          <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Sender Details</h3>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                {receipt.sender_name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{receipt.sender_name}</p>
                <p className="text-slate-500 font-mono">{receipt.sender_phone}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-dashed border-gray-200">
            <p className="text-xs text-slate-400 mb-2 font-medium">Thank you for using our service</p>
            <div className="flex justify-center items-center gap-2 text-[10px] text-slate-300 uppercase tracking-widest">
              <span>M-PESA Alert Hub</span>
              <span>•</span>
              <span>Official Receipt</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableReceipt.displayName = "PrintableReceipt";
