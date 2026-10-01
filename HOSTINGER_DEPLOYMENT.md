# Hostinger deployment for Easy Zay Mm

This repository contains a Laravel application in `backend/`. The deployment workflow builds the release on GitHub Actions and uploads the ready-to-run release to Hostinger. **Composer is not installed or run on Hostinger during normal deployments.**

## One-time Hostinger setup

1. Create the production `.env` one level above the deployed Laravel directory. Do not commit it:
   ```text
   /home/<account>/domains/easyzaymm.com/public_html/.env
   ```
2. Set the domain document root to:
   ```text
   .../public_html/backend/public
   ```
3. Create the Laravel storage symlink once from the `backend` directory:
   ```bash
   php artisan storage:link
   php artisan migrate --force
   php artisan optimize
   ```
4. Create an FTP account in hPanel with access to the deployment directory.
5. In GitHub → Settings → Secrets and variables → Actions, add:
   - `HOSTINGER_FTP_SERVER` — Hostinger FTP hostname
   - `HOSTINGER_FTP_USERNAME` — FTP username
   - `HOSTINGER_FTP_PASSWORD` — FTP password
   - `HOSTINGER_FTP_SERVER_DIR` — absolute remote directory, usually ending in `/public_html/backend/`

The workflow will pass tests, install production Composer dependencies, build Vite assets, and then upload `backend/` including `vendor/` and `public/build/`.

## Every future deployment

```bash
git add .
git commit -m "describe the change"
git push origin main
```

The `Hostinger deployment` GitHub Actions workflow then does the following:

1. Runs Laravel tests with SQLite.
2. Runs `composer install --no-dev` on GitHub Actions.
3. Runs the frontend build on GitHub Actions.
4. Uploads the ready release to Hostinger over FTP.
5. Does **not** run Composer on the Hostinger server.

If the four FTP secrets are not configured, CI still runs its release checks and skips deployment with a clear message.

## Protecting uploaded product/media files

`backend/storage/app/public` is runtime data, not source code. Product images, shop logos/covers, and any `vector` directory placed there are excluded from FTP cleanup:

```text
backend/storage/**
backend/public/storage/**
```

Therefore a code deployment cannot delete existing uploaded media. Do not put uploaded files in `backend/public/build`; that directory is generated and may be replaced on each release.

The repository currently has no tracked `vector` directory and cannot restore files that were already deleted from the server. This workflow prevents future deletion. If the old files still exist in a Hostinger backup, restore them to:

```text
backend/storage/app/public/vector/
```

Then confirm the `backend/public/storage` symlink points to `../storage/app/public`.

## Important rules

- Keep `.env` on the server; never commit it.
- Do not use Hostinger Git auto-deployment together with this FTP workflow, otherwise two deployments can race.
- Disable the old Hostinger Git auto-deployment/webhook after adding the FTP secrets.
- Do not manually move `index.php`, `.htaccess`, `vendor`, or media files after each release.
- Do not use `composer update` in production; dependency versions come from the committed `backend/composer.lock`.
