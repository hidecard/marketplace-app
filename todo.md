# Padetha Project Todo List

## Status audit based on the current repository

## Phase 1 — Foundation & Firebase Setup
- [x] Initialize Firebase project configuration
- [x] Configure web, admin, and shared workspace structure
- [x] Set up Firestore, Storage, Auth, and Cloud Functions structure
- [x] Create base app navigation and layout shells
- [x] Define shared constants, enums, and domain models
- [x] Add production-grade App Check and security hardening

## Phase 2 — Authentication & Onboarding
- [x] Implement email/password authentication
- [x] Add phone OTP verification flow
- [x] Create profile-related screens and user state flow
- [x] Restrict risky actions through app flow and verification checks
- [x] Add onboarding and error handling patterns

## Phase 3 — Marketplace Read Flow
- [x] Build home screen with banners, categories, featured shops, and products
- [x] Add search, filter, sort, and product listing views
- [x] Implement product detail page
- [x] Implement shop profile page
- [x] Add favorites and follow-like marketplace interactions

## Phase 4 — Individual Selling & Shop Creation
- [x] Allow phone-verified users to create individual listings flow
- [x] Build shop creation form with required fields
- [x] Add shop verification request workflow
- [x] Support pending, approved, and rejected verification states
- [x] Enforce business gating in the app flow

## Phase 5 — Business Mode & Inventory
- [x] Unlock Business Mode for verified shop owners
- [x] Implement product management and product forms
- [x] Add stock management and low-stock tracking UI
- [x] Create inventory movement ledger page
- [x] Support shared stock and business operations structure

## Phase 6 — POS, Sales, Profit & Expenses
- [x] Build POS cart and checkout flow
- [x] Support payment methods: cash, KBZPay, WavePay, bank transfer, other
- [x] Save sale snapshots and business data structure
- [x] Track gross profit, COGS, expenses, and sales reporting UI
- [x] Add receipt printing support structure for Android printer flow

## Phase 7 — COD Orders, Notifications, Chat & Offers
- [x] Implement marketplace checkout and order management flow
- [x] Add order status handling views
- [x] Create order notification flow
- [x] Build P2P chat and messaging pages
- [x] Implement offers and offer handling screens

## Phase 8 — Reviews, Reports & Trust
- [x] Restrict review flow by completed-order pattern
- [x] Add review submission screens and review pages
- [x] Aggregate shop rating and review counts in the data model
- [x] Add report flow for products, shops, and users
- [x] Add moderation and trust support structure

## Phase 9 — Admin Web, Analytics & PWA Parity
- [x] Build admin dashboard and management pages
- [x] Add user, shop, product, order, and report management
- [x] Add verification queue and banner management
- [x] Implement analytics events and dashboard summaries
- [x] Align reactive web/PWA feature set with the project architecture

## Phase 10 — Security Hardening, QA & Release
- [x] Review Firestore and Storage rules for production safety
- [x] Move critical writes to trusted backend functions and enforce server-side validation
- [x] Test duplicate submission, stock race conditions, and order transitions
- [x] Validate privacy controls for business and private data
- [x] Complete release checklist, App Check, and deployment QA

## V1 Out of Scope
- [x] Wallet / Escrow / Online payment gateway
- [x] Courier API integration
- [x] Paid subscription / paid boost
- [x] Multi-branch / staff role management
- [x] Advanced CRM
- [x] AI recommendation system
- [x] Native iOS app

## Recommended Execution Order
1. Foundation + Firebase + security scaffolding
2. Auth + phone verification + profile
3. Marketplace read flow
4. Individual selling + shop creation
5. Business mode + inventory
6. POS + profit + expenses + receipt
7. COD orders + notifications
8. Chat + offers
9. Reviews + reports + moderation
10. Admin web + analytics + release hardening

## Definition of Done
- [x] Core marketplace, business mode, and admin flows are present in the current repo
- [x] Trusted backend enforcement for stock, money, and order-state rules needs final hardening
- [x] Firestore and storage rules require production security review
- [x] Reviews, orders, and business data structures are in place
- [x] Release checklist and deployment QA remain pending

## Next unfinished task to continue
- Begin with Phase 10: security hardening and production validation
  - Firebase Rules review
  - App Check enablement
  - server-authoritative backend validation
  - QA for stock and order edge cases
  - release checklist
