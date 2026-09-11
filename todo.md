# Padetha Marketplace Project Todo List

> Status is split into two levels: **Implemented** means the source code and basic flow exist in the repository. **Pending** means it still needs production verification, security review, automated tests, deployment, or release sign-off.

## 1. Implemented in the Repository

### Foundation and Firebase Structure
- [x] Firebase project configuration exists
- [x] Web, admin, Flutter, Firebase Functions, and shared workspace structures exist
- [x] Firestore, Storage, Auth, and Cloud Functions structure exists
- [x] Base navigation and layout shells exist
- [x] Shared constants, enums, and domain structures exist
- [x] Firebase App Check integration structure exists in client/rules code

### Authentication and User Flow
- [x] Email/password authentication flow exists
- [x] Phone OTP flow exists in the web app
- [x] Profile-related screens and user state flow exist
- [x] Verification checks and protected-flow patterns exist
- [x] Basic onboarding and error-handling patterns exist

### Marketplace Read Flow
- [x] Home page with banners, categories, shops, and products exists
- [x] Search, filtering, sorting, and product listing views exist
- [x] Product detail page exists
- [x] Shop profile page exists
- [x] Favorites and shop-follow interactions exist

### Individual Selling and Shop Creation
- [x] Individual listing flow exists
- [x] Shop creation form exists
- [x] Shop verification request flow exists
- [x] Pending, approved, and rejected verification states exist in the UI/data flow
- [x] Business-mode gating structure exists

### Business Mode and Inventory
- [x] Business workspace exists
- [x] Product management and product forms exist
- [x] Stock and low-stock UI exists
- [x] Inventory movement page/data structure exists
- [x] Shared stock/business operation structure exists

### POS, Sales, Profit, and Expenses
- [x] POS cart and checkout UI exists
- [x] Cash, KBZPay, WavePay, bank transfer, and other payment options exist in the flow
- [x] Sale snapshot/data structure exists
- [x] Sales, COGS, gross profit, and expenses UI/data structures exist
- [x] Receipt/printing support structure exists

### Orders, Notifications, Chat, and Offers
- [x] Marketplace cart/checkout and order management flow exists
- [x] Order status views exist
- [x] Notification service and web Firebase Messaging service worker exist
- [x] Chat list/detail and messaging pages exist
- [x] Offer screens and offer handling flow exist

### Reviews, Reports, and Trust
- [x] Review screens and completed-order flow structure exist
- [x] Shop rating/review data structure exists
- [x] Product, shop, and user report flows exist
- [x] Admin moderation/trust support structure exists

### Admin Web and PWA
- [x] Admin dashboard exists
- [x] User, shop, product, order, report, verification, banner, and category management pages exist
- [x] Analytics/dashboard summary structure exists
- [x] Web PWA manifest configuration exists
- [x] Web service worker/notification wiring exists

## 2. Not Finished — Production, Security, and Release Work

### A. Firebase Security and App Check
- [ ] Review Firestore Rules for high-severity security findings
- [ ] Review Storage Rules for high-severity security findings
- [ ] Deploy Firestore Rules to the target Firebase project
- [ ] Deploy Storage Rules to the target Firebase project
- [ ] Enable Android App Check with Play Integrity
- [ ] Enable iOS App Check with Device Check, if iOS is ever released
- [ ] Enable Web App Check with reCAPTCHA v3
- [ ] Enable App Check for the admin web app
- [ ] Remove debug App Check tokens from production builds
- [ ] Confirm Firebase Emulator secrets are not included in client builds
- [ ] Restrict Firebase/Google API keys to the correct app fingerprints and domains
- [ ] Confirm no service-account key or private credential is committed

### B. Server-Authoritative Backend
- [ ] Make marketplace order creation fully server-authoritative
- [ ] Make POS sale creation fully server-authoritative
- [ ] Re-read product price, cost price, and stock inside server transactions
- [ ] Calculate order totals, discounts, COGS, and profit on the server
- [ ] Prevent clients from directly changing protected stock/order/money fields
- [ ] Enforce valid order-state transitions on the server
- [ ] Move all sensitive stock writes from clients to callable functions
- [ ] Enforce shop ownership/member authorization in every sensitive callable
- [ ] Add idempotency keys to order creation
- [ ] Add idempotency keys to POS sales
- [ ] Add idempotency keys to stock changes
- [ ] Add idempotency keys to offer creation/response
- [ ] Add idempotency keys to review and report creation
- [ ] Send notifications only after successful backend commits

