"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEARCH_DELAY_MS = 400;

interface DataTableSearchProps {
  /** Listeye uygulanmış arama değeri (başlangıç değeri olarak kullanılır). */
  value: string;
  onSearch: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  inputMode?: "text" | "numeric";
}

/**
 * Toolbar arama kutusu. Yazma bittikten kısa süre sonra aramayı uygular;
 * her tuşta backend'e istek atılmaz.
 */
export const DataTableSearch = ({
  value,
  onSearch,
  placeholder,
  maxLength = 100,
  inputMode = "text",
}: DataTableSearchProps) => {
  const [inputValue, setInputValue] = useState(value);

  const trimmedInput = inputValue.trim();

  const handleClear = () => {
    setInputValue("");
    onSearch("");
  };

  useEffect(() => {
    if (trimmedInput === value) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onSearch(trimmedInput);
    }, SEARCH_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [trimmedInput, value, onSearch]);

  return (
    <div className="relative w-full sm:max-w-72">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className="h-8 pr-8 pl-8"
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleClear}
          className="absolute top-1/2 right-1 -translate-y-1/2"
          aria-label="Aramayı temizle"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};
