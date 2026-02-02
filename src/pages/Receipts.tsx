import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReceipts } from '@/hooks/useReceipts';
import { ReceiptCard } from '@/components/ReceiptCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReceiptsSkeleton } from '@/components/skeletons/ReceiptsSkeleton';
import { Pagination } from '@/components/Pagination';

const ITEMS_PER_PAGE = 10;

export default function Receipts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { receipts, loading } = useReceipts(user?.id);
  const [currentPage, setCurrentPage] = useState(1);

  if (loading) {
    return <ReceiptsSkeleton />;
  }

  const totalPages = Math.ceil(receipts.length / ITEMS_PER_PAGE);
  const paginatedReceipts = receipts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Payment Receipts</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {receipts.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Receipts Yet</h2>
            <p className="text-muted-foreground">
              Receipts will appear here when you receive M-PESA payments
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {paginatedReceipts.map((receipt) => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))}
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={receipts.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}
