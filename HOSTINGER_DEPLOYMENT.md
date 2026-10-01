# Hostinger deployment for Easy Zay Mm

The current Hostinger setup deploys the contents of `backend/` directly into `public_html`. Hostinger replaces that directory during Git sync, which is why `vendor/` disappeared after every GitHub push.

The fix is a one-time Hostinger **Build command**. It stores Composer dependencies one level above `public_html`, reuses them when `composer.lock` has not changed, and recreates the `vendor` symlink after each deployment. You will not need to SSH in and run Composer manually again.

## One-time Hostinger configuration

In hPanel → **Websites → Manage → Advanced → Git**:

- Repository: `hidecard/marketplace-app`
- Branch: `main`
- Deployment/build root: the deployed Laravel root (`public_html`, which contains `artisan` and `composer.json`)
- Build command:
  ```bash
  bash scripts/hostinger-build.sh
  ```
- Enable Auto-deployment.

The screenshot layout confirms that `public_html` is already the Laravel root because it contains `artisan`, `composer.json`, `app/`, `routes/`, and `public/`.

Create the production environment file once at:

```text
/home/<account>/domains/easyzaymm.com/.env
```

The Laravel bootstrap is configured to load this file from outside the directory Hostinger replaces. Do not commit it and do not place it inside `public/`.

Set the domain document root to:

```text
.../public_html/public
```

Run these commands only once after the first deployment, if the storage link has not been created:

```bash
cd .../public_html
php artisan storage:link
php artisan migrate --force
php artisan optimize
```

## What happens after every Git push

1. Hostinger syncs the `main` branch into `public_html`.
2. `scripts/hostinger-build.sh` checks `composer.lock`.
3. If dependencies are unchanged, the persistent vendor cache is reused; Composer does not run.
4. If `composer.lock` changed, Composer runs automatically once and refreshes the cache.
5. The script recreates `public_html/vendor` as a symlink to the persistent cache.
6. Laravel package discovery and the Vite frontend build run automatically.

The persistent cache is stored at:

```text
/home/<account>/domains/easyzaymm.com/.easyzaymm-vendor/
```

It is outside `public_html`, so Git deployment does not delete it.

## Uploaded files and the vector folder

Do not store uploads in the Git-managed source tree. Product images, shop logos/covers, and any vector files belong in:

```text
public_html/storage/app/public/
```

The existing `public/storage` link should point to `../storage/app/public`. The build script never deletes `storage/` or uploaded media.

The repository does not contain the old deleted vector files, so files already removed from Hostinger must be restored from a Hostinger backup. The new workflow prevents future deployments from removing them.

## GitHub Actions

`.github/workflows/hostinger.yml` validates the release on every push. It runs Composer with dev dependencies in CI for tests, builds the frontend, and verifies the Laravel layout. Hostinger performs the actual deployment through its Git integration and the one-time build command above.

No Hostinger FTP secrets are required for this direct Git deployment.
