# Marketplace App — Implementation Plan (V1)

This plan covers the remaining work to ship the Myanmar shop-first marketplace + business management platform across the Flutter Android app, the React PWA, the admin web, and the Firebase backend. It complements the AI prompt library at the bottom of this document — each numbered phase here can be paired with a prompt from below when delegating work to an AI assistant.

## Current state (as of this commit)

- Flutter app (`flutter_app/`) builds and runs on Android emulator (Pixel 5, API 34).
- Firebase project `padaytharpin-app` is wired across all three platforms: `google-services.json` (Android), `GoogleService-Info.plist` (iOS), and embedded web config.
- Google Services plugin is applied via the legacy `buildscript` classpath in `android/build.gradle.kts` (more reliable than the declarative `plugins { id(...) }` block in this environment).
- `Firebase.initializeApp()` is guarded with a `duplicate-app` try/catch so hot restart no longer crashes.
- `flutter analyze` and `dart analyze lib` both pass with **zero issues**.
- The 8-phase Flutter UI migration plan (`FLUTTER_MIGRATION_PLAN.md`) is fully implemented: enhanced product / shop / offer cards, banner carousel + ad, verified-shops carousel, popular + new-arrivals sections, animated shimmers, empty-state CTAs, QR modal, category icon support, new header, new bottom nav.
- The web PWA (`web/`) and admin web (`admin/`) already use Vite + React + TypeScript and bind to the same Firebase project via env variables.

## Remaining work (prioritized)

### Phase A — Auth & onboarding hardening (P0, blocks users)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| A1 | Add phone OTP sign-in alongside email/password | `auth_cubit.dart`, `login_page.dart` | Use `firebase_auth`'s `signInWithPhoneNumber` + `RecaptchaVerifier` for web. |
| A2 | Persist auth state across app restarts | `main.dart`, new `auth_repository.dart` | Use `FirebaseAuth.instance.authStateChanges()` stream instead of one-shot `currentUser`. |
| A3 | Add a "forgot password" flow | `login_page.dart`, new `forgot_password_page.dart` | Calls `sendPasswordResetEmail`. |
| A4 | Add profile-completion gate (name, phone, region) before allowing listings | `app_router.dart`, new `profile_setup_page.dart` | Redirect to setup if `appUser.displayName` is empty after first sign-in. |
| A5 | Localize login + onboarding in Burmese and English | `intl` `arb` files | Use `flutter gen-l10n`. |

### Phase B — Business Mode & shop creation (P0)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| B1 | Implement `CreateShopPage` form end-to-end | `business/presentation/pages/create_shop_page.dart` | Fields: name, slug, description, phone, email, address, city, region, lat/lng. |
| B2 | Wire shop creation to a Cloud Function `onCreateShop` | `firebase/functions/` | Function validates input, creates the shop doc with `verified=false`, creates a `shopMembers/{uid}` doc, and grants the owner the `shopVerified` claim via custom auth claims. |
| B3 | Implement `VerificationPage` (upload NRC, business license, selfie) | `business/presentation/pages/verification_page.dart` | Use `firebase_storage`; request `appUser.shopVerified` claim on submit. |
| B4 | Add admin verification queue UI | `admin/presentation/pages/admin_verifications_page.dart` | Approve / reject; on approve set `shop.verified=true` and refresh custom claims. |
| B5 | Gate `/business/*` routes on `state.shop != null && state.shop.verified` | `app_router.dart` | Redirect unverified users to `/business/verification`. |

### Phase C — Server-authoritative inventory (P0, security)

