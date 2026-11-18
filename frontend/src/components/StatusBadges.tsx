import { Badge } from "@/components/ui/badge";
import {
  accountStatusLabels,
  transactionStatusLabels,
  transactionTypeLabels,
} from "@/lib/labels";
import type {
  AccountStatus,
  TransactionStatus,
  TransactionType,
} from "@/types/api";

const accountStatusClasses: Record<AccountStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PASSIVE: "bg-slate-100 text-slate-600 border-slate-200",
};

const transactionStatusClasses: Record<TransactionStatus, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
};

const transactionTypeClasses: Record<TransactionType, string> = {
  DEPOSIT: "bg-sky-50 text-sky-700 border-sky-200",
  WITHDRAWAL: "bg-orange-50 text-orange-700 border-orange-200",
  TRANSFER: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export const AccountStatusBadge = ({ status }: { status: AccountStatus }) => {
  return (
    <Badge variant="outline" className={accountStatusClasses[status]}>
      {accountStatusLabels[status]}
    </Badge>
  );
};

export const TransactionStatusBadge = ({
  status,
}: {
  status: TransactionStatus;
}) => {
  return (
    <Badge variant="outline" className={transactionStatusClasses[status]}>
      {transactionStatusLabels[status]}
    </Badge>
  );
};

export const TransactionTypeBadge = ({ type }: { type: TransactionType }) => {
  return (
    <Badge variant="outline" className={transactionTypeClasses[type]}>
      {transactionTypeLabels[type]}
    </Badge>
  );
};
