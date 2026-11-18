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
