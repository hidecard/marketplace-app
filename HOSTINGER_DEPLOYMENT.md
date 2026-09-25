# Hostinger Git deployment for Easy Zay Mm

The Laravel application lives in `backend/`. **Do not move `.env`, `public/index.php`, or files from `backend/public` after each Git update.** Configure Hostinger once as follows.

## 1. Hostinger Git deployment

In hPanel:

1. Open **Websites → Manage → Advanced → Git**.
2. Connect `hidecard/marketplace-app`.
3. Select branch `main`.
4. Set the Git deployment root to the project directory, for example:

```text
/home/u106997189/domains/easyzaymm.com/public_html
```

The repository should deploy with this structure:

```text
public_html/
├── backend/
│   ├── app/
│   ├── bootstrap/
│   ├── public/
│   │   ├── index.php
│   │   ├── .htaccess
│   │   └── build/
│   ├── storage/
│   ├── vendor/
│   └── .env                 # server-only; never commit
├── web/
└── admin/
```

## 2. Set the domain document root once

In **Domains → easyzaymm.com → Document root**, set:

```text
/home/u106997189/domains/easyzaymm.com/public_html/backend/public
```

If Hostinger displays a different account path, keep the same final part:

```text
.../public_html/backend/public
```

The same document root should be used for `www.easyzaymm.com` if it is configured as a separate domain.

This makes Apache serve `backend/public/index.php` directly. The existing Laravel `backend/public/.htaccess` handles all Laravel routes and asset requests.

## 3. Keep `.env` server-only

Create or keep the production environment file here:

```text
/home/u106997189/domains/easyzaymm.com/public_html/backend/.env
```

It is ignored by Git. Do not put it inside `backend/public` and do not commit it.

Recommended production values:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://easyzaymm.com
```

Keep the database credentials in this server-only file.

## 4. One-time server commands after the first deployment

Run from the deployed Laravel root:

```bash
cd /home/u106997189/domains/easyzaymm.com/public_html/backend
composer install --no-dev --optimize-autoloader
php artisan storage:link
php artisan migrate --force
php artisan optimize
```

Build frontend assets before deployment from the repository/CI environment:

```bash
cd backend
npm ci
npm run build
```

The generated `backend/public/build` directory is intentionally ignored locally, so the deployment must either build it on the server or upload the built assets through the deployment pipeline.

## 5. Every future update

Only push code normally:

```bash
git add .
git commit -m "your change"
git push origin main
```

Then use Hostinger **Redeploy** or enable auto-deployment. Do **not** move:

- `.env`
- `backend/public/index.php`
- `backend/public/.htaccess`
- files from `backend/public` into `backend/`

## Why the manual move was happening

The repository root is not the Laravel public directory. If the domain document root points to `public_html` instead of `public_html/backend/public`, Hostinger looks for `public_html/index.php` and returns 403/404. Moving `index.php` manually only masks the wrong document-root configuration and is overwritten by the next Git deployment.

Official Hostinger Git deployment reference: <https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-on-hostinger/>
