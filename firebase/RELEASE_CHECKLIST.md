# Release Checklist — Phase 10

## Pre-Deployment Security

- [ ] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] Storage rules deployed: `firebase deploy --only storage`
- [ ] App Check enabled in Firebase Console for:
  - [ ] Android (Play Integrity)
  - [ ] iOS (Device Check)
  - [ ] Web (reCAPTCHA v3)
- [ ] App Check debug tokens removed from production builds
- [ ] Firebase Emulator secret not present in client builds
- [ ] API keys restricted to Android/iOS/Web app fingerprints in Google Cloud Console
- [ ] All Cloud Functions deployed with `firebase deploy --only functions`
- [ ] Functions runtime set to Node.js 20+ (current: nodejs20)
- [ ] Service account keys rotated and not committed to repo

## Backend Validation

- [ ] All critical writes go through callable functions (no client direct writes):
  - [ ] Orders
  - [ ] POS sales
  - [ ] Stock adjustments / inventory movements
  - [ ] Offers
  - [ ] Reviews
  - [ ] Reports
  - [ ] Chat messages
- [ ] Idempotency keys enforced for:
  - [ ] Order creation
  - [ ] Order status transitions
  - [ ] Stock decrement
  - [ ] POS sales
  - [ ] Offer creation / response
  - [ ] Review creation
  - [ ] Report creation
- [ ] Server-side price/cost validation on order and POS creation
- [ ] Stock race conditions prevented by Firestore transactions

## QA & Edge Cases

- [ ] Duplicate order submission test: submit same idempotency key twice → returns same order
- [ ] Stock race condition test: two concurrent orders for last item → one succeeds, one fails with insufficient stock
- [ ] Order state machine test: invalid transitions (e.g., pending → shipped) rejected
- [ ] Buyer cancel test: only pending/confirmed orders can be cancelled by buyer
- [ ] Review restriction test: reviews only allowed for completed orders
- [ ] Offer restriction test: users cannot offer on own products
- [ ] Shop uniqueness test: one user cannot create multiple shops
- [ ] Slug uniqueness test: duplicate shop slugs rejected
- [ ] Verification request test: only one pending verification per shop

## Privacy Controls

- [ ] User profiles restricted to admin reads (email, phone hidden from other users)
- [ ] FCM tokens not exposed through Firestore rules
- [ ] Business financial data (expenses, COGS) restricted to shop members + admin
- [ ] Chat messages restricted to participants only
- [ ] Verification document URLs restricted to owner + admin

## Performance & Monitoring

- [ ] Firestore indexes deployed for common queries
- [ ] Cloud Function cold start times acceptable (< 5s for onCall)
- [ ] FCM delivery rates monitored
- [ ] Error reporting configured (Crashlytics / Sentry)
- [ ] Analytics events instrumented for key user flows

## Client Apps

- [ ] Flutter: App Check activated with Play Integrity / Device Check
- [ ] Web: App Check activated with reCAPTCHA v3
- [ ] Admin: App Check activated with reCAPTCHA v3
- [ ] All apps using callable functions instead of direct Firestore writes for sensitive data
- [ ] Offline persistence configured where appropriate

## Deployment

- [ ] Staging deployment tested end-to-end
- [ ] Production Firebase project configured
- [ ] Custom domains configured for web and admin
- [ ] SSL certificates valid
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

## Post-Deployment

- [ ] Monitor Firebase Console for errors and quota usage
- [ ] Verify App Check enforcement in production
- [ ] Check Firestore usage and costs
- [ ] Verify Functions cold start and latency
- [ ] Gather initial user feedback