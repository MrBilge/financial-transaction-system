/**
 * Demo veritabanı seed'i: 10 müşteri, 20 hesap, 100 işlem.
 *
 * Çalıştırma:  npm run db:seed   (Docker Compose'da "migrate" servisi
 * migration'lardan hemen sonra otomatik çalıştırır.)
 *
 * Güvenli tekrar çalıştırma (idempotent):
 *  - Seed yalnızca veritabanı BOŞSA (hiç müşteri, hesap ve işlem yoksa) veri
 *    ekler. Herhangi bir kayıt varsa hiçbir şey yazmadan çıkar; böylece
 *    kayıtlar çoğalmaz ve mevcut veriler silinmez veya değiştirilmez.
 *  - Bütün ekleme tek bir veritabanı transaction'ı içinde yapılır: ya tüm
 *    veriler eklenir ya hiçbiri. Advisory lock, aynı anda başlatılan iki
 *    seed'in ikisinin birden veri eklemesini engeller.
 *
 * Tutarlılık:
 *  - İşlem geçmişi kronolojik olarak simüle edilir ve uygulamadaki iş
 *    kuralları aynen uygulanır (TransactionsService ile aynı sıra):
 *    kaynak hesap aktif mi -> hedef hesap aktif mi -> bakiye yeterli mi.
 *  - Kuralı ihlal eden işlem FAILED olarak, uygulamanın kullandığı hata
 *    nedeniyle kaydedilir ve bakiyeyi değiştirmez.
 *  - Her hesabın bakiyesi = başarılı gelen işlemler - başarılı giden işlemler.
 *  - Tutarlar kuruş cinsinden tam sayı olarak hesaplanır (float hatası yok).
 *
 * Veriler sabit bir tohumla (seed) üretildiği için her kurulumda aynı
 * müşteriler, hesaplar ve işlemler oluşur; tarihler çalıştırma anına göre
 * son ~6 aya yayılır (raporlar güncel veri gösterir).
 */
'use strict';

const { PrismaClient, Prisma } = require('@prisma/client');
const { randomUUID } = require('node:crypto');

// Uygulamadaki hata nedenleriyle birebir aynı (transactions.service.ts).
const REASON_SOURCE_INACTIVE = 'Kaynak hesap aktif değil';
const REASON_TARGET_INACTIVE = 'Hedef hesap aktif değil';
const REASON_INSUFFICIENT = 'Yetersiz bakiye';

const ACCOUNT_COUNT = 20;
const TRANSACTION_COUNT = 100;
const HISTORY_DAYS = 180;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// pg_advisory_xact_lock anahtarı (rastgele seçilmiş sabit bir sayı).
const SEED_LOCK_KEY = 7_340_215_118n;

const CUSTOMERS = [
  ['Ayşe', 'Yılmaz'],
  ['Mehmet', 'Kaya'],
  ['Zeynep', 'Demir'],
  ['Mustafa', 'Çelik'],
  ['Elif', 'Şahin'],
  ['Ahmet', 'Yıldız'],
  ['Fatma', 'Aydın'],
  ['Emre', 'Öztürk'],
  ['Selin', 'Arslan'],
  ['Burak', 'Doğan'],
];

// Müşteri başına hesap sayısı (toplam 20).
const ACCOUNTS_PER_CUSTOMER = [3, 2, 2, 2, 2, 2, 2, 2, 2, 1];

// Belirli bir tarihten sonra PASSIVE yapılan hesaplar (hesap sırası).
const PASSIVE_ACCOUNT_INDEXES = [5, 14];

/** Deterministik PRNG (mulberry32); her kurulumda aynı veri üretilir. */
function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    hex: (length) =>
      Array.from({ length }, () => Math.floor(next() * 16).toString(16))
        .join('')
        .toUpperCase(),
  };
}

const toMoney = (kurus) => new Prisma.Decimal(kurus).dividedBy(100);

function toAscii(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  return text.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (c) => map[c]);
}

