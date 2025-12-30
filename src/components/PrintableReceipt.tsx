
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
        className="w-[794px] min-h-[1123px] bg-white p-12 text-slate-900 border border-gray-200 shadow-sm mx-auto"
        id="printable-receipt"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">M-PESA PAYMENT</h1>
            <p className="text-sm text-gray-500 font-medium">OFFICIAL RECEIPT</p>
          </div>
          <div className="text-right">
            <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 inline-block">
               <span className="text-sm text-green-700 font-bold block">PAID</span>
            </div>
          </div>
        </div>

        {/* Company & Receipt Info */}
        <div className="flex justify-between mb-12 border-b border-gray-100 pb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">BILLED TO</h3>
            <p className="text-lg font-semibold">{receipt.sender_name}</p>
            <p className="text-gray-600">{receipt.sender_phone}</p>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">RECEIPT NUMBER</span>
              <span className="font-mono text-lg">{receipt.receipt_number}</span>
            </div>
            <div>
               <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">DATE</span>
               <span>{format(new Date(receipt.transaction_date), 'dd MMM yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Transaction Details Table */}
        <div className="mb-12">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="text-right py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                <th className="text-right py-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-50">
                <td className="py-6">
                  <p className="font-medium text-slate-800">M-Pesa Transaction</p>
                  <p className="text-sm text-gray-500 mt-1">Payment received via M-Pesa Service</p>
                </td>
                <td className="text-right py-6 font-mono text-slate-600">
                  {receipt.mpesa_code}
                </td>
                <td className="text-right py-6 font-bold text-slate-800">
                   KSh {Number(receipt.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-16">
          <div className="w-1/2 ">
             <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">KSh {Number(receipt.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
             </div>
             <div className="flex justify-between py-3 border-b border-slate-100">
                <span className="text-gray-600">Transaction Fee</span>
                <span className="font-medium">KSh 0.00</span>
             </div>
             <div className="flex justify-between py-4">
                <span className="text-xl font-bold text-slate-900">Total</span>
                <span className="text-xl font-bold text-green-600">KSh {Number(receipt.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-slate-100 text-center">
          <p className="text-sm text-gray-500 mb-2">Thank you for your business!</p>
          <div className="flex justify-center items-center gap-4 text-xs text-gray-400">
            <span>Powered by MPESA Alert Hub</span>
            <span>•</span>
            <span>Generated on {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
          </div>
        </div>
      </div>
    );
  }
);

PrintableReceipt.displayName = "PrintableReceipt";
