# Financial Transaction Management System

A full-stack financial management application developed as a technical assessment project for a software engineering interview.

Built with **NestJS, Next.js, TypeScript, Prisma, and PostgreSQL**, focusing on secure financial transactions, data integrity, and concurrent request handling.

## Tech Stack

- **Backend:** NestJS, Node.js, TypeScript, Prisma
- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Testing:** Jest, Supertest
- **DevOps:** Docker, Docker Compose
- **API Documentation:** Swagger / OpenAPI

## Key Features

- Customer and bank account management
- Deposits, withdrawals, and account-to-account transfers
- Atomic database transactions with rollback support
- Concurrency control using PostgreSQL row-level locking
- Precise monetary calculations using Decimal
- Transaction history with filtering, sorting, and pagination
- Financial reporting and interactive dashboard
- JWT authentication and API security
- Unit and integration tests

## Getting Started

Make sure Docker Desktop is running.

```bash
cp .env.example .env
docker compose up --build
```

The database is automatically initialized with sample data.

**Application:** http://localhost:3000

**API Documentation:** http://localhost:3001/api/docs

### Demo Credentials

```text
Username: admin
Password: ChangeMe!2026
```

Demo credentials are intended for local development only.

## Testing

```bash
cd backend
npm test
npm run test:e2e
```

## Project Scope

This project demonstrates full-stack development practices, RESTful API design, relational database modeling, financial transaction integrity, concurrency handling, and automated testing.
