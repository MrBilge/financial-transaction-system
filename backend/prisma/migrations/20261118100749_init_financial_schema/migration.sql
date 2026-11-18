-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PASSIVE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "account_number" VARCHAR(34) NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_number" VARCHAR(64) NOT NULL,
    "source_account_id" UUID,
    "target_account_id" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "failure_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_account_number_key" ON "accounts"("account_number");

-- CreateIndex
CREATE INDEX "accounts_customer_id_idx" ON "accounts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_number_key" ON "transactions"("transaction_number");

-- CreateIndex
CREATE INDEX "transactions_source_account_id_created_at_idx" ON "transactions"("source_account_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_target_account_id_created_at_idx" ON "transactions"("target_account_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------------
-- CHECK constraint'ler (Prisma şemasında ifade edilemediği için elle eklendi)
-- ---------------------------------------------------------------------------

-- Hesap bakiyesi negatif olamaz.
ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_balance_non_negative_check"
  CHECK ("balance" >= 0);

-- İşlem tutarı sıfırdan büyük olmalıdır.
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_positive_check"
  CHECK ("amount" > 0);

-- İşlem türüne göre kaynak/hedef hesap tutarlılığı:
--   DEPOSIT    -> yalnızca hedef hesap
--   WITHDRAWAL -> yalnızca kaynak hesap
--   TRANSFER   -> iki hesap da zorunlu ve birbirinden farklı
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_type_accounts_check"
  CHECK (
    ("type" = 'DEPOSIT'
      AND "source_account_id" IS NULL
      AND "target_account_id" IS NOT NULL)
    OR ("type" = 'WITHDRAWAL'
      AND "source_account_id" IS NOT NULL
      AND "target_account_id" IS NULL)
    OR ("type" = 'TRANSFER'
      AND "source_account_id" IS NOT NULL
      AND "target_account_id" IS NOT NULL
      AND "source_account_id" <> "target_account_id")
  );

-- Hata nedeni yalnızca FAILED işlemlerde bulunur ve FAILED işlemlerde zorunludur.
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_failure_reason_check"
  CHECK (("status" = 'FAILED') = ("failure_reason" IS NOT NULL));