This is the most important backend change: stock, money, and order-state transitions must move from client code into Cloud Functions / transactions.

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| C1 | Replace client `updateProduct` / `decrementStock` with callable `decrementStock` Cloud Function | `firebase/functions/src/inventory.ts` | Wraps a Firestore transaction, validates `request.auth`, writes an immutable `inventoryMovements` doc, and rejects on insufficient stock. |
| C2 | Implement `createOrder` callable (marketplace COD) | `firebase/functions/src/orders.ts` | Re-reads product price + stock in a transaction, snapshots `price` + `costPrice` per line, computes total server-side, writes order with `status=PENDING`, decrements stock, sends FCM to seller. |
| C3 | Implement `createPOSSale` callable | `firebase/functions/src/pos.ts` | Same as C2 but for the POS flow; supports discount; ignores shipping; writes a receipt snapshot. |
| C4 | Implement `updateOrderStatus` callable with allowed-transition map | `firebase/functions/src/orders.ts` | Reject illegal transitions (e.g. `COMPLETED → PENDING`). Idempotency key required. |
| C5 | Remove direct stock writes from `OrdersCubit`, `BusinessCubit`, `POSCubit` | `features/orders/.../cubit/orders_cubit.dart`, etc. | Replace with HttpsCallable calls. Keep optimistic UI but roll back on server error. |
| C6 | Add a `FirestoreService.callable<T>` wrapper with typed deserialization | `features/shared/services/firestore_service.dart` | One consistent place to call functions and surface errors. |

### Phase D — Chat, offers, reviews, reports (P1)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| D1 | Real-time chat with typing indicators + read receipts | `features/chat/...` | Use `chats/{id}/messages` subcollection; FCM push on new message. |
| D2 | Offer flow (send / accept / reject / counter) | `features/profile/.../offers_page.dart`, `create_offer_page.dart` | Server-side reject if order already created for that product. |
| D3 | Write a review — gate on completed order, one review per `(user, product, orderId)` | `features/profile/.../write_review_page.dart` | Enforce in rules + a `createReview` callable. |
| D4 | Report flow (user / shop / product / review) | `features/profile/.../report_page.dart` | Admin queue in `admin_reports_page.dart`. |

### Phase E — Localization (P1)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| E1 | Add `flutter_localizations` + `intl` ARB workflow | `pubspec.yaml`, `lib/l10n/` | Generate `app_en.arb`, `app_my.arb`. |
| E2 | Replace all hard-coded English strings with `AppLocalizations.of(context).xxx` | throughout `lib/` | ~300 strings. |
| E3 | Locale-aware date / number / currency formatters | uses existing `intl` setup | Use `NumberFormat.currency(locale: 'my_MM', symbol: 'Ks')`. |

### Phase F — PWA parity (P1)

The Flutter migration plan covered the Flutter app only. The PWA already has most features per the web code; the remaining gaps are:

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| F1 | Phone OTP sign-in with `RecaptchaVerifier` (the web app already has it; verify) | `web/src/services/firebase.ts`, `web/src/pages/auth/` | |
| F2 | POS browser print + PDF fallback | `web/src/pages/business/pos/` | Use `react-to-print` for browser print, `jspdf` for PDF. |
| F3 | Web push notifications | `web/public/firebase-messaging-sw.js` | Mirror FCM token save flow from Flutter. |
| F4 | Installable PWA (manifest + service worker for offline catalog) | `web/public/manifest.webmanifest` | |

### Phase G — Quality, observability, release (P2)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| G1 | Add `firebase_crashlytics` and `firebase_analytics` to Flutter | `pubspec.yaml`, `main.dart` | |
| G2 | Add `App Check` enforcement in production | `firebase/firestore.rules`, `firebase/storage.rules` | Reject unverified tokens. |
| G3 | Set up CI (GitHub Actions) running `flutter analyze`, `flutter test`, `firebase emulators:exec "flutter test"`, web build | `.github/workflows/ci.yml` | |
| G4 | Seed script for dev (admin user + 3 categories + 5 products) | `firebase/functions/scripts/seed.ts` | Run with `npm run seed`. |
| G5 | Wire Sentry or `firebase_crashlytics` for the PWA + admin | `web/src/main.tsx` | |

## Definition of Done (V1)

- [ ] All P0 phases (A, B, C) complete and signed off in staging.
- [ ] All money, stock, and order-state changes go through Cloud Functions; client never writes protected fields.
- [ ] Firestore rules pass Prompt 05 review with no high-severity findings.
- [ ] `flutter analyze`, `flutter test`, `dart analyze`, and `npm run lint` all green in CI.
- [ ] E2E test suite (Prompt 06) green on Firebase Emulator Suite.
- [ ] Release review (Prompt 07) approves ship.
- [ ] Burmese + English UI complete for every screen.
- [ ] APK signed with a real release key, uploaded to internal testing track.

