# Hostinger Git deployment for Easy Zay Mm

The Laravel application lives in `backend/`. **Do not move `.env`, `public/index.php`, or files from `backend/public` after each Git update.** Configure Hostinger once as follows.

## 1. Hostinger Git deployment

In hPanel:

1. Open **Websites → Manage → Advanced → Git**.
2. Connect `hidecard/marketplace-app`.
3. Select branch `main`.
4. In the build configuration, set the repository/application root to:

```text
backend
```

Use `backend` for the screenshot's **Root directory** field. Do not use `backend/public` there; `backend/public` is the web document root, not the Laravel build root.

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
bash scripts/hostinger-build.sh
```

The script installs dependencies, runs the Laravel/Vite build, and verifies that `public/index.php` and `public/.htaccess` remain in place. It never moves or copies `.env` or `public/index.php`.

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

## 6. Automatic GitHub Actions verification and deployment trigger

The repository now includes:

```text
.github/workflows/hostinger.yml
```

Every push to `main` runs PHP 8.4 tests, the frontend build, and checks that `backend/public/index.php` and `.htaccess` remain in the correct location. The workflow then calls an optional `HOSTINGER_DEPLOY_WEBHOOK` secret if one is configured.

For the current Hostinger **GitHub auto-deployment** connection, no secret is required: Hostinger receives the GitHub push webhook automatically and deploys the selected branch. Keep Hostinger's selected branch as `main` and enable the Auto-deployment status.

Only for an older Hostinger **SSH-based Git deployment** setup:

1. In Hostinger → Advanced → Git → repository actions, open **Auto Deployment** and copy its webhook URL.
2. In GitHub → Settings → Secrets and variables → Actions, add a repository secret named `HOSTINGER_DEPLOY_WEBHOOK`.
3. Paste the Hostinger webhook URL as the secret value.
4. Push to `main`; the workflow will call the webhook only after tests and build succeed.

Do not use the `hostinger/deploy-action` VPS action for this shared-hosting Laravel site. Hostinger documents that action for VPS/Docker deployments, not the shared-hosting Git integration.

## Why the manual move was happening

The repository root is not the Laravel public directory. If the Git/build root is set to `backend/public`, the deployment treats the public directory as the application root and encourages manual file moves. Keep the Git/build root at `backend`, and set the domain document root separately to `.../public_html/backend/public`. Moving `index.php` manually only masks the wrong configuration and is overwritten by the next Git deployment.

Official Hostinger Git deployment reference: <https://docs.hostinger.com/websites/git>
Hostinger VPS GitHub Actions reference: <https://www.hostinger.com/support/deploy-to-hostinger-vps-using-github-actions/>
