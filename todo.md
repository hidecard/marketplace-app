# Padetha Marketplace Project Todo List

> **Last updated:** 2026-09-23
>
> **Current priority:** Web PWA first. Flutter/Android work is intentionally deferred until the Web release is stable.
> **Status rule:** `[x]` means implemented and locally verified in this repository. `[ ]` means deployment, credentials, automated coverage, staging validation, or implementation is still required.

## 1. Completed in This Web-First Pass

### Web Build, Hosting, and CI

- [x] Clone and audit the repository against the supplied project PDF.
- [x] Configure the supplied Firebase Web values in local ignored `web/.env` and `admin/.env` files.
- [x] Fix the missing `addProduct` English/Burmese translation that blocked the Web build.
- [x] Fix the Web Vite output path from the incorrect root `dist/` directory to `web/dist/`.
- [x] Confirm `wrangler.jsonc` now packages the fresh `web/dist` output used by the existing `marketplace-app` Worker.
- [x] Add `.github/workflows/deploy-cloudflare.yml` for pull-request CI and automatic `main` deployment.
- [x] Run Web and admin typecheck, lint, and production builds in CI.
- [x] Build, lint, and unit-test Firebase Functions in CI.
- [x] Compile Firestore and Storage Rules with Firebase emulators in CI.
- [x] Deploy Firebase Functions, Firestore rules/indexes, and Storage rules before the Web Worker in CI.
- [x] Upload and reuse the validated Web artifact instead of rebuilding during deployment.
- [x] Add deployment concurrency so an older workflow cannot overwrite a newer `main` build.
- [x] Document required GitHub secrets and the hosted URL in `README.md`.
- [x] Confirm local Web production build succeeds.
- [x] Confirm local admin production build succeeds.
- [x] Confirm Cloudflare Wrangler dry-run succeeds and discovers the current Web assets.
- [x] Smoke-test the fresh Web production preview and confirm the Marketplace page loads.

### Authentication and Identity Safety

- [x] Keep email/password authentication and phone OTP entry flows.
- [x] Change phone verification from signing into a separate phone account to linking the phone credential to the current account.
- [x] Add `syncPhoneVerification` so the backend updates `phoneVerified` only when Firebase Auth confirms a linked phone number.
- [x] Remove the unused client-authoritative `phoneVerified` update path.
- [x] Prevent normal users from changing protected role, status, phone-verification, and shop-verification fields in Firestore Rules.
- [x] Add an authenticated User boundary that preserves the intended destination and rejects suspended/banned accounts.
- [x] Add a Seller/onboarding boundary that lets shop owners reach the dashboard and verification flow before approval.
- [x] Keep seller operations behind the approved-and-verified shop middleware.
- [x] Add an active Firestore `admin` role in both Admin login and Admin protected routes.
- [x] Deploy the Admin SPA to a separate protected Worker at `marketplace-admin.hidecard1500.workers.dev`.

### Shop Creation, Verification, and Business Access

- [x] Move shop creation from direct client writes to the `onCreateShop` callable.
- [x] Add transactional one-shop-per-owner and unique-slug lock documents.
- [x] Preserve shop logo, cover, address, contact, and social-link data during callable creation.
- [x] Preserve existing custom claims when adding a shop claim.
- [x] Move verification submission to the `submitVerification` callable.
- [x] Standardize verification data on the canonical `verification_requests` collection used by Web, admin, rules, and triggers.
- [x] Make one pending verification request per shop atomic and deterministic.
- [x] Validate and limit verification image type, size, and count.
- [x] Move admin approval/rejection to the transactional `reviewVerification` callable.
- [x] Keep Firebase Auth custom-claim updates outside Firestore transactions.
- [x] Set `verified`, `verificationStatus`, `businessModeEnabled`, and user `shopVerified` consistently on approval/rejection.
- [x] Support resubmission after rejection and show the admin rejection note.
- [x] Add a verified-business route guard for dashboard, POS, products, inventory, orders, analytics, reports, expenses, customers, and settings.
- [x] Keep shop creation and verification-status routes available before approval.
- [x] Update the sidebar to distinguish no shop, pending/rejected verification, and approved business access.
- [x] Remove unsupported seller access to global marketplace category management.

### Products, Orders, Stock, POS, and Profit

