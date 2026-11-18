"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";

import { getAccounts } from "@/api/accounts";
import { getErrorMessage } from "@/api/client";
import { AccountStatusBadge } from "@/components/StatusBadges";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { formatAccountNumber, formatMoney } from "@/lib/format";
import type { Account } from "@/types/api";

const RESULT_LIMIT = 20;
const SEARCH_DELAY_MS = 300;

interface AccountComboboxProps {
  id: string;
  label: string;
  selectedAccount: Account | null;
  onSelect: (account: Account) => void;
  /** true ise yalnızca aktif hesaplar listelenir (para hareketleri için). */
  onlyActive?: boolean;
  /** Seçilemeyecek hesap (ör. transferde diğer alanda seçili olan hesap). */
  excludedAccountId?: string;
  disabled?: boolean;
}

const getCustomerName = (account: Account): string => {
  return `${account.customer.firstName} ${account.customer.lastName}`;
};

/**
 * Hesap seçme alanı (shadcn Combobox: Popover + Command).
 * Açıldığında hesaplar listelenir; müşteri adı, soyadı veya hesap numarasıyla
 * aranabilir. Arama backend'de yapılır.
 */
export const AccountCombobox = ({
  id,
  label,
  selectedAccount,
  onSelect,
  onlyActive = false,
  excludedAccountId,
  disabled = false,
}: AccountComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedSearchTerm = searchTerm.trim();

  const handleOpenChange = (nextIsOpen: boolean) => {
    // Açılırken liste hemen "yükleniyor" gösterir; kapanırken arama sıfırlanır.
    if (nextIsOpen) {
      setIsLoading(true);
    } else {
      setSearchTerm("");
    }
    setIsOpen(nextIsOpen);
  };

  const handleSelect = (account: Account) => {
    onSelect(account);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Liste yalnızca açıkken yüklenir. Yazarken her tuşta değil, kısa bir
  // beklemeden sonra arama yapılır; ilk açılışta beklemeden yüklenir.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;
    const delay = trimmedSearchTerm ? SEARCH_DELAY_MS : 0;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getAccounts({
          search: trimmedSearchTerm || undefined,
          status: onlyActive ? "ACTIVE" : undefined,
          limit: RESULT_LIMIT,
        });
        if (!isCancelled) {
          setAccounts(response.data);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, delay);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, trimmedSearchTerm, onlyActive]);

  const renderOptions = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" /> Hesaplar yükleniyor...
        </div>
      );
    }

    if (errorMessage) {
      return <p className="px-3 py-6 text-center text-sm text-destructive">{errorMessage}</p>;
    }

    return (
      <>
        <CommandEmpty>Eşleşen hesap bulunamadı.</CommandEmpty>
        {accounts.map((account) => {
          const isExcluded = account.id === excludedAccountId;
          const isSelected = account.id === selectedAccount?.id;

          return (
            <CommandItem
              key={account.id}
              value={account.id}
              onSelect={() => handleSelect(account)}
              disabled={isExcluded}
              className="items-start gap-3 py-2"
            >
              <Check
                className={isSelected ? "mt-0.5 opacity-100" : "mt-0.5 opacity-0"}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{getCustomerName(account)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatMoney(account.balance)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{formatAccountNumber(account.accountNumber)}</span>
                  {isExcluded && <span>Diğer alanda seçili</span>}
                  {!isExcluded && !onlyActive && account.status === "PASSIVE" && (
                    <AccountStatusBadge status={account.status} />
                  )}
                </div>
              </div>
            </CommandItem>
          );
        })}
      </>
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {/* modal: Dialog içinde açıldığında listenin kaydırılabilmesi için gerekir. */}
      <Popover open={isOpen} onOpenChange={handleOpenChange} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            disabled={disabled}
            className="h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal"
          >
            {selectedAccount ? (
              <span className="min-w-0 text-left">
                <span className="block truncate font-medium">
                  {getCustomerName(selectedAccount)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  <span className="font-mono">
                    {formatAccountNumber(selectedAccount.accountNumber)}
                  </span>{" "}
                  · {formatMoney(selectedAccount.balance)}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Hesap seçin</span>
            )}
            <ChevronsUpDown className="shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-72 p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Ad, soyad veya hesap numarası ara"
            />
            <CommandList>{renderOptions()}</CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