## Risks / open questions

1. **Custom auth claims** for `isAdmin` / `shopVerified` need a refresh on the client when changed server-side. Plan to add an `auth.tokenChanges` listener in `AuthCubit` to refetch.
2. **Idempotency keys** for write callables — clients should generate a UUID per logical action and retry safely.
3. **POS printer failures** should not block the sale; queue the print job in a `printJobs` collection and surface failures in the UI.
4. **iOS bundle id** in the generated `GoogleService-Info.plist` is a placeholder; before shipping an iOS build, replace it with the value from Firebase Console.
5. **Courier APIs and online payments** are explicitly out of scope for V1 (per Prompt 01).

---

# Marketplace App AI Prompts

Copy-paste prompts for building the Flutter Android app, React PWA, Admin Web, and Firebase backend.

## Prompt order

1. `01-architecture-schema.md` — architecture and Firestore schema

1. `02-flutter-feature.md` — Flutter feature implementation

1. `03-react-pwa-feature.md` — User/Business PWA implementation

1. `04-cloud-functions-stock.md` — secure backend and stock transactions

1. `05-firestore-security-review.md` — security review

1. `06-qa-acceptance-testing.md` — QA and acceptance testing

1. `07-release-code-review.md` — pre-release code review

1. `ALL-PROMPTS.md` — all prompts in one file

## Recommended workflow

Run Prompt 1 first. Lock the architecture, schema, security matrix, and order transition map before implementation. Then use Prompts 2–4 feature by feature. Use Prompt 5 after every security-sensitive change. Use Prompt 6 before staging and Prompt 7 before release.

Replace placeholders such as `[FEATURE NAME]` and `[POS SALE or MARKETPLACE ORDER ACTION]` before submitting a prompt to an AI coding assistant.

## Important rules

Do not paste production credentials, OTPs, customer phone numbers, NRC/Passport data, or production database exports into an AI prompt. Review generated code manually. Test all stock, money, permission, and verification logic with Firebase Emulator Suite before deployment.

---

# Prompt 01 — Architecture and Firestore Schema

```
You are a senior software architect. Design V1 for a Myanmar shop-first marketplace plus business-management platform.

Platforms:
- Flutter Android app
- React + Vite + TypeScript user/business PWA
- React + Vite + TypeScript admin web
- Firebase Auth with phone OTP
- Cloud Firestore, Storage, Cloud Functions 2nd Gen, FCM, Analytics, App Check

Business rules:
- One user account can browse, buy, chat, review, and post individual listings.
- A verified shop unlocks Business Mode.
- POS and marketplace orders share one inventory source.
- Stock updates must use server-side Firestore transactions.
- COD order statuses are PENDING, CONFIRMED, PREPARING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, COMPLETED.
- Reviews are allowed only after COMPLETED and only once per transaction.
- Money is stored as integer Myanmar kyat amounts.

Produce:
1. Architecture diagram in Mermaid.
2. Firestore collections and field-level schema.
3. Query and index plan.
4. Security ownership matrix.
5. Cloud Function list.
6. Risks and decisions that must be approved before coding.

Do not invent online payments, courier APIs, staff roles, or multi-branch features. Mark every assumption explicitly.
```

# Prompt 02 — Flutter Feature Implementation

```
You are a senior Flutter engineer working in an existing feature-first Flutter repository.

Implement only the [FEATURE NAME] feature. Use Dart, Riverpod, go_router, immutable models, repository abstractions, and Firebase integrations already present in the project.

Requirements:
- Respect existing naming, theme, localization, and error-handling conventions.
- Do not place Firestore writes directly inside widgets.
- Do not trust client-supplied admin, verification, price, profit, or stock fields.
- Include loading, empty, error, retry, and success states.
- Support Burmese and English localized strings.
- Keep business calculations server-authoritative.

Before editing, inspect the relevant files and summarize the current architecture. Then provide:
1. A concise implementation plan.
2. The files to change.
3. The complete code changes.
4. Unit and widget tests.
5. Manual QA steps.
6. Any Firebase Rules or Cloud Function changes required.

Do not change unrelated features. If a requirement conflicts with existing architecture, stop and explain the conflict instead of silently rewriting the project.
```

