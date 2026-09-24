<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).


# Marketplace API migration notes

This directory is the replacement backend foundation for the Firebase Functions/Firestore implementation. The migration is intentionally incremental: the current Firebase production system remains active until each Web and Admin flow has a Laravel API equivalent and has passed staging QA.

## Local development

Install PHP 8.3+, Composer, the PHP MySQL and SQLite extensions, and MySQL 8+. Copy `.env.example` to `.env`, set the MySQL values, then run:

```bash
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

Production and staging should use MySQL:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=marketplace
DB_USERNAME=marketplace
DB_PASSWORD=change-me
```

## API foundation

The initial API includes `GET /api/health`, `POST /api/auth/register`, throttled `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/logout-all`, `PATCH /api/auth/profile`, `POST /api/auth/change-password`, `GET /api/user/me`, seller-protected `GET /api/seller/me`, and admin-protected `GET /api/admin/me`. Registration owns the defaults `role=user`, `status=active`, and `phone_verified=false`. The first MySQL-compatible tables are `users`, `shops`, `products`, `orders`, and `order_items`.

Roles are explicit and server-enforced: `user` is the default marketplace account, `seller` is granted by a future server-side shop/onboarding flow, and `admin` is reserved for administrative operations. Every role middleware also requires `status=active`; suspended and banned accounts are rejected before role checks. The aliases are `active.user`, `seller`, `admin`, and parameterized `role:user,seller,admin`.

Product and order APIs are now available for the migration boundary: public `GET /api/products` and `GET /api/products/{product}`, seller-owned product create/update/hide endpoints, `GET/POST /api/orders`, and seller/admin order status updates. Checkout locks products inside a MySQL transaction, reads price and seller identity from the database, decrements stock, accepts COD only, and replays an existing order for the same idempotency key without consuming stock twice.

Shop onboarding and verification APIs are also available: `GET/POST/PATCH /api/shop`, seller verification history/submission at `GET/POST /api/seller/verification`, and Admin moderation at `GET /api/admin/verifications` plus `POST /api/admin/verifications/{id}/review`. Creating a shop promotes an active normal user to `seller`; the shop remains unverified until an active admin approves a pending request. Rejected requests may be resubmitted, while duplicate pending requests are rejected atomically.

Verified-seller business APIs are now available under `/api/business`: inventory listing and idempotent stock adjustment, transactional POS sales with server price/stock/COGS/gross-profit calculation, and idempotent expense creation/listing. All business routes require an active `seller` account whose shop is approved and verified; unverified sellers remain limited to onboarding and verification.

Report summaries are available at `GET /api/business/reports/summary` for a verified seller's shop and `GET /api/admin/reports/summary` for all shops. Both accept optional `from` and `to` dates and return POS revenue/COGS/gross profit, marketplace order totals, expenses, net profit, and daily sales rows.

Chat and notification APIs are now available behind active-user authentication. Conversations are created from an order, product, or shop context so the server resolves the real buyer/seller participant; only participants can list messages, send messages, or mark a conversation read. Notification inboxes are user-scoped and support unread counts, single read, and mark-all-read operations.

## Migration policy

Do not delete the Firebase project, rules, Functions, or production secrets yet. The Web and Admin clients currently contain direct Firebase reads and writes. Each feature must first gain a Laravel endpoint, API client adapter, tests, and staging verification. Firebase can be removed only after the final data migration, cutover, rollback rehearsal, and production QA.


## Database migration and seed data

The initial migration creates role-aware `users` (`user`, `seller`, `admin`) plus `shops`, `products`, `orders`, and `order_items`. Run the schema and default data with:

```bash
php artisan migrate:fresh
php artisan db:seed
```

`DefaultAccountsSeeder` is idempotent and creates an active Admin, Seller, and User. It also creates an approved demo shop and one active demo product for the Seller. Set `SEED_ADMIN_PASSWORD`, `SEED_SELLER_PASSWORD`, and `SEED_USER_PASSWORD` in the environment before seeding. Production seeding refuses to run when any password is missing; local development uses clearly temporary passwords only when `APP_ENV` is not `production`.
