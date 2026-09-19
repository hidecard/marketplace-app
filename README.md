# Marketplace + Business Management Platform

A comprehensive marketplace application with integrated business management tools for sellers.

## Project Structure

```
marketplace-app/
├── firebase/              # Firebase configuration, functions, and rules
│   ├── functions/         # Cloud Functions (backend logic)
│   ├── firestore.rules    # Firestore security rules
│   ├── firestore.indexes.json
│   └── storage.rules      # Firebase Storage security rules
├── web/                   # User + Business Web App (PWA)
├── admin/                 # Admin Web App
├── shared/                # Shared constants and utilities
└── package.json           # Root workspace configuration
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Functions, FCM, Analytics)
- **State Management**: Zustand
- **PWA**: vite-plugin-pwa with offline support

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # For web app
   cp .env.example web/.env
   # Edit web/.env with your Firebase config

   # For admin app
   cp .env.example admin/.env
   # Edit admin/.env with your Firebase config
   ```

4. Set up Firebase:
   ```bash
   cd firebase
   firebase login
   firebase use --add
   ```

### Development

```bash
# Start web app (port 3000)
npm run dev:web

# Start admin app (port 3001)
npm run dev:admin

# Start Firebase emulators
cd firebase
firebase emulators:start
```

### Build

```bash
# Build web app
npm run build:web

# Build admin app
npm run build:admin

# Build all
npm run build:all
```

### Deploy

```bash
# Deploy everything
npm run deploy:all

# Deploy specific parts
npm run deploy:web
npm run deploy:admin
npm run deploy:firebase
```

### Automatic Web Deployment

The production Web PWA is hosted at [marketplace-app.hidecard1500.workers.dev](https://marketplace-app.hidecard1500.workers.dev/). The workflow in `.github/workflows/deploy-cloudflare.yml` validates the Web app, admin app, Firebase Functions, unit tests, and Firebase Rules on every pull request and push. A successful push to `main` deploys the already-validated `web/dist` bundle to the existing `marketplace-app` Cloudflare Worker.

Add these repository secrets under **GitHub → Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — a scoped token with **Edit Cloudflare Workers** permission.
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account that owns the `marketplace-app` Worker.
- `FIREBASE_SERVICE_ACCOUNT` — a JSON service-account credential authorized to deploy Functions, Firestore indexes/rules, and Storage rules to `padaytharpin-app`.
- `VITE_FIREBASE_VAPID_KEY` — required for Web push notifications.
- `VITE_FIREBASE_APP_CHECK_KEY` — required before production App Check enforcement is enabled.

The public Firebase Web configuration is supplied to CI as non-secret build configuration. It can be overridden with repository variables named `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_MEASUREMENT_ID`. Set the repository variable `ENFORCE_APP_CHECK=true` only after valid App Check providers and both Web client keys have been configured and tested; it defaults to `false` to avoid locking out current clients during rollout.

## Features

### Marketplace (Buyer)
- Browse products by category
- Search with filters
- Product details and shop profiles
- Add to favorites
- COD checkout
- Order tracking
- P2P chat with sellers
- Reviews and ratings

### Business Mode (Seller)
- Dashboard with analytics
- Point of Sale (POS) system
- Product and inventory management
- Sales and profit tracking
- Expense management
- Customer management
- Receipt printing (Bluetooth on Android)

### Admin Panel
- Platform analytics dashboard
- User management
- Shop verification approvals
- Product moderation
- Order monitoring
- Report handling
- Banner management

## Security

- Firestore security rules enforce data access control
- Server-side validation for critical operations
- Role-based access control (user/admin)
- Protected routes on both web apps

## License

All Rights Reserved - Hein Ko Ko Aung (2026)