# Prompt 03 — React PWA Feature Implementation

```
You are a senior React + TypeScript engineer. Implement [FEATURE NAME] in the existing marketplace/business PWA.

Use the project's existing router, query/data layer, design tokens, form validation, and Firebase repositories. Build responsive layouts for phone, tablet, and desktop. Include Burmese and English localization.

Feature constraints:
- Buyer marketplace and Business Mode are separate workspaces under one account.
- Web POS uses browser/system print or PDF fallback; direct Bluetooth printing is not required.
- Product, order, and shop ownership must be enforced by backend rules and functions.
- The client must never approve shops, calculate authoritative profit, or mutate protected order states directly.

Deliver:
- File-by-file change plan.
- Accessible UI implementation.
- Empty/loading/error states.
- Tests for validation and critical interactions.
- Analytics events with exact event names.
- Acceptance checklist.

Do not add new dependencies unless justified. Do not refactor unrelated files.
```

# Prompt 04 — Cloud Functions and Stock Transaction

```
You are a senior Firebase backend engineer. Implement a secure Cloud Functions 2nd Gen workflow for [POS SALE or MARKETPLACE ORDER ACTION].

Hard requirements:
- Validate authenticated user and shop ownership.
- Re-read authoritative product price, cost price, and stock inside a Firestore transaction.
- Reject insufficient stock atomically.
- Write an immutable inventory movement.
- Store item price and cost snapshots.
- Validate the allowed order-state transition.
- Prevent duplicate processing with an idempotency key.
- Calculate totals and profit on the server.
- Send FCM notifications only after a successful commit.
- Never accept admin, verified, total, profit, or stock values from the client without validation.

Produce production-quality TypeScript, unit tests, emulator test cases, required indexes, and a short threat model. Explain retry and concurrency behavior.
```

# Prompt 05 — Firestore Security Review

```
Act as an application-security reviewer. Review the attached Firestore Rules, Storage Rules, callable functions, and data model for a marketplace and POS system.

Check specifically:
- Private chat access is limited to participants.
- Sellers can access only their own shop and business data.
- Users cannot set admin or verified-shop fields.
- Users cannot bypass order status transitions.
- Product price, stock, profit, and inventory movements cannot be forged.
- Verification evidence is restricted.
- Reports and moderation actions are protected.
- App Check and authenticated access are used appropriately.

Return a table with severity, vulnerable path, attack scenario, exact fix, and test case. Do not merely provide general advice. If rules cannot safely enforce a transaction, identify the required Cloud Function.
```

# Prompt 06 — QA and Acceptance Testing

```
You are a QA lead for a Flutter Android app, React PWA, admin web, and Firebase backend.

Create a V1 test plan from these workflows:
1. Phone OTP signup.
2. Individual listing.
3. Shop creation and admin verification.
4. Product creation and stock adjustment.
5. Marketplace COD order through COMPLETED.
6. POS sale with discount and receipt printing.
7. Concurrent POS sale and marketplace order.
8. Chat, offer, report, and block.
9. Review after completed order.
10. Low-stock and order notifications.

For each test include preconditions, steps, expected result, negative case, and priority. Include Burmese localization, Android printer failure, responsive PWA, Firestore Rules, emulator, performance, and release smoke tests. Highlight release blockers.
```

# Prompt 07 — Release Code Review

```
You are the release reviewer for a Firebase-first marketplace and POS platform.

Review the supplied diff against the following non-negotiable rules:
- No insecure Firestore or Storage wildcard access.
- No client-authoritative stock, price, profit, admin, or verification state.
- No illegal order-state transitions.
- No duplicate review for one completed transaction.
- No private chat leakage.
- No money stored as floating point.
- POS and marketplace stock updates are atomic.
- Analytics events do not include sensitive personal data.
- Ads do not appear inside POS, checkout, critical order, or receipt flows.
- Burmese and English UI states are complete.

Return: release decision (ship, ship with conditions, or block), blocker list, exact file/line references, missing tests, and a prioritized remediation plan.
```