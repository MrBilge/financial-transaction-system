"use client";

import Link from "next/link";

import {
  TransactionStatusBadge,
  TransactionTypeBadge,
} from "@/components/StatusBadges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAccountNumber, formatDateTime, formatMoney } from "@/lib/format";
import type { Transaction } from "@/types/api";

interface TransactionDetailsDialogProps {
  transaction: Transaction;
  onClose: () => void;
}

interface AccountLinkProps {
  accountId: string | null;
  accountNumber: string | null;
  onNavigate: () => void;
}

/** Hesap numarası; tıklanınca hesap detayına gider. Hesap yoksa "—" gösterilir. */
const AccountLink = ({ accountId, accountNumber, onNavigate }: AccountLinkProps) => {
  if (!accountId || !accountNumber) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Link
      href={`/accounts/${accountId}`}
      className="font-mono text-primary hover:underline"
      onClick={onNavigate}
    >
      {formatAccountNumber(accountNumber)}
    </Link>
  );
};

/** İşlem detayı. Hesap numaraları işlem yanıtında geldiği için ek istek yapılmaz. */
export const TransactionDetailsDialog = ({
  transaction,
  onClose,
}: TransactionDetailsDialogProps) => {
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>İşlem Detayı</DialogTitle>
          <DialogDescription className="font-mono">
            {transaction.transactionNumber}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Tür</dt>
          <dd>
            <TransactionTypeBadge type={transaction.type} />
          </dd>

          <dt className="text-muted-foreground">Durum</dt>
          <dd className="space-y-1">
            <TransactionStatusBadge status={transaction.status} />
            {transaction.failureReason && (
              <p className="text-destructive">{transaction.failureReason}</p>
            )}
          </dd>

          <dt className="text-muted-foreground">Tutar</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(transaction.amount)}</dd>

          <dt className="text-muted-foreground">Kaynak hesap</dt>
          <dd>
            <AccountLink
              accountId={transaction.sourceAccountId}
              accountNumber={transaction.sourceAccountNumber}
              onNavigate={onClose}
            />
          </dd>

          <dt className="text-muted-foreground">Hedef hesap</dt>
          <dd>
            <AccountLink
              accountId={transaction.targetAccountId}
              accountNumber={transaction.targetAccountNumber}
              onNavigate={onClose}
            />
          </dd>

          <dt className="text-muted-foreground">Tarih</dt>
          <dd>{formatDateTime(transaction.createdAt)}</dd>
        </dl>
      </DialogContent>
    </Dialog>
  );
};
