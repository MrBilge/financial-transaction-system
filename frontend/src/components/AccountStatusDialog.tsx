"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updateAccountStatus } from "@/api/accounts";
import { getErrorMessage } from "@/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatAccountNumber } from "@/lib/format";
import type { Account } from "@/types/api";

interface AccountStatusDialogProps {
  account: Account;
  onClose: () => void;
  onUpdated: (account: Account) => void;
}

/** Hesabı aktif / pasif yapmadan önce onay ister. Hesap listesi ve detayında kullanılır. */
export const AccountStatusDialog = ({
  account,
  onClose,
  onUpdated,
}: AccountStatusDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCurrentlyActive = account.status === "ACTIVE";
  const nextStatus = isCurrentlyActive ? "PASSIVE" : "ACTIVE";
  const formattedAccountNumber = formatAccountNumber(account.accountNumber);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const updatedAccount = await updateAccountStatus(account.id, {
        status: nextStatus,
      });
      toast.success(
        isCurrentlyActive ? "Hesap pasif yapıldı" : "Hesap aktif yapıldı",
        { description: formattedAccountNumber },
      );
      onUpdated(updatedAccount);
      onClose();
    } catch (error) {
      toast.error("Hesap durumu değiştirilemedi", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      onClose();
    }
  };

  return (
    <AlertDialog open onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isCurrentlyActive ? "Hesap pasif yapılsın mı?" : "Hesap aktif yapılsın mı?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCurrentlyActive
              ? `${formattedAccountNumber} numaralı hesap pasif yapıldığında bu hesapla para yatırma, çekme ve transfer yapılamaz. Bakiye korunur.`
              : `${formattedAccountNumber} numaralı hesap tekrar para hareketlerine açılacak.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            variant={isCurrentlyActive ? "destructive" : "default"}
            onClick={(event) => {
              // Dialog'un hemen kapanmasını engeller; istek bitince kapatılır.
              event.preventDefault();
              handleConfirm();
            }}
            disabled={isSubmitting}
          >
            {isCurrentlyActive ? "Pasif Yap" : "Aktif Yap"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
