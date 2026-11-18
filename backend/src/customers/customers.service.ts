import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export interface PaginatedCustomers {
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Prisma hata kodları: https://www.prisma.io/docs/orm/reference/error-reference
const UNIQUE_CONSTRAINT_FAILED = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    try {
      return await this.prisma.customer.create({ data: dto });
    } catch (error) {
      throw this.translateError(error);
    }
  }

  async findAll(query: QueryCustomerDto): Promise<PaginatedCustomers> {
    const { page, limit, sortBy, sortOrder, search } = query;
    const where = this.buildSearchFilter(search);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        // id ikincil sıralama: aynı değere sahip kayıtlarda sayfalar arası tutarlılık.
        orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw this.notFound(id);
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    try {
      return await this.prisma.customer.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.translateError(error, id);
    }
  }

  private buildSearchFilter(search?: string): Prisma.CustomerWhereInput {
    if (!search) {
      return {};
    }
    const contains = { contains: search, mode: 'insensitive' } as const;
    return {
      OR: [
        { firstName: contains },
        { lastName: contains },
        { email: contains },
      ],
    };
  }

  /** Bilinen Prisma hatalarını uygun HTTP hatalarına çevirir. */
  private translateError(error: unknown, id?: string): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === UNIQUE_CONSTRAINT_FAILED) {
        return new ConflictException('Bu e-posta adresi zaten kullanılıyor');
      }
      if (error.code === RECORD_NOT_FOUND && id) {
        return this.notFound(id);
      }
    }
    return error;
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Müşteri bulunamadı: ${id}`);
  }
}
