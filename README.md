# Finansal İşlem Yönetim Sistemi

Müşteri, hesap ve para hareketlerinin (para yatırma, para çekme, hesaplar arası transfer) yönetildiği; işlem bütünlüğü ve eş zamanlı erişim güvenliği ön planda tutularak geliştirilmiş bir finans yönetim paneli.

Sistem iki uygulamadan oluşur:

- **Backend:** NestJS + Prisma + PostgreSQL ile geliştirilmiş, JWT ile korunan REST API
- **Frontend:** Next.js + React ile geliştirilmiş, Türkçe yönetici paneli

---

## İçindekiler

1. [Projenin Amacı](#projenin-amacı)
2. [Özellikler](#özellikler)
3. [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
4. [Sistem Mimarisi](#sistem-mimarisi)
5. [Proje Klasör Yapısı](#proje-klasör-yapısı)
6. [Veritabanı Yapısı ve İlişkileri](#veritabanı-yapısı-ve-ilişkileri)
7. [Mimari ve Teknolojik Tercihlerin Gerekçeleri](#mimari-ve-teknolojik-tercihlerin-gerekçeleri)
8. [Finansal İşlem Mantığı](#finansal-işlem-mantığı)
9. [Transaction, Concurrency, Row Locking ve Rollback](#transaction-concurrency-row-locking-ve-rollback)
10. [Veritabanı Optimizasyonları ve Index'ler](#veritabanı-optimizasyonları-ve-indexler)
11. [Kimlik Doğrulama ve Güvenlik](#kimlik-doğrulama-ve-güvenlik)
12. [API Endpoint'leri ve Swagger](#api-endpointleri-ve-swagger)
13. [Lokal Kurulum ve Çalıştırma](#lokal-kurulum-ve-çalıştırma)
14. [Docker ile Kurulum ve Çalıştırma](#docker-ile-kurulum-ve-çalıştırma)
15. [Ortam Değişkenleri](#ortam-değişkenleri)
16. [Demo Giriş Bilgileri](#demo-giriş-bilgileri)
17. [Testler](#testler)
18. [Mevcut Sınırlamalar ve Gelecek Geliştirmeler](#mevcut-sınırlamalar-ve-gelecek-geliştirmeler)

---

## Projenin Amacı

Bir finans kurumunun yönetici panelinde ihtiyaç duyulan temel işlemleri; müşteri ve hesap yönetimini, para hareketlerini ve finansal raporlamayı tek bir uygulamada sunmak.

Projenin odak noktası, para hareketlerinin **doğru, atomik ve eş zamanlı isteklere karşı güvenli** şekilde işlenmesidir:

- Bakiye hiçbir koşulda negatife düşmez.
- Aynı anda gelen istekler birbirinin sonucunu bozmaz.
- Başarısız işlemler bile neden bilgisiyle kayıt altına alınır.

## Özellikler

### Müşteri Yönetimi
- Müşteri oluşturma ve düzenleme (ad, soyad, e-posta).
- Ad ve soyad yalnızca harf içerebilir; e-posta benzersizdir ve küçük harfe çevrilerek saklanır.
- Ad, soyad veya e-posta ile arama; sütun bazlı sıralama; sayfalama.
- Müşteri detay sayfasında müşterinin hesapları.

### Hesap Yönetimi
- Müşteri için hesap açma.
  - Hesap numarası backend tarafından üretilir: 16 haneli, benzersiz.
  - Hesap 0,00 TL bakiye ile `ACTIVE` olarak açılır.
- Bir müşterinin birden fazla hesabı olabilir.
- Hesap durumunu `ACTIVE` / `PASSIVE` yapma. Pasif hesapla para hareketi yapılamaz.
- Hesap numarası, müşteri adı veya soyadı ile arama; durum filtresi; sıralama; sayfalama.
- Hesap listesinde hesap sahibinin adı ve soyadı gösterilir.
- Hesap silme endpoint'i yoktur. Bakiye API üzerinden doğrudan değiştirilemez; yalnızca para hareketleriyle değişir.

### Para Hareketleri
- Para yatırma, para çekme ve hesaplar arası transfer.
- Tutarlar string olarak alınır ve `Decimal` ile işlenir. Sıfırdan büyük olmalı ve en fazla 2 ondalık basamak içermelidir.
- Her işlem için benzersiz işlem numarası üretilir (ör. `TRX-20261118-9F3A1C7B2E4D`).
- İşlem durumları: `PENDING` → `SUCCESS` veya `FAILED`. Başarısız işlemler nedeniyle birlikte kaydedilir; örneğin "Yetersiz bakiye" veya "Kaynak hesap aktif değil".
- İşlem geçmişi değiştirilemez; güncelleme veya silme endpoint'i yoktur.
- Filtreler: işlem türü, durum, tarih aralığı, tutar aralığı ve işlem numarası araması. Sıralama ve sayfalama da desteklenir.
- Hesap bazlı işlem geçmişi; kaynak ve hedef hesap numaraları listede gösterilir.

### Raporlama
- **Genel özet:**
  - Müşteri sayısı, aktif/pasif hesap sayısı, toplam bakiye.
  - Toplam para girişi ve çıkışı, net akış ve transfer hacmi. Transferler giriş/çıkışa eklenmez.
- **İşlem hacmi:** Günlük, haftalık veya aylık gruplama; Europe/Istanbul saat dilimi.
- **Hesap bazlı rapor:** Gelen ve giden hareketler.
- **İşlem istatistikleri:** Durum (başarılı/başarısız/bekleyen) ve tür bazında.
- Tüm raporlarda tarih aralığı filtresi. Tutarlar yalnızca başarılı (`SUCCESS`) işlemlerden hesaplanır.

### Yönetici Paneli (Frontend)
- Genel bakış: özet kartlar, finansal hareket grafiği, işlem durumu dağılımı ve son işlemler.
- Ortak veri tablosu:
  - Toolbar'da arama, gelişmiş filtreler için popover.
  - Sütun başlıklarından sıralama, alt kısımda sayfalama.
  - Satır işlemleri için açılır menü.
- Hesap seçimi: müşteri adı, soyadı veya hesap numarasıyla aranabilen combobox.
- Türkçe arayüz, responsive tasarım; yükleniyor, hata ve boş durumları için ayrı gösterimler.
- Kullanıcıya UUID değerleri gösterilmez; hesaplar numaraları, müşteriler adlarıyla görünür.

## Kullanılan Teknolojiler

| Katman | Teknoloji |
|---|---|
| Backend | NestJS 11, TypeScript 5, Node.js 20 |
| ORM ve veritabanı | Prisma 6.19, PostgreSQL 16 |
| Doğrulama | class-validator, class-transformer |
| Kimlik doğrulama | @nestjs/jwt, Passport (passport-jwt), bcryptjs |
| Güvenlik | Helmet, @nestjs/throttler (rate limiting), CORS |
| API dokümantasyonu | @nestjs/swagger (OpenAPI / Swagger UI) |
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 |
| Arayüz | Tailwind CSS 4, shadcn/ui (Radix UI), lucide-react |
| Tablo, grafik ve bildirim | TanStack Table 8, Recharts 3, Sonner |
| Test | Jest, Supertest |
| Altyapı | Docker, Docker Compose |

## Sistem Mimarisi

```
┌──────────────────────┐   HTTP + JWT (Bearer)   ┌──────────────────────┐   Prisma    ┌──────────────┐
│   Frontend (Next.js) │ ──────────────────────▶ │   Backend (NestJS)   │ ──────────▶ │  PostgreSQL  │
│   Yönetici paneli    │ ◀────────────────────── │   REST API + Swagger │ ◀────────── │      16      │
│   :3000              │        JSON             │   :3001              │             │    :5432     │
└──────────────────────┘                         └──────────────────────┘             └──────────────┘
```

- **İletişim:** Frontend, backend'e tarayıcı üzerinden doğrudan HTTP istekleri gönderir. Kimlik doğrulama `Authorization: Bearer <token>` başlığıyla yapılır.
- **Backend katmanları:** Her alan (customers, accounts, transactions, reports, auth) kendi NestJS modülündedir.
  - Controller yalnızca HTTP ile ilgilenir.
  - İş kuralları ve veritabanı işlemleri service katmanındadır.
  - Veritabanı erişimi ortak `PrismaService` üzerinden yapılır.
- **Global katmanlar:** Rate limit guard → JWT guard → ValidationPipe sırasıyla her isteğe uygulanır.
- **Docker'da başlatma sırası:** PostgreSQL → migration servisi → backend → frontend. Her adım bir öncekinin sağlıklı olmasını bekler.

## Proje Klasör Yapısı

```
financial-transaction-system/
├── docker-compose.yml          # PostgreSQL + migration + backend + frontend
├── .env.example                # Docker Compose ortam değişkenleri şablonu
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # Veri modeli
│   │   └── migrations/         # SQL migration'ları (CHECK constraint'ler dahil)
│   ├── scripts/
│   │   └── hash-password.js    # Yönetici parolası için bcrypt hash üretir
│   ├── src/
│   │   ├── main.ts, app.module.ts, app.setup.ts, swagger.setup.ts
│   │   ├── auth/               # Login, JWT strategy, global guard, @Public()
│   │   ├── customers/          # Müşteri modülü
│   │   ├── accounts/           # Hesap modülü
│   │   ├── transactions/       # Para hareketleri (kilitleme, atomik işlem)
│   │   ├── reports/            # SQL aggregation tabanlı raporlar
│   │   ├── common/             # Sayfalama, para (Decimal) ve Swagger yardımcıları
│   │   ├── config/             # Ortam değişkeni doğrulaması
│   │   └── prisma/             # PrismaService ve Prisma hata yardımcıları
│   └── test/                   # Entegrasyon (e2e) testleri
└── frontend/
    ├── Dockerfile
    └── src/
        ├── app/
        │   ├── login/          # Giriş sayfası
        │   └── (dashboard)/    # Genel bakış, müşteriler, hesaplar, işlemler, raporlar
        ├── api/                # Modül bazlı API fonksiyonları ve ortak istemci
        ├── components/         # Ortak component'ler, DataTable, layout, shadcn/ui
        ├── contexts/           # AuthContext (oturum yönetimi)
        ├── lib/                # Biçimlendirme, etiketler, oturum saklama
        └── types/              # Backend istek/yanıt tipleri
```

Frontend'de her sayfa, sayfa başlığını (metadata) tanımlayan bir `page.tsx` (Server Component) ile durum yönetimi ve API çağrılarını içeren bir `Content.tsx`'ten (Client Component) oluşur.

## Veritabanı Yapısı ve İlişkileri

```
customers 1 ──── N accounts 1 ──┬── N transactions (source_account_id)
                                └── N transactions (target_account_id)
```

| Tablo | Önemli alanlar |
|---|---|
| `customers` | `id` (UUID), `first_name`, `last_name`, `email` (unique), `created_at`, `updated_at` |
| `accounts` | `id` (UUID), `customer_id` (FK), `account_number` (unique), `balance` `NUMERIC(18,2)` varsayılan 0, `status` (`ACTIVE`/`PASSIVE`), zaman damgaları |
| `transactions` | `id` (UUID), `transaction_number` (unique), `source_account_id` (FK, null olabilir), `target_account_id` (FK, null olabilir), `amount` `NUMERIC(18,2)`, `type` (`DEPOSIT`/`WITHDRAWAL`/`TRANSFER`), `status` (`PENDING`/`SUCCESS`/`FAILED`), `failure_reason`, `created_at` |

**Veri bütünlüğü veritabanı seviyesinde de korunur:**

- **Birincil anahtarlar:** UUID değerleri PostgreSQL'de `gen_random_uuid()` ile üretilir.
- **Para tipi:** Finansal değerler `NUMERIC(18,2)` olarak saklanır; Float kullanılmaz.
- **Silme kısıtı:** Bütün foreign key'ler `ON DELETE RESTRICT`. Hesabı olan bir müşteri veya işlem geçmişi olan bir hesap silinemez; cascade delete yoktur.
- **CHECK constraint'ler:**

| Constraint | Kural |
|---|---|
| `accounts_balance_non_negative_check` | `balance >= 0` |
| `transactions_amount_positive_check` | `amount > 0` |
| `transactions_type_accounts_check` | DEPOSIT → yalnızca hedef hesap; WITHDRAWAL → yalnızca kaynak hesap; TRANSFER → iki hesap da dolu ve birbirinden farklı |
| `transactions_failure_reason_check` | `failure_reason` yalnızca `FAILED` işlemlerde bulunur ve orada zorunludur |

## Mimari ve Teknolojik Tercihlerin Gerekçeleri

- **PostgreSQL:**
  - Finansal veride ACID garantileri, satır seviyesinde kilitleme (`SELECT ... FOR UPDATE`) ve CHECK constraint desteği gerekir.
  - Raporlar için `FILTER`, `GROUP BY ROLLUP`, `date_trunc` ve `generate_series` gibi güçlü SQL özellikleri sunar.
- **Prisma:**
  - Tip güvenli sorgular sağlar ve veritabanı değişikliklerini sürümlü migration'larla yönetir.
  - Raporlar gibi Prisma API'siyle ifade edilemeyen sorgularda, parametreleri güvenli şekilde aktaran `$queryRaw` kullanılır.
- **NestJS:** Modüler yapı, dependency injection, guard/pipe gibi katmanlar sayesinde güvenlik ve doğrulama tek noktadan yönetilir.
- **Decimal ve string tutarlar:**
  - JavaScript `number` (IEEE 754) ondalık değerleri tam temsil edemez.
  - Tutarlar API'ye string olarak girer ve string olarak çıkar; arada yalnızca `Prisma.Decimal` kullanılır.
  - Frontend de tutarları number'a çevirmeden biçimlendirir. Grafikler istisnadır: çubuk yüksekliği için sayıya çevrilir, ama tooltip'te tutar orijinal değerden gösterilir.
- **Next.js (App Router):**
  - Sayfa iskeleti Server Component olarak üretilir.
  - Oturum `sessionStorage`'da tutulduğu için veriler tarayıcıda, token ile yüklenir.
- **Hafif durum yönetimi:** Durum yönetiminde yalnızca `useState`/`useEffect` ve kimlik doğrulama için Context API kullanılır. Ek bir state kütüphanesine gerek duyulmamıştır.

## Finansal İşlem Mantığı

Her para hareketi (`POST /transactions/deposit|withdraw|transfer`) aşağıdaki adımlarla işlenir:

1. **Doğrulama:**
   - DTO seviyesinde tutar formatı ve UUID'ler kontrol edilir.
   - Aynı hesaba transfer 400 döner. Bu durum, CHECK constraint gereği kaydedilemeyeceği için FAILED kaydı da oluşturulmaz.
2. **Hesapların varlığı:** Hesap yoksa 404 döner. Foreign key gereği bu durumda da kayıt oluşturulmaz.
3. **PENDING kaydı:** İşlem `PENDING` olarak ayrı bir sorguyla kaydedilir ve hemen commit edilir.
4. **Veritabanı transaction'ı:** Tek bir transaction içinde:
   - Hesaplar kilitlenir.
   - Kurallar kontrol edilir: hesap aktif mi, bakiye yeterli mi.
   - Bakiyeler güncellenir ve işlem `SUCCESS` yapılır.
5. **İş kuralı ihlali** (pasif hesap, yetersiz bakiye):
   - Transaction rollback edilir.
   - PENDING kayıt `FAILED` yapılır ve nedeni kaydedilir.
   - İstemciye 422 döner; yanıtta kaydedilen işlem de yer alır.
6. **Beklenmeyen hata:**
   - Transaction rollback edilir ve kayıt `FAILED` olarak işaretlenir.
   - Hata istemciye iletilir (500).

Bakiye güncellemeleri ile başarılı işlem kaydı her zaman birlikte gerçekleşir. Bakiye değişip işlemin kaydedilmemesi ya da işlemin kaydedilip bakiyenin değişmemesi mümkün değildir.

## Transaction, Concurrency, Row Locking ve Rollback

- **Prisma interactive transaction:** Bakiye kontrolleri, bakiye güncellemeleri ve `SUCCESS` durumu aynı veritabanı transaction'ı içinde çalışır. Transaction `READ COMMITTED` izolasyon seviyesinde, `maxWait` 5 sn ve `timeout` 10 sn ile çalışır.
- **Satır kilidi:**
  - İlgili hesap satırları `SELECT ... FOR UPDATE` ile kilitlenir.
  - Aynı hesaba gelen ikinci istek, birincisi commit veya rollback olana kadar bekler.
  - Kilit alındıktan sonra okunan bakiye ve durum her zaman en son commit edilmiş değerdir. Bu yüzden iki eş zamanlı istek aynı eski bakiyeyi görüp ikisi birden başarılı olamaz.
- **Deadlock önleme:** Transferde iki hesap her zaman id'ye göre sıralanarak kilitlenir. A→B ve B→A transferleri aynı anda gelse bile ikisi de önce aynı hesabı kilitlemeye çalışır; karşılıklı bekleme oluşmaz.
- **Rollback:**
  - Transaction içinde oluşan her hata, o ana kadar yapılan bakiye değişikliklerini geri alır.
  - `FAILED` kaydı rollback'ten etkilenmez, çünkü `PENDING` kayıt transaction'dan önce commit edilmiştir.
  - `FAILED` güncellemesi `WHERE status = 'PENDING'` koşuluyla yapılır. Böylece commit sonucu belirsiz bir hatada, aslında başarılı olmuş bir işlemin üzerine yazılmaz.
- **Hesap durumu değişiklikleri:** Durum güncellemesi de aynı satırı kilitler, bu yüzden devam eden bir para hareketiyle çakışmaz. Bu güncelleme yalnızca `status` alanını yazar; bakiyeye dokunmaz.
- **Son güvenlik katmanı:** Veritabanındaki `balance >= 0` CHECK constraint'i, uygulama kodunda bir hata olsa bile negatif bakiyeyi engeller.

Entegrasyon testlerinde doğrulanan senaryolar:

| Senaryo | Sonuç |
|---|---|
| 1000 TL bakiyeli hesaptan eş zamanlı 2 × 800 TL çekim | Yalnızca biri başarılı; bakiye 200 TL |
| 1000 TL bakiyeden eş zamanlı 10 × 150 TL çekim | 6 başarılı, 4 başarısız; bakiye 100 TL |
| Aynı hesaptan eş zamanlı çekim ve transfer | Yalnızca biri başarılı |
| 10 adet A→B ve 10 adet B→A transfer aynı anda | Deadlock yok, bakiyeler korunuyor |
| İşlem sırasında hesap durumu güncellemesi | İşlem kilidi bekliyor ve güncel durumu görüyor |
| Transferde ikinci bakiye güncellemesinin başarısız olması | İlk güncelleme de geri alınıyor, işlem FAILED kalıyor |

## Veritabanı Optimizasyonları ve Index'ler

| Index | Amaç |
|---|---|
| `customers(email)` unique | Benzersizlik ve e-posta ile arama |
| `accounts(account_number)` unique | Benzersizlik |
| `accounts(customer_id)` | Müşterinin hesapları (PostgreSQL foreign key'lere otomatik index açmaz) |
| `transactions(transaction_number)` unique | Benzersizlik |
| `transactions(source_account_id, created_at)` | Hesabın giden işlemleri, tarih aralığıyla |
| `transactions(target_account_id, created_at)` | Hesabın gelen işlemleri, tarih aralığıyla |
| `transactions(created_at)` | Genel tarih aralığı sorguları |
| `transactions(status, created_at)` | Duruma göre filtreleme ve tarih sıralaması |

Diğer optimizasyonlar:

- **Gereksiz index yok:** Unique alanlar zaten index oluşturduğu için ayrıca index tanımlanmamıştır. Hesap index'leri foreign key sorgularını da karşılar.
- **Tutarlı sayfalama:** Listelemelerde kayıtlar ve toplam sayı, tek bir `REPEATABLE READ` transaction'ı içinde (aynı anlık görüntüden) okunur. Sayfalar arası tutarlılık için `id` ikincil sıralama olarak kullanılır.
- **N+1 sorgu yok:** Hesap listelerindeki müşteri adı ve işlem listelerindeki hesap numaraları Prisma `include` ile, liste başına sabit sayıda sorguyla alınır.
- **Raporlar:**
  - Tüm hesaplamalar PostgreSQL'de `SUM`, `COUNT`, `FILTER`, `GROUP BY ROLLUP` ile yapılır; kayıtlar belleğe çekilmez.
  - Hacim raporu `generate_series` ile işlem olmayan periyotları da sıfır değerlerle döndürür.

## Kimlik Doğrulama ve Güvenlik

- **JWT kimlik doğrulama:**
  - `POST /auth/login` ile HS256 imzalı token alınır.
  - Login ve `GET /` (basit erişilebilirlik kontrolü) dışındaki bütün endpoint'ler global JWT guard ile korunur.
  - Süresi dolmuş, imzası bozuk veya imzasız (`alg: none`) token'lar reddedilir.
- **Yönetici hesabı:**
  - Kullanıcı tablosu yoktur; tek yönetici hesabı ortam değişkenlerinden okunur.
  - Parola bcrypt hash olarak saklanır.
  - Kullanıcı adı yanlış olsa da parola karşılaştırması yapılır; böylece yanıt süresi kullanıcı adının doğru olup olmadığını ele vermez.
- **Rate limiting:** IP başına dakikada genel bir sınır (varsayılan 100) ve login için dakikada 5 deneme.
- **Helmet:** Güvenlik başlıkları (CSP, HSTS, `X-Content-Type-Options` vb.) ekler; `X-Powered-By` başlığı gönderilmez.
- **CORS:** Yalnızca `CORS_ORIGINS` ile tanımlanan adreslere izin verilir. Kimlik doğrulama cookie ile değil Bearer token ile yapıldığı için `credentials` kapalıdır.
- **Doğrulama:** Global `ValidationPipe` DTO'da tanımlı olmayan alanları reddeder; örneğin bakiyenin istek gövdesiyle değiştirilmesi engellenir.
- **Ortam değişkenleri:** Uygulama açılışta doğrulanır; eksik veya zayıf bir secret varsa uygulama başlamaz. Secret değerleri ve kullanıcı parolaları loglanmaz.
- **Frontend oturumu:**
  - Token `sessionStorage`'da tutulur.
  - Süresi dolduğunda veya backend 401 döndürdüğünde oturum otomatik kapanır.
  - Giriş sonrası yönlendirmede yalnızca uygulama içi adreslere izin verilir (open redirect koruması).
  - `X-Frame-Options`, `Referrer-Policy` gibi güvenlik başlıkları eklenir.
- **Docker:** Container'lar root olmayan `node` kullanıcısıyla çalışır; `.env` dosyaları imajlara kopyalanmaz.

## API Endpoint'leri ve Swagger

**Swagger UI:** `http://localhost:3001/api/docs` (OpenAPI JSON: `/api/docs-json`)

Swagger'da kimlik doğrulama için önce `POST /auth/login` ile token alın, ardından **Authorize** butonuna token'ı girin.

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/auth/login` | Yönetici girişi (herkese açık) |
| POST | `/customers` | Müşteri oluştur |
| GET | `/customers` | Müşterileri listele (arama, sıralama, sayfalama) |
| GET | `/customers/:id` | Müşteri detayı |
| PATCH | `/customers/:id` | Müşteri güncelle |
| POST | `/accounts` | Hesap aç |
| GET | `/accounts` | Hesapları listele (arama, durum ve müşteri filtresi, sıralama, sayfalama) |
| GET | `/accounts/:id` | Hesap detayı |
| GET | `/customers/:id/accounts` | Müşterinin hesapları |
| PATCH | `/accounts/:id/status` | Hesap durumunu değiştir |
| POST | `/transactions/deposit` | Para yatır |
| POST | `/transactions/withdraw` | Para çek |
| POST | `/transactions/transfer` | Hesaplar arası transfer |
| GET | `/transactions` | İşlemleri listele (tür, durum, tarih, tutar filtreleri, arama, sıralama, sayfalama) |
| GET | `/transactions/:id` | İşlem detayı |
| GET | `/accounts/:id/transactions` | Hesabın işlem geçmişi |
| GET | `/reports/summary` | Genel özet |
| GET | `/reports/volume` | Günlük / haftalık / aylık işlem hacmi |
| GET | `/reports/accounts/:id` | Hesap bazlı rapor |
| GET | `/reports/transaction-stats` | İşlem istatistikleri |

Temel HTTP durum kodları:

| Kod | Anlamı |
|---|---|
| 200 / 201 | Başarılı |
| 400 | Doğrulama hatası |
| 401 | Token yok veya geçersiz |
| 404 | Kayıt bulunamadı |
| 409 | Tekrarlanan e-posta |
| 422 | İş kuralı ihlali; işlem FAILED olarak kaydedilir |
| 429 | İstek sınırı aşıldı |

## Lokal Kurulum ve Çalıştırma

**Gereksinimler:** Node.js 20 (20.9 veya üzeri), npm, Docker Desktop (PostgreSQL için)

1. **Ortam dosyalarını oluşturun:**

   ```bash
   cp .env.example .env
   ```
   ```bash
   cp backend/.env.example backend/.env
   ```
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   `backend/.env` içindeki `DATABASE_URL`'deki kullanıcı adı ve parola, kök `.env`'deki `POSTGRES_USER` ve `POSTGRES_PASSWORD` ile aynı olmalıdır. `JWT_SECRET` değerini değiştirin.

2. **PostgreSQL'i başlatın:**

   ```bash
   docker compose up -d postgres
   ```

3. **Backend'i hazırlayıp çalıştırın** (`npm install`, Prisma Client'ı da üretir):

   ```bash
   cd backend && npm install && npx prisma migrate deploy && npm run start:dev
   ```

4. **Frontend'i başka bir terminalde çalıştırın:**

   ```bash
   cd frontend && npm install && npm run dev
   ```

5. **Adresler:**
   - Panel: `http://localhost:3000`
   - API: `http://localhost:3001`
   - Swagger: `http://localhost:3001/api/docs`

## Docker ile Kurulum ve Çalıştırma

1. **Ortam dosyasını oluşturun** ve en azından `JWT_SECRET` ile `POSTGRES_PASSWORD` değerlerini değiştirin:

   ```bash
   cp .env.example .env
   ```

2. **Bütün servisleri derleyip başlatın:**

   ```bash
   docker compose up --build
   ```

   | Servis | Görevi |
   |---|---|
   | `postgres` | PostgreSQL 16; veriler `postgres_data` volume'unda kalıcıdır |
   | `migrate` | `prisma migrate deploy` ile bekleyen migration'ları uygular ve çıkar; mevcut verileri silmez |
   | `backend` | NestJS API — `http://localhost:3001` |
   | `frontend` | Next.js paneli — `http://localhost:3000` |

3. **Durdurmak için:**

   ```bash
   docker compose down
   ```

   `docker compose down -v` komutu volume'u, dolayısıyla **tüm veritabanı verilerini siler**; verileri korumak istiyorsanız `-v` kullanmayın.

**Notlar:**

- **Portlar:** Portlar `.env` içindeki `BACKEND_PORT` ve `FRONTEND_PORT` ile değiştirilebilir. CORS izni ve frontend'in kullandığı API adresi bu portlara göre otomatik ayarlanır.
- **`NEXT_PUBLIC_API_URL`:** Bu değer frontend imajına build sırasında gömülür. Backend adresini değiştirirseniz `--build` ile yeniden derleyin.
- **Hassas bilgiler:** `.env` dosyaları imajlara kopyalanmaz; değerler çalışma zamanında Docker Compose tarafından verilir.

## Ortam Değişkenleri

### Kök dizin `.env` (Docker Compose)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Veritabanı bilgileri (parola yalnızca harf, rakam, `-`, `_` içermeli) | — |
| `POSTGRES_PORT` | Bilgisayarda yayınlanan PostgreSQL portu | `5432` |
| `BACKEND_PORT`, `FRONTEND_PORT` | Bilgisayarda yayınlanan portlar | `3001`, `3000` |
| `JWT_SECRET` | En az 32 karakter (zorunlu) | — |
| `JWT_EXPIRES_IN_SECONDS` | Token süresi (60–86400 sn) | `3600` |
| `ADMIN_USERNAME` | Yönetici kullanıcı adı | `admin` |
| `ADMIN_PASSWORD_HASH` | Yönetici parolasının bcrypt hash'i, tek tırnak içinde (zorunlu) | — |
| `RATE_LIMIT_PER_MINUTE` | IP başına dakikadaki istek sınırı | `100` |
| `CORS_ORIGINS` | İsteğe bağlı; virgülle ayrılmış izinli adresler | `http://localhost:${FRONTEND_PORT}` |
| `NEXT_PUBLIC_API_URL` | İsteğe bağlı; tarayıcının backend'e ulaştığı adres | `http://localhost:${BACKEND_PORT}` |

### `backend/.env` (lokal geliştirme)

| Değişken | Açıklama |
|---|---|
| `PORT` | Backend portu (varsayılan `3001`) |
| `DATABASE_URL` | PostgreSQL bağlantı adresi |
| `CORS_ORIGINS`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `RATE_LIMIT_PER_MINUTE` | Yukarıdaki tablo ile aynı anlamda |

### `frontend/.env.local` (lokal geliştirme)

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend adresi (ör. `http://localhost:3001`) |

Yeni bir yönetici parolasının hash'ini üretmek için:

```bash
cd backend && npm run auth:hash-password -- "yeni-parola"
```

## Demo Giriş Bilgileri

`.env.example` dosyalarındaki demo hash ile:

| Kullanıcı adı | Parola |
|---|---|
| `admin` | `ChangeMe!2026` |

> Bu bilgiler yalnızca yerel/demo kullanım içindir. Gerçek bir ortamda `ADMIN_PASSWORD_HASH` ve `JWT_SECRET` mutlaka değiştirilmelidir.

## Testler

Backend'de unit testler (Jest, mock'lanmış bağımlılıklarla) ve gerçek PostgreSQL üzerinde çalışan entegrasyon testleri (Jest + Supertest) bulunur.

```bash
cd backend
```
```bash
npm test
```
```bash
npm run test:e2e
```

Entegrasyon testleri hakkında:

- **Ön koşul:** Çalışan bir PostgreSQL ve uygulanmış migration'lar gerekir (`docker compose up -d postgres` ve `npx prisma migrate deploy`).
- **Gerçek güvenlik katmanı:** Testler login akışını kullanır; JWT, Helmet, CORS ve rate limiting devre dışı bırakılmaz. Testler için ayrı bir yönetici hesabı `test/setup-e2e.ts` içinde tanımlanır.
- **Sıralı çalışma:** Raporlar tüm veritabanını okuduğu için test dosyaları sıralı çalışır (`maxWorkers: 1`).
- **Temizlik:** Testler oluşturdukları kayıtları sonunda siler.
- **Kapsam:** Müşteri, hesap, işlem ve rapor endpoint'leri; doğrulama ve hata kodları; kimlik doğrulama; eş zamanlılık ve rollback senaryoları; Decimal hassasiyeti; veritabanı şeması (constraint ve index'ler).

Kod kalitesi kontrolleri:

```bash
cd backend && npm run lint && npm run build
```
```bash
cd frontend && npm run lint && npm run build
```

## Mevcut Sınırlamalar ve Gelecek Geliştirmeler

**Mevcut sınırlamalar:**

- **Kullanıcı yönetimi:** Tek bir yönetici hesabı vardır; kullanıcı tablosu, rol veya yetki yönetimi yoktur.
- **Token yönetimi:** JWT `sessionStorage`'da tutulur; refresh token yoktur, süre dolunca yeniden giriş gerekir.
- **Rate limiting:**
  - Sayaçlar bellekte tutulur; birden fazla backend örneği çalıştırılırsa paylaşılmaz.
  - Proxy veya load balancer arkasında gerçek istemci IP'si için Express `trust proxy` ayarı gerekir. Bu ayar yapılmadığında Docker ile yerel kullanımda istekler aynı IP'den geliyormuş gibi görünebilir.
- **Para birimi:** Tek para birimi (TRY) desteklenir.
- **Silme:** Müşteri ve hesap silme işlemleri bilinçli olarak sunulmaz.
- **Takılı kalan kayıtlar:** Uygulama, işlem `PENDING` kaydedildikten sonra ve tamamlanmadan önce kapanırsa kayıt `PENDING` kalır; bunları otomatik çözen bir mutabakat (reconciliation) işi yoktur.
- **Bakiye üst sınırı:** Bakiyenin `NUMERIC(18,2)` üst sınırını (10^16) aşması işlemi geri alır ancak 500 döner.
- **Arama performansı:** Metin aramaları `ILIKE '%…%'` ile yapılır; çok büyük veri setlerinde `pg_trgm` index'i gerekebilir.
- **Tarih yorumu:** `/transactions` listesinde yalnızca tarih (`YYYY-MM-DD`) verilirse UTC gün başlangıcı kabul edilir. Panel, kullanıcının yerel gün sınırlarını gönderdiği için bu durumdan etkilenmez.
- **Swagger erişimi:** Swagger UI herkese açıktır.
- **Frontend güvenlik başlıkları:** Frontend'de Content-Security-Policy başlığı yoktur. Diğer güvenlik başlıkları eklenmiştir.
- **Testler:** Frontend için otomatik test bulunmaz.
- **Doğrulama mesajları:** Backend doğrulama mesajlarında alan adları İngilizce yer alır (ör. `firstName`).

**Gelecekte yapılabilecek geliştirmeler:**

- Kullanıcı ve rol yönetimi; httpOnly cookie ve refresh token tabanlı oturum.
- Redis tabanlı, çoklu sunucu uyumlu rate limiting.
- `PENDING` işlemler için mutabakat işi ve işlem geçmişini veritabanı seviyesinde koruyan trigger'lar.
- `pg_trgm` index'leri ile hızlı metin araması.
- Frontend için uçtan uca testler (ör. Playwright) ve CI pipeline'ı.
- Çoklu para birimi desteği ve denetim (audit) kayıtları.
- Swagger'ın production ortamında kapatılabilmesi ve frontend için nonce tabanlı CSP.
