import { Prisma } from '@prisma/client';

// https://www.prisma.io/docs/orm/reference/error-reference
export const PrismaErrorCode = {
  UniqueConstraintFailed: 'P2002',
  RecordNotFound: 'P2025',
} as const;

export function isPrismaError(
  error: unknown,
  code: (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode],
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

/**
 * Rastgele üretilen benzersiz bir değerle (hesap / işlem numarası) kayıt
 * oluşturur. Benzersizliği veritabanındaki unique constraint garanti eder;
 * nadir bir çakışmada işlem yeni bir değerle tekrarlanır. Deneme hakkı
 * biterse son hata olduğu gibi fırlatılır.
 */
export async function retryOnUniqueViolation<T>(
  operation: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const canRetry =
        attempt < maxAttempts &&
        isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed);
      if (!canRetry) {
        throw error;
      }
    }
  }
}