- [x] Add server-authoritative `saveProduct` create/update callable.
- [x] Require phone verification for individual listings and approved-shop ownership for business listings.
- [x] Prevent products from being reassigned between seller accounts.
- [x] Validate price, stock, condition, images, and seller identity on the server.
- [x] Record initial and edited stock movements for shop products.
- [x] Remove the Firestore-sized base64 image fallback; failed uploads now fail visibly.
- [x] Store pre-creation/shop/product images under authenticated user-owned Storage paths.
- [x] Make marketplace order creation server-authoritative for product price, stock, seller identity, totals, and COD-only payment.
- [x] Add support for individual-seller order identity independently of shop ownership.
- [x] Make POS sales server-authoritative and remove the insecure direct Firestore transaction fallback.
- [x] Require an approved verified shop for POS and manual stock changes.
- [x] Validate POS payment method and product status on the server.
- [x] Calculate POS subtotal, discount, tax, COGS, and gross profit on the server.
- [x] Render POS receipts and analytics from the server sale result.
- [x] Add caller-scoped idempotency for marketplace orders, POS sales, stock changes, expenses, and product saves.
- [x] Make order and POS idempotency checks transactionally race-safe.
- [x] Enforce the server order-state transition machine.
- [x] Route expense creation through its authorized callable.
- [x] Improve POS layout for mobile/tablet widths.
- [x] Record receipt-print intent and keep failed print payloads in a bounded local retry queue.
- [x] Fix marketplace checkout for legacy products without sellerId by resolving the shop owner server-side.
- [x] Split carts containing products from different sellers into separate COD orders.
- [x] Return a JSON-safe createOrder response so Firestore timestamp sentinels cannot surface as callable internal errors.
- [x] Return a JSON-safe onCreateShop response so shop creation cannot fail after the transaction commits.
- [x] Keep shop creation successful when optional Auth custom-claim propagation is temporarily unavailable.
- [x] Store new product images in a public marketplace-read namespace while retaining owner-only validated uploads.
- [x] Show actionable upload/save errors in the product form instead of generic failure messages.

### Chat, Notifications, and Trust Boundaries

- [x] Add server-authoritative deterministic `createChat` callable.
- [x] Resolve the real seller from the order, product, or shop instead of using a product ID as a chat participant.
- [x] Migrate order, product, and shop chat creation to the callable.
- [x] Remove arbitrary client notification document creation.
- [x] Remove insecure legacy `updateStock` and `sendPushNotification` callable endpoints.
- [x] Restrict analytics ingestion to authenticated callers and an event allowlist.
- [x] Trigger verification notifications from committed canonical verification writes.

### Firestore and Storage Security

- [x] Replace invalid `request.app` rule checks with supported authorization rules and documented App Check service enforcement.
- [x] Deny direct client writes to protected shops, products, orders, POS sales, chats/messages, offers, reviews, reports, expenses, verification requests, inventory movements, and backend operation locks.
- [x] Allow only safe owner-editable shop profile fields from the Web settings page.
- [x] Restrict notification updates to the owner and the `read` field only.
- [x] Preserve safe favorites, addresses, and admin-management paths.
- [x] Tighten Storage to authenticated owners, shop members, chat participants, and admins.
- [x] Enforce image MIME type and a 5 MB upload limit in both Web validation and Storage Rules.
- [x] Confirm Firestore and Storage Rules compile successfully in the emulator suite.
- [x] Confirm no service-account key or private deployment credential is committed.

### Local Verification Completed

- [x] Web TypeScript check.
- [x] Admin TypeScript check.
- [x] Web ESLint with zero warnings.
- [x] Admin ESLint with zero warnings.
- [x] Web production build and PWA generation.
- [x] Admin production build.
- [x] Firebase Functions TypeScript build.
- [x] Firebase Functions ESLint.
- [x] Existing Functions unit suite: 19 tests passing.
- [x] Firestore and Storage Rules emulator compilation.
- [x] `git diff --check`.
- [x] Wrangler deployment dry-run.

## 2. Still Pending — Required Before Production Sign-Off

### Credentials and Actual Deployment

- [x] Add GitHub secret `CLOUDFLARE_API_TOKEN` with scoped Workers edit permission.
- [x] Add GitHub secret `CLOUDFLARE_ACCOUNT_ID` for the Worker owner account.
- [x] Add GitHub secret `FIREBASE_SERVICE_ACCOUNT` with Firebase deployment permissions.
- [ ] Add `VITE_FIREBASE_VAPID_KEY` for production Web push notifications.
- [ ] Add `VITE_FIREBASE_APP_CHECK_KEY` for the Web PWA.
- [ ] Add the admin Web App Check key/provider configuration.
- [x] Push the workflow to `main` and confirm the GitHub Actions quality job passes.
- [x] Pass the production deployment-secret preflight in GitHub Actions.
- [x] Confirm Firebase Functions, Firestore indexes/rules, and Storage rules deploy from CI.
- [x] Initialize the Firebase Storage bucket and deploy hardened Storage Rules.
- [x] Confirm the Cloudflare Worker deploy job succeeds from CI.
- [x] Confirm the production URL serves the new `assets/index-BTU3S4HP.js` bundle rather than the previous asset.
- [ ] Revoke every Cloudflare token and R2 access credential exposed during setup, create replacements, and update only the GitHub secrets/integrations that actually use them.
- [ ] Add a custom domain only if a domain is selected; the current Workers URL already has managed HTTPS.

