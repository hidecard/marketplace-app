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
   cp web/.env.example web/.env
   # Edit web/.env with your Firebase config

   # For admin app
   cp admin/.env.example admin/.env
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
