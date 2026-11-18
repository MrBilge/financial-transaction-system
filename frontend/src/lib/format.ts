// Para ve tarih biçimlendirme yardımcıları.

const TIME_ZONE = "Europe/Istanbul";

/**
 * Backend'den string olarak gelen tutarı Türk biçiminde gösterir:
 * "1250.5" -> "₺1.250,50", "-300" -> "-₺300,00".
 * Hassasiyet kaybı olmaması için number'a çevrilmeden metin üzerinde işlenir.
 */
export const formatMoney = (amount: string): string => {
  const isNegative = amount.startsWith("-");
  const unsignedAmount = isNegative ? amount.slice(1) : amount;

  const [integerPart, fractionPart = ""] = unsignedAmount.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const twoDigitFraction = fractionPart.padEnd(2, "0").slice(0, 2);

  const sign = isNegative ? "-" : "";
  return `${sign}₺${groupedInteger},${twoDigitFraction}`;
};

/**
 * Grafik çizimi için tutarı sayıya çevirir. Yalnızca çubuk/çizgi yüksekliği
 * için kullanılır; ekranda gösterilen tutarlar her zaman formatMoney ile
 * orijinal string değerden üretilir.
 */
export const toChartValue = (amount: string): number => {
  return Number(amount);
};

// Backend ile aynı kural: sıfırdan büyük, en fazla 16 tam ve 2 ondalık basamak.
const POSITIVE_AMOUNT_PATTERN = /^(?!0+(\.0{1,2})?$)\d{1,16}(\.\d{1,2})?$/;
const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

/** Kullanıcının girdiği tutarı backend formatına çevirir: "1.250,50" -> "1250.50". */
export const normalizeAmountInput = (input: string): string => {
  const trimmedInput = input.trim().replace(/\s/g, "");

  // Türk biçiminde virgül ondalık ayırıcıdır; noktalar binlik ayırıcıdır.
  if (trimmedInput.includes(",")) {
    return trimmedInput.replace(/\./g, "").replace(",", ".");
  }
  return trimmedInput;
};

export const isValidPositiveAmount = (amount: string): boolean => {
  return POSITIVE_AMOUNT_PATTERN.test(amount);
};

export const isValidFilterAmount = (amount: string): boolean => {
  return AMOUNT_PATTERN.test(amount);
};

/**
 * İki geçerli tutarı number'a çevirmeden karşılaştırır.
 * Dönüş: first > second ise pozitif, eşitse 0, küçükse negatif.
 */
export const compareAmounts = (first: string, second: string): number => {
  // "1250.5" -> "125050": kuruş cinsinden tam sayı metni.
  const toCentDigits = (amount: string): string => {
    const [integerPart, fractionPart = ""] = amount.split(".");
    const centDigits = `${integerPart}${fractionPart.padEnd(2, "0")}`;
    return centDigits.replace(/^0+(?=\d)/, "");
  };

  const firstDigits = toCentDigits(first);
  const secondDigits = toCentDigits(second);

  // Basamak sayısı fazla olan sayı daha büyüktür; eşitse alfabetik karşılaştırma yeterlidir.
  if (firstDigits.length !== secondDigits.length) {
    return firstDigits.length - secondDigits.length;
  }
  return firstDigits.localeCompare(secondDigits);
};

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeZone: TIME_ZONE,
});

/** "2026-11-18T10:30:00.000Z" -> "18 Kas 2026 13:30" */
export const formatDateTime = (isoDate: string): string => {
  return dateTimeFormatter.format(new Date(isoDate));
};

/** "2026-11-18T10:30:00.000Z" -> "18 Kas 2026" */
export const formatDate = (isoDate: string): string => {
  return dateFormatter.format(new Date(isoDate));
};

const MONTH_NAMES = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

/**
 * Rapor periyodu başlangıcını (YYYY-MM-DD, zaten Europe/Istanbul günü) kısa
 * gösterir. Saat dilimi dönüşümü yapılmaz: "2026-11-18" -> "18 Kas".
 */
export const formatPeriodLabel = (
  periodStart: string,
  showMonthOnly = false,
): string => {
  const [year, month, day] = periodStart.split("-");
  const monthName = MONTH_NAMES[Number(month) - 1];

  if (showMonthOnly) {
    return `${monthName} ${year}`;
  }
  return `${Number(day)} ${monthName}`;
};

/** Europe/Istanbul saatine göre bugünden `daysAgo` gün önceki tarih (YYYY-MM-DD). */
export const getIstanbulDate = (daysAgo = 0): string => {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
};

/** Tarih kutusundaki günün başlangıcı (yerel saat) -> ISO 8601. */
export const toStartOfDayIso = (date: string): string => {
  return new Date(`${date}T00:00:00`).toISOString();
};

/** Tarih kutusundaki günün sonu (yerel saat) -> ISO 8601. Bitiş günü dahil olsun diye. */
export const toEndOfDayIso = (date: string): string => {
  return new Date(`${date}T23:59:59.999`).toISOString();
};

/** "4821093756120394" -> "4821 0937 5612 0394" */
export const formatAccountNumber = (accountNumber: string): string => {
  return accountNumber.replace(/(\d{4})(?=\d)/g, "$1 ");
};

/** UUID'nin son 8 karakteri; tablolarda kısa referans olarak gösterilir. */
export const shortId = (id: string): string => {
  return id.slice(-8).toUpperCase();
};