### App Check Rollout

- [ ] Register reCAPTCHA Enterprise/App Check providers for the Web PWA and admin app.
- [ ] Verify App Check tokens in staging for Firestore, Storage, Authentication, and callable Functions.
- [ ] Set repository variable `ENFORCE_APP_CHECK=true` only after both Web clients are configured.
- [ ] Enable App Check enforcement in Firebase Console for Firestore, Storage, and supported services.
- [ ] Restrict Firebase/Google API keys to the final production domains and APIs.
- [ ] Enable Android Play Integrity later when app work resumes.

### Automated Tests Still Missing

- [ ] Add Firestore Rules authorization tests for buyer, individual seller, shop owner, non-member, and admin roles.
- [ ] Add Storage Rules tests for user drafts, shop images, verification evidence, and unauthorized access.
- [ ] Add duplicate order submission integration test.
- [ ] Add concurrent last-stock order test.
- [ ] Add duplicate POS submission integration test.
- [ ] Add buyer cancellation permission test.
- [ ] Add completed-order-only review test.
- [ ] Add one-review-per-order test.
- [ ] Add own-product offer restriction test.
- [ ] Add one-shop-per-user concurrency test.
- [ ] Add unique-shop-slug concurrency test.
- [ ] Add one-pending-verification-per-shop concurrency test.
- [ ] Add Web critical-flow tests for sign-up, phone link, listing, checkout, verification, and POS.
- [ ] Add admin critical-flow tests for verification, reports, orders, users, and products.

### Backend Follow-Up

- [ ] Add caller-scoped idempotency to offer creation/response.
- [ ] Add caller-scoped idempotency to review and report creation.
- [ ] Complete a second callable-by-callable authorization audit, including all admin-only paths.
- [ ] Add server-owned delivery-fee configuration if paid delivery is introduced; V1 currently forces COD and a zero server fee.
- [ ] Add explicit promotion/coupon models before allowing order discounts; V1 ignores buyer-supplied discounts.
- [ ] Add retention/cleanup jobs for operation locks, analytics events, old notifications, rejected evidence, and local print retries.
- [ ] Add rate limits/abuse controls for chat, offers, reports, reviews, follows, and analytics events.
- [ ] Add pagination to large Web and admin collection screens.

### Web and Admin Product Work

- [x] Fix mobile BottomNav overlap with Cart/Product fixed action bars using shared safe-area-aware offsets and content spacing.
- [x] Add a full admin verification detail view with evidence-photo gallery rather than list-only review.
- [x] Replace the rejection `prompt()` with a designed moderation dialog.
- [ ] Complete Burmese/English coverage for remaining hard-coded Web and admin strings.
- [ ] Add locale-aware date, number, and Myanmar kyat formatting.
- [ ] Add Web/admin error reporting such as Sentry.
- [ ] Monitor FCM delivery and provide a production notification-permission UX.
- [ ] Add deployment rollback documentation and a tested rollback procedure.
- [ ] Reduce the current large Web/admin JavaScript bundles with route-level code splitting.
- [ ] Complete manual staging QA on phone linking, individual selling, shop verification, business unlock, orders, chat, offers, POS, expenses, and admin moderation.
- [ ] Complete release security review and QA sign-off.

## 3. Flutter/Android App — Deferred Until Web Is Stable

- [ ] Run Flutter/Dart analyze and tests in CI.
- [ ] Create and complete `app_en.arb` and `app_my.arb` localization files.
- [ ] Replace remaining hard-coded Flutter strings.
- [ ] Align Flutter callable contracts with the hardened Web/backend schemas.
- [ ] Configure Android App Check with Play Integrity.
- [ ] Configure Crashlytics or Sentry for Flutter.
- [ ] Create and protect the real Android release signing key.
- [ ] Build a signed APK/AAB and upload it to internal testing.
- [ ] Perform Android buyer, seller, business, notification, offline, and low-end-device QA.

## 4. Explicitly Out of Scope for V1

- [x] Wallet, escrow, and online payment gateway.
- [x] Courier API integration.
- [x] Paid subscription and paid boost.
- [x] Multi-branch and staff-role management.
- [x] Advanced CRM.
- [x] AI recommendation system.
- [x] Native iOS release.

## 5. Current Definition of Done

The Web-first source is substantially hardened, all automated checks pass, the Firebase backend/rules are deployed, and the Cloudflare Worker is serving the verified current bundle. Full production sign-off still requires rotating the setup credentials exposed outside GitHub Secrets, configuring and enforcing App Check, adding the listed authorization/concurrency tests, and completing staging QA.