/** Bellekte demo veri setini üretir ve kuralları uygulayarak simüle eder. */
function buildDataset(now) {
  const random = createRandom(20261118);
  const historyStart = now.getTime() - HISTORY_DAYS * DAY;
  const usedAccountNumbers = new Set();
  const usedTransactionNumbers = new Set();

  const customers = CUSTOMERS.map(([firstName, lastName], i) => {
    const createdAt = new Date(
      historyStart + i * 3 * DAY + random.int(8, 17) * HOUR,
    );
    return {
      id: randomUUID(),
      firstName,
      lastName,
      email: `${toAscii(firstName)}.${toAscii(lastName)}@example.com`,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const accounts = [];
  customers.forEach((customer, ci) => {
    for (let k = 0; k < ACCOUNTS_PER_CUSTOMER[ci]; k++) {
      let accountNumber;
      do {
        accountNumber = String(random.int(1, 9));
        while (accountNumber.length < 16)
          accountNumber += String(random.int(0, 9));
      } while (usedAccountNumbers.has(accountNumber));
      usedAccountNumbers.add(accountNumber);

      const createdAt = new Date(
        customer.createdAt.getTime() + k * 9 * DAY + random.int(1, 6) * HOUR,
      );
      accounts.push({
        id: randomUUID(),
        customerId: customer.id,
        accountNumber,
        createdAt,
        updatedAt: createdAt,
        balance: 0, // kuruş; simülasyon sırasında güncellenir
        passiveFrom: null,
      });
    }
  });
  if (accounts.length !== ACCOUNT_COUNT) {
    throw new Error(
      `Beklenen hesap sayısı ${ACCOUNT_COUNT}, üretilen ${accounts.length}`,
    );
  }

  // Seçili hesaplar geçmişin son ~5 haftasında pasife alınır.
  PASSIVE_ACCOUNT_INDEXES.forEach((index, n) => {
    accounts[index].passiveFrom = new Date(now.getTime() - (35 - n * 10) * DAY);
  });

  // --- İşlem zamanları ---
  // 1) Her hesap açılışından kısa süre sonra bir açılış yatırması alır (20 işlem).
  // 2) Kalan 80 işlem, son hesabın açılışı ile şimdi arasına yayılır.
  const events = accounts.map((account) => ({
    at: new Date(account.createdAt.getTime() + random.int(1, 5) * HOUR),
    kind: 'opening',
    account,
  }));
  const lastOpening = Math.max(...events.map((e) => e.at.getTime()));
  for (let i = 0; i < TRANSACTION_COUNT - ACCOUNT_COUNT; i++) {
    const at =
      lastOpening +
      DAY +
      random.next() * (now.getTime() - lastOpening - 2 * DAY);
    events.push({ at: new Date(at), kind: 'regular' });
  }
  events.sort((a, b) => a.at - b.at);

  const isActiveAt = (account, at) =>
    !account.passiveFrom || at < account.passiveFrom;
  const transactions = [];
  let regularIndex = 0;

  for (const event of events) {
    const { at } = event;
    let movement;

    if (event.kind === 'opening') {
      movement = {
        type: 'DEPOSIT',
        target: event.account,
        amount: random.int(50, 400) * 100 * 25, // 1.250,00 - 10.000,00 TL
      };
    } else {
      const i = regularIndex++;
      const active = accounts.filter((a) => isActiveAt(a, at));
      const passive = accounts.filter((a) => !isActiveAt(a, at));
      const funded = active.filter((a) => a.balance >= 20_000);

      if (i % 9 === 4 && funded.length > 0) {
        // Bilerek yetersiz bakiye: bakiyeden fazla çekim veya transfer.
        const source = random.pick(funded);
        const amount = source.balance + random.int(100, 5_000) * 100;
        movement =
          i % 2 === 0
            ? { type: 'WITHDRAWAL', source, amount }
            : {
                type: 'TRANSFER',
                source,
                target: random.pick(active.filter((a) => a !== source)),
                amount,
              };
      } else if (i % 11 === 7 && passive.length > 0) {
        // Pasif hesap üzerinde denenen işlem.
        const blocked = random.pick(passive);
        const roll = random.int(0, 2);
        const amount = random.int(50, 1_500) * 100;
        movement =
          roll === 0
            ? { type: 'DEPOSIT', target: blocked, amount }
            : roll === 1
              ? { type: 'WITHDRAWAL', source: blocked, amount }
              : {
                  type: 'TRANSFER',
                  source: random.pick(active),
                  target: blocked,
                  amount,
                };
      } else {
        // Kurallara uyan normal işlem.
        const roll = random.next();
        if (roll < 0.3 || funded.length === 0) {
          movement = {
            type: 'DEPOSIT',
            target: random.pick(active),
            amount: random.int(100, 7_500) * 100 + random.int(0, 99),
          };
        } else {
          const source = random.pick(funded);
          // Bakiyenin %5-%45'i arası; kuruşlu tutarlar da oluşur.
          const amount = Math.max(
            100,
            Math.floor((source.balance * random.int(5, 45)) / 100),
          );
          movement =
            roll < 0.6
              ? { type: 'WITHDRAWAL', source, amount }
              : {
                  type: 'TRANSFER',
                  source,
                  target: random.pick(active.filter((a) => a !== source)),
                  amount,
                };
        }
      }
    }

    // --- Uygulama kurallarının uygulanması (TransactionsService ile aynı sıra) ---
    const { type, source, target, amount } = movement;
    let failureReason = null;
    if (source && !isActiveAt(source, at))
      failureReason = REASON_SOURCE_INACTIVE;
    else if (target && !isActiveAt(target, at))
      failureReason = REASON_TARGET_INACTIVE;
    else if (source && source.balance < amount)
      failureReason = REASON_INSUFFICIENT;

    if (!failureReason) {
      if (source) source.balance -= amount;
      if (target) target.balance += amount;
      for (const account of [source, target]) {
        if (account) account.updatedAt = at;
      }
    }

    let transactionNumber;
    do {
      const date = at.toISOString().slice(0, 10).replaceAll('-', '');
      transactionNumber = `TRX-${date}-${random.hex(12)}`;
    } while (usedTransactionNumbers.has(transactionNumber));
    usedTransactionNumbers.add(transactionNumber);

    transactions.push({
      id: randomUUID(),
      transactionNumber,
      type,
      sourceAccountId: source ? source.id : null,
      targetAccountId: target ? target.id : null,
      amount: toMoney(amount),
      status: failureReason ? 'FAILED' : 'SUCCESS',
      failureReason,
      createdAt: at,
    });
  }

  // Müşterinin son güncellenme zamanı: kayıt zamanı (müşteri bilgisi değişmedi).
  // Hesabın son güncellenme zamanı: son bakiye değişikliği veya pasife alınma.
  const accountRows = accounts.map((a) => {
    if (a.balance < 0) {
      throw new Error(`Negatif bakiye üretildi: ${a.accountNumber}`);
    }
    const passive = a.passiveFrom !== null;
    return {
      id: a.id,
      customerId: a.customerId,
      accountNumber: a.accountNumber,
      balance: toMoney(a.balance),
      status: passive ? 'PASSIVE' : 'ACTIVE',
      createdAt: a.createdAt,
      updatedAt:
        passive && a.passiveFrom > a.updatedAt ? a.passiveFrom : a.updatedAt,
    };
  });

  if (transactions.length !== TRANSACTION_COUNT) {
    throw new Error(
      `Beklenen işlem sayısı ${TRANSACTION_COUNT}, üretilen ${transactions.length}`,
    );
  }
  return { customers, accounts: accountRows, transactions };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Aynı anda çalışan ikinci bir seed burada bekler; ilki commit edince
        // veritabanını dolu bulur ve hiçbir şey eklemez.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`;

        const [customerCount, accountCount, transactionCount] =
          await Promise.all([
            tx.customer.count(),
            tx.account.count(),
            tx.transaction.count(),
          ]);
        if (customerCount + accountCount + transactionCount > 0) {
          return {
            skipped: true,
            customerCount,
            accountCount,
            transactionCount,
          };
        }

        const data = buildDataset(new Date());
        await tx.customer.createMany({ data: data.customers });
        await tx.account.createMany({ data: data.accounts });
        await tx.transaction.createMany({ data: data.transactions });

        const failed = data.transactions.filter(
          (t) => t.status === 'FAILED',
        ).length;
        return {
          skipped: false,
          customerCount: data.customers.length,
          accountCount: data.accounts.length,
          transactionCount: data.transactions.length,
          failed,
        };
      },
      { timeout: 30_000, maxWait: 30_000 },
    );

    if (result.skipped) {
      console.log(
        `[seed] Veritabanı boş değil (${result.customerCount} müşteri, ${result.accountCount} hesap, ` +
          `${result.transactionCount} işlem); örnek veri eklenmedi, mevcut veriler korundu.`,
      );
    } else {
      console.log(
        `[seed] Örnek veriler oluşturuldu: ${result.customerCount} müşteri, ${result.accountCount} hesap, ` +
          `${result.transactionCount} işlem (${result.transactionCount - result.failed} başarılı, ${result.failed} başarısız).`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed] Seed başarısız oldu:', error);
  process.exitCode = 1;
});
