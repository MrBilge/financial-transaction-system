"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { createAccount } from "@/api/accounts";
import { getErrorMessage } from "@/api/client";
import { getCustomers } from "@/api/customers";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { formatAccountNumber } from "@/lib/format";
import type { Account, Customer } from "@/types/api";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 300;

interface NewAccountDialogProps {
  onClose: () => void;
  onCreated: (account: Account) => void;
}

/** Müşteri arayıp seçerek yeni hesap açma formu. */
export const NewAccountDialog = ({ onClose, onCreated }: NewAccountDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedSearchTerm = searchTerm.trim();
  const canSearch = trimmedSearchTerm.length >= MIN_SEARCH_LENGTH;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    if (value.trim().length < MIN_SEARCH_LENGTH) {
      setCustomerResults([]);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm("");
    setCustomerResults([]);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCustomer) {
      setErrorMessage("Hesap açılacak müşteriyi seçin.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const account = await createAccount({ customerId: selectedCustomer.id });
      toast.success("Yeni hesap açıldı", {
        description: `${selectedCustomer.firstName} ${selectedCustomer.lastName} · ${formatAccountNumber(account.accountNumber)}`,
      });
      onCreated(account);
      onClose();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      onClose();
    }
  };

  // Yazma bittikten kısa süre sonra müşteri araması yapılır.
  useEffect(() => {
    if (!canSearch) {
      return;
    }

    let isCancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await getCustomers({ search: trimmedSearchTerm, limit: 5 });
        if (!isCancelled) {
          setCustomerResults(response.data);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, SEARCH_DELAY_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [canSearch, trimmedSearchTerm]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Hesap</DialogTitle>
          <DialogDescription>
            Hesap numarası otomatik üretilir. Hesap 0,00 TL bakiye ile aktif olarak açılır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {selectedCustomer ? (
            <div className="space-y-2">
              <Label>Müşteri</Label>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedCustomer.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                  disabled={isSubmitting}
                >
                  <X aria-hidden="true" />
                  Değiştir
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="customer-search">Müşteri</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="customer-search"
                  value={searchTerm}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Ad, soyad veya e-posta ile arayın"
                  autoComplete="off"
                  className="pl-9"
                />
              </div>

              {isSearching && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner aria-hidden="true" /> Aranıyor...
                </p>
              )}

              {canSearch && !isSearching && customerResults.length === 0 && (
                <p className="text-xs text-muted-foreground">Eşleşen müşteri bulunamadı.</p>
              )}

              {customerResults.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {customerResults.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="block font-medium">
                          {customer.firstName} {customer.lastName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {customer.email}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner aria-hidden="true" />}
              Hesap Aç
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