### C. Automated QA and Emulator Tests
- [ ] Add duplicate order submission test
- [ ] Add concurrent last-stock order test
- [ ] Add invalid order transition test
- [ ] Add buyer cancellation permission test
- [ ] Add completed-order-only review test
- [ ] Add one-review-per-order test
- [ ] Add own-product offer restriction test
- [ ] Add one-shop-per-user test
- [ ] Add unique-shop-slug test
- [ ] Add one-pending-verification-per-shop test
- [ ] Add Firestore Rules emulator tests
- [ ] Add Cloud Functions emulator tests
- [ ] Add web critical-flow tests
- [ ] Add admin critical-flow tests
- [ ] Complete manual staging QA for buyer, seller, business, and admin flows

### D. Build and CI
- [ ] Add GitHub Actions workflow under `.github/workflows/ci.yml`
- [ ] Run Flutter analyze in CI
- [ ] Run Flutter tests in CI
- [ ] Run Dart analyze in CI
- [ ] Run Firebase Emulator tests in CI
- [ ] Run web typecheck/build/lint in CI
- [ ] Run admin typecheck/build/lint in CI
- [ ] Confirm production web build succeeds
- [ ] Confirm production admin build succeeds
- [ ] Confirm Android release build succeeds with a real release key

### E. Localization
- [ ] Create Flutter `app_en.arb` localization file
- [ ] Create Flutter `app_my.arb` localization file
- [ ] Replace remaining hard-coded Flutter English strings
- [ ] Add Burmese and English strings for authentication/onboarding
- [ ] Add Burmese and English strings for marketplace flows
- [ ] Add Burmese and English strings for business/POS flows
- [ ] Add Burmese and English strings for admin/review/report flows
- [ ] Add locale-aware date, number, and Myanmar kyat formatting
- [ ] Review web/admin Burmese and English coverage

### F. Monitoring and Operations
- [ ] Configure Crashlytics or Sentry for Flutter
- [ ] Configure error reporting for web and admin
- [ ] Instrument key analytics events
- [ ] Deploy and verify Firestore indexes
- [ ] Measure Cloud Function cold start and latency
- [ ] Monitor FCM delivery
- [ ] Configure offline persistence where appropriate
- [ ] Document rollback procedure

### G. Deployment and Release
- [ ] Configure staging Firebase project/environment
- [ ] Complete staging end-to-end test
- [ ] Configure production Firebase project
- [ ] Deploy Cloud Functions
- [ ] Configure web custom domain
- [ ] Configure admin custom domain
- [ ] Verify SSL certificates
- [ ] Complete release security review
- [ ] Complete release QA sign-off
- [ ] Upload signed Android APK/AAB to internal testing
- [ ] Verify production App Check enforcement
- [ ] Monitor Firebase errors, quota, cost, and function latency after deployment
- [ ] Gather and review initial user feedback

## 3. Explicitly Out of Scope for V1

- [x] Wallet, escrow, and online payment gateway
- [x] Courier API integration
- [x] Paid subscription and paid boost
- [x] Multi-branch and staff-role management
- [x] Advanced CRM
- [x] AI recommendation system
- [x] Native iOS app release

## 4. Recommended Execution Order

1. Firebase Rules and Storage Rules security review
2. App Check configuration and enforcement
3. Server-authoritative order, POS, stock, and money validation
4. Idempotency and order-state transition handling
5. Firestore/Functions emulator tests
6. Web, admin, and Flutter CI checks
7. Burmese/English localization completion
8. Staging deployment and full QA
9. Production deployment and release sign-off
10. Post-deployment monitoring

## 5. Current Definition of Done

The project is **feature-complete at source level**, but it is **not release-complete yet**.

Release is complete only when all of the following are true:

- [ ] P0 backend/security work is signed off in staging
- [ ] All protected money, stock, and order-state writes are server-authoritative
- [ ] Firestore and Storage Rules pass security review
- [ ] App Check is enforced in production
- [ ] Automated and emulator tests pass
- [ ] Flutter, web, and admin builds pass in CI
- [ ] Burmese and English UI coverage is complete
- [ ] Signed Android build is uploaded for internal testing
- [ ] Release checklist is fully completed
