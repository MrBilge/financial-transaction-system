"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { ApiError, getErrorMessage } from "@/api/client";
import { deposit, transfer, withdraw } from "@/api/transactions";
import { AccountCombobox } from "@/components/AccountCombobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  formatMoney,
  isValidPositiveAmount,
  normalizeAmountInput,
} from "@/lib/format";
import type { Account, Transaction, TransactionType } from "@/types/api";

const dialogTexts: Record<
  TransactionType,
  { title: string; description: string; submitLabel: string }
> = {
  DEPOSIT: {
    title: "Para Yatır",
    description: "Seçilen hesaba para yatırılır.",
    submitLabel: "Yatır",
  },
  WITHDRAWAL: {
    title: "Para Çek",
    description: "Seçilen hesaptan para çekilir. Bakiye yeterli olmalıdır.",
    submitLabel: "Çek",
  },
  TRANSFER: {
    title: "Para Transferi",
    description: "Kaynak hesaptan hedef hesaba para aktarılır.",
    submitLabel: "Transfer Et",
  },
};

interface MoneyMovementDialogProps {
  type: TransactionType;
  /** Hesap detay sayfasından açıldığında önceden seçili hesap. */
  initialAccount?: Account;
  onClose: () => void;
  /** İşlem kaydedildiğinde (başarılı veya başarısız) listeleri yenilemek için. */
  onTransactionRecorded: () => void;
}

/**
 * Para yatırma, çekme ve transfer formu. Bileşen açıldığında render edilir,
 * kapandığında kaldırılır; böylece form her açılışta temiz başlar.
 */
export const MoneyMovementDialog = ({
  type,
  initialAccount,
  onClose,
  onTransactionRecorded,
}: MoneyMovementDialogProps) => {
  const isTransfer = type === "TRANSFER";
  const isDeposit = type === "DEPOSIT";
  const texts = dialogTexts[type];

  const [sourceAccount, setSourceAccount] = useState<Account | null>(
    isDeposit ? null : (initialAccount ?? null),
  );
  const [targetAccount, setTargetAccount] = useState<Account | null>(
    isDeposit ? (initialAccount ?? null) : null,
  );
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const normalizedAmount = normalizeAmountInput(amountInput);
  const isAmountValid = isValidPositiveAmount(normalizedAmount);

  let submitLabel = texts.submitLabel;
  if (isAmountValid) {
    submitLabel = `${formatMoney(normalizedAmount)} ${texts.submitLabel}`;
  }

  const validateForm = (): string | null => {
    if (!isDeposit && !sourceAccount) {
      return isTransfer ? "Kaynak hesabı seçin." : "Hesap seçin.";
    }
    if ((isDeposit || isTransfer) && !targetAccount) {
      return isTransfer ? "Hedef hesabı seçin." : "Hesap seçin.";
    }
    if (isTransfer && sourceAccount?.id === targetAccount?.id) {
      return "Kaynak ve hedef hesap aynı olamaz.";
    }
    if (!isAmountValid) {
      return "Tutar sıfırdan büyük olmalı ve en fazla 2 ondalık basamak içermelidir (ör. 1250,50).";
    }
    return null;
  };

  const sendRequest = (): Promise<Transaction> => {
    if (type === "DEPOSIT" && targetAccount) {
      return deposit({ accountId: targetAccount.id, amount: normalizedAmount });
    }
    if (type === "WITHDRAWAL" && sourceAccount) {
      return withdraw({ accountId: sourceAccount.id, amount: normalizedAmount });
    }
    if (type === "TRANSFER" && sourceAccount && targetAccount) {
      return transfer({
        sourceAccountId: sourceAccount.id,
        targetAccountId: targetAccount.id,
        amount: normalizedAmount,
      });
    }
    // validateForm bu duruma izin vermez; yine de tip güvenliği için.
    return Promise.reject(new Error("Eksik form bilgisi"));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setRejectionReason(null);

    try {
      const transaction = await sendRequest();
      toast.success(`${texts.title} işlemi tamamlandı`, {
        description: `${transaction.transactionNumber} · ${formatMoney(transaction.amount)}`,
      });
      onTransactionRecorded();
      onClose();
    } catch (error) {
      // 422: iş kuralı ihlali (yetersiz bakiye, pasif hesap). İşlem backend'de
      // FAILED olarak kaydedildiği için listeler yine de yenilenir.
      const isRejected = error instanceof ApiError && error.status === 422;
      if (isRejected) {
        setRejectionReason(error.message);
        onTransactionRecorded();
      } else {
        setErrorMessage(getErrorMessage(error));
      }
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
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{texts.title}</DialogTitle>
          <DialogDescription>{texts.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {rejectionReason && (
            <Alert variant="destructive">
              <AlertTitle>İşlem gerçekleştirilemedi: {rejectionReason}</AlertTitle>
              <AlertDescription>
                Deneme, başarısız işlem olarak işlem geçmişine kaydedildi.
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {!isDeposit && (
            <AccountCombobox
              id="source-account"
              label={isTransfer ? "Kaynak hesap" : "Hesap"}
              selectedAccount={sourceAccount}
              onSelect={setSourceAccount}
              excludedAccountId={targetAccount?.id}
              onlyActive
              disabled={isSubmitting}
            />
          )}

          {(isDeposit || isTransfer) && (
            <AccountCombobox
              id="target-account"
              label={isTransfer ? "Hedef hesap" : "Hesap"}
              selectedAccount={targetAccount}
              onSelect={setTargetAccount}
              excludedAccountId={sourceAccount?.id}
              onlyActive
              disabled={isSubmitting}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Tutar (TRY)</Label>
            <Input
              id="amount"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              autoComplete="off"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Ondalık ayırıcı olarak virgül kullanabilirsiniz (ör. 1.250,50).
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner aria-hidden="true" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
