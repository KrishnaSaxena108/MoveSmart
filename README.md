# MoveSmart

> A modern, full-featured logistics and shipment management platform connecting shippers and carriers with real-time tracking, intelligent bidding, and secure payments.

[![Status](https://img.shields.io/badge/Status-Active-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)]()
[![Next.js](https://img.shields.io/badge/Next.js-16.2-blue)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green)]()

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

---

## 🎯 Overview

**MoveSmart** is a comprehensive logistics platform that streamlines freight management, carrier coordination, and real-time shipment tracking. It provides an intuitive interface for shippers to post loads, receive competitive bids from carriers, and manage payments—all with real-time collaboration features.

### Who It's For

- **Shippers**: Post shipments, manage bids, track deliveries, and handle payments
- **Carriers**: View available loads, submit competitive bids, track shipments, and manage earnings
- **Admins**: Oversee user accounts, verify carriers, handle disputes, and monitor platform activity

---

## ✨ Key Features

### For Shippers
- 📦 **Create Shipments**: Intuitive wizard to post freight with pickup/delivery locations
- 🏆 **Bidding System**: Receive and review competitive bids from multiple carriers
- 💳 **Secure Payments**: Stripe integration for reliable payment processing
- 📍 **Real-Time Tracking**: Live shipment updates with map visualization
- 💬 **In-App Messaging**: Direct communication with carriers
- 📊 **Dashboard Analytics**: Track shipment history and spending insights
- ⭐ **Ratings & Reviews**: Build trust with verified carrier reviews

### For Carriers
- 📋 **Load Board**: Browse available shipments filtered by location and requirements
- 💰 **Smart Bidding**: Submit competitive bids and manage offers
- 📈 **Earnings Dashboard**: Track income and performance metrics
- 🎯 **Route Optimization**: Plan efficient delivery routes
- 💬 **Client Communication**: Direct messaging with shippers
- ✅ **Verification System**: Build credibility through platform verification
- 📱 **Mobile-Responsive UI**: Manage shipments on the go

### Platform Features
- 🔐 **Enterprise Authentication**: Secure login with NextAuth and optional OAuth
- 🌐 **Real-Time Collaboration**: Ably-powered live updates and messaging
- 🗺️ **Advanced Geocoding**: Address autocomplete and location services
- 📤 **File Management**: Secure document uploads via Cloudinary
- 🌙 **Dark Mode Support**: Seamless theme switching
- ♿ **Accessibility**: Built with Radix UI for WCAG compliance
- 📱 **Full Responsiveness**: Works flawlessly on desktop, tablet, and mobile

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) - React 19 with TypeScript
- **UI Components**: [Radix UI](https://www.radix-ui.com/) - Accessible, unstyled primitives
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation
- **Charts**: [Recharts](https://recharts.org/) - Composable chart library
- **Icons**: [Lucide React](https://lucide.dev/) - Beautiful icon set
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/) - Toast notifications
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes) - Dark mode support
- **Maps**: Integrated geocoding API for address autocomplete

### Backend & Infrastructure
- **Runtime**: [Node.js](https://nodejs.org/) 18+
- **Database**: [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) ODM
- **Authentication**: [NextAuth.js 4](https://next-auth.js.org/) - Credentials & OAuth support
- **Payments**: [Stripe API](https://stripe.com/) - Payment processing & webhooks
- **File Storage**: [Cloudinary](https://cloudinary.com/) - Image & document hosting
- **Real-Time**: [Ably](https://ably.com/) - Real-time messaging & collaboration
- **Email**: [Nodemailer](https://nodemailer.com/) - Email notifications

### Tooling
- **Package Manager**: [pnpm](https://pnpm.io/) - Fast, disk space efficient
- **TypeScript**: Static type checking
- **ESLint**: Code quality and consistency
- **PostCSS**: CSS transformation with Autoprefixer

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **pnpm**: v8 or higher (install with `npm install -g pnpm`)
- **MongoDB**: v5 or higher ([Docker](https://hub.docker.com/_/mongo) recommended for development)
- **Git**: For version control

### Optional Services (for full functionality)
- **Stripe Account**: For payment processing ([Sign up free](https://stripe.com))
- **MongoDB Atlas**: Cloud database ([Sign up free](https://www.mongodb.com/cloud/atlas))
- **Cloudinary Account**: For file uploads ([Sign up free](https://cloudinary.com/))
- **Ably Account**: For real-time features ([Sign up free](https://ably.com/))
- **Google OAuth**: For social login ([Create project](https://console.cloud.google.com/))

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/KrishnaSaxena108/MoveSmart.git
cd MoveSmart
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then configure the variables (see [Configuration](#configuration) section below).

### 4. Initialize MongoDB

**Option A: Local MongoDB**
```bash
# Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install locally: brew install mongodb-community
```

**Option B: MongoDB Atlas (Cloud)**
- Create a cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Get your connection string and add it to `.env.local`

### 5. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create Test Account

Use the test credentials to register and log in:

```
Email: test@example.com
Password: TestPassword123!
```

---

## ⚙️ Configuration

### Essential Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/movesmart
# or for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/movesmart

# Authentication
AUTH_SECRET=your-random-secret-key-here
# Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Optional: Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Payments (Stripe)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# File Uploads (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Real-Time (Ably)
ABLY_API_KEY=your-ably-api-key

# Gmail (for email notifications - optional)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### Configuration Steps

1. **Auth Secret**: Generate with `openssl rand -base64 32`
2. **Stripe**: Get keys from [Stripe Dashboard](https://dashboard.stripe.com/)
3. **Cloudinary**: Get credentials from [Cloudinary Dashboard](https://cloudinary.com/console/)
4. **Ably**: Get API key from [Ably Dashboard](https://ably.com/login)
5. **Google OAuth**: Create credentials in [Google Console](https://console.cloud.google.com/)

---

## 📁 Project Structure

```
MoveSmart/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes & endpoints
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── shipments/            # Shipment management APIs
│   │   ├── geocode/              # Address autocomplete
│   │   ├── uploads/              # File upload handling
│   │   ├── ably/                 # Real-time messaging auth
│   │   ├── webhooks/             # External service webhooks
│   │   └── ...
│   ├── (dashboard)/              # Authenticated routes group
│   │   ├── dashboard/            # Main dashboard page
│   │   ├── admin/                # Admin panel routes
│   │   └── layout.tsx            # Dashboard layout
│   ├── auth/                     # Auth pages
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── pricing/                  # Public pages
│   ├── about/
│   ├── help/
│   └── page.tsx                  # Home page
│
├── components/                   # Reusable React components
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── admin-dashboard.tsx
│   │   ├── carrier-dashboard.tsx
│   │   └── shipper-dashboard.tsx
│   ├── shipments/                # Shipment features
│   │   ├── create-shipment-wizard.tsx
│   │   └── shipment-detail.tsx
│   ├── bids/                     # Bidding system
│   │   ├── bid-form.tsx
│   │   └── bids-list.tsx
│   ├── admin/                    # Admin components
│   │   ├── users-table.tsx
│   │   ├── disputes-page.tsx
│   │   └── verifications-list.tsx
│   ├── load-board/               # Carrier load board
│   ├── maps/                     # Mapping & location
│   ├── messages/                 # Chat & messaging
│   ├── payments/                 # Payment UI
│   ├── tracking/                 # Shipment tracking
│   ├── ui/                       # Base UI components
│   │   └── (60+ Radix UI components)
│   └── layout/                   # Layout components
│
├── lib/                          # Utility functions & services
│   ├── auth.ts                   # Authentication utilities
│   ├── utils.ts                  # General utilities
│   ├── db/                       # Database utilities
│   ├── stripe/                   # Stripe integration
│   ├── cloudinary/               # Cloudinary integration
│   ├── maps/                     # Mapping/geocoding utilities
│   ├── ably/                     # Real-time messaging
│   └── actions/                  # Server actions
│
├── hooks/                        # Custom React hooks
│   ├── use-toast.ts
│   └── use-mobile.ts
│
├── public/                       # Static assets
├── styles/                       # Global styles
│
├── package.json                  # Project dependencies
├── next.config.mjs               # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS config
└── postcss.config.mjs            # PostCSS configuration
```

---

## 🔌 API Documentation

### Public Endpoints

#### Geocoding API
```http
GET /api/geocode?q={query}
```

**Query Parameters:**
- `q` (required): Address or location search query

**Response:**
```json
{
  "suggestions": [
    {
      "placeId": "string",
      "description": "string",
      "mainText": "string",
      "secondaryText": "string"
    }
  ]
}
```

#### Stripe Webhook
```http
POST /api/webhooks/stripe
```

Handles payment events. Requires `Stripe-Signature` header verification.

### Protected Endpoints (Requires Authentication)

#### Create Shipment
```http
POST /api/shipments
Content-Type: application/json

{
  "pickupLocation": { "lat": 0, "lng": 0, "address": "string" },
  "deliveryLocation": { "lat": 0, "lng": 0, "address": "string" },
  "weight": { "value": 0, "unit": "kg|lbs" },
  "dimensions": { "length": 0, "width": 0, "height": 0, "unit": "cm|in" },
  "description": "string",
  "specialRequirements": "string",
  "estimatedPickupDate": "2026-04-23T00:00:00Z",
  "estimatedDeliveryDate": "2026-04-24T00:00:00Z",
  "requiredInsurance": false
}
```

#### Get Shipments
```http
GET /api/shipments?status={status}&limit={limit}&page={page}
```

**Query Parameters:**
- `status`: `pending|accepted|in-transit|delivered|completed|cancelled`
- `limit`: Results per page (default: 20)
- `page`: Page number (default: 1)

#### Get Active Bids
```http
GET /api/shipments/{shipmentId}/bids
```

#### Submit Bid
```http
POST /api/shipments/{shipmentId}/bids
Content-Type: application/json

{
  "bidAmount": 0,
  "estimatedDeliveryTime": "2026-04-24T00:00:00Z",
  "notes": "string"
}
```

### Real-Time Features

#### Ably Token Auth
```http
GET /api/ably/auth
```

Returns authentication token for Ably real-time channels. Used internally by the client.

---

## 🔐 Authentication

### Supported Methods

1. **Credentials-Based**
   - Username/Email and password authentication
   - Password reset via email

2. **OAuth (Google)**
   - Requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
   - One-click sign-in

### Session Management

- Sessions stored in MongoDB via NextAuth adapter
- JWT-based token system
- Automatic session refresh
- CSRF protection enabled

### User Roles

- **Shipper**: Can create shipments and manage bids (role: `shipper`)
- **Carrier**: Can view loads and submit bids (role: `carrier`)
- **Admin**: Full platform access (role: `admin`)

### Protected Routes

Use the `useSession()` hook to check authentication:

```typescript
import { useSession } from 'next-auth/react';

export default function ProtectedComponent() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Access Denied</div>;

  return <div>Welcome, {session.user?.email}</div>;
}
```

---

## 💻 Development

### Available Scripts

```bash
# Start development server (next dev)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run ESLint
pnpm lint

# Run tests (when configured)
pnpm test
```

### Code Style & Standards

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Configuration in `.eslintrc.json`
- **Formatting**: Consistent indentation (2 spaces)
- **Component Pattern**: Functional components with hooks

### Key Conventions

```typescript
// Component naming: PascalCase for components
export function MyComponent() { }

// Hooks: camelCase with 'use' prefix
export function useCustomHook() { }

// Utils: camelCase for functions
export function formatAddress(address: string) { }

// API routes: lowercase with hyphens
// /api/my-endpoint
```

### Database Schemas

Models are defined using Mongoose in `lib/db/`:

```typescript
// Example Schema Structure
import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema({
  shipperId: ObjectId,
  pickupLocation: {
    coordinates: [Number], // [lng, lat]
    address: String
  },
  deliveryLocation: {
    coordinates: [Number],
    address: String
  },
  weight: { value: Number, unit: String },
  status: String,
  createdAt: Date,
  updatedAt: Date
});
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Push to GitHub and connect to Vercel
# https://vercel.com/new

# Or deploy directly with Vercel CLI
vercel deploy
```

### Environment Variables on Vercel

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Ensure `NEXTAUTH_URL` points to your production domain

### Other Platforms

**Docker Deployment:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

**MongoDB Atlas:**
- Create a cluster at atlas.mongodb.com
- Get connection string with IP allowlist
- Add to `MONGODB_URI`

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Setup for Contributors

```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR-USERNAME/MoveSmart.git
cd MoveSmart
pnpm install
```

### Creating a Pull Request

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Write/update tests if applicable
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request with a clear description

### Commit Message Standards

```
feat: Add new feature
fix: Fix bug description
docs: Update documentation
refactor: Refactor code structure
test: Add test cases
chore: Update dependencies
```

### Code Review Process

- All PRs require review from maintainers
- Tests must pass and coverage maintained
- Follow existing code style and patterns
- Update documentation as needed

---

## 📱 Testing

### Manual Testing

Test credentials for development:

```
Email: test@example.com
Password: TestPassword123!
Role: shipper
```

### API Testing

Use the included test files:
- `test-auth-flow.js` - Authentication flow testing
- `test-endpoints.js` - API endpoint testing
- `test-detailed.js` - Detailed endpoint testing
- `test-postman.json` - Postman collection for manual testing

### Running Tests

```bash
# Use included test files
node test-endpoints.js

# Or with Postman
# Import test-postman.json into Postman
```

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue: MongoDB Connection Failed**
```
Solution: Ensure MongoDB is running and MONGODB_URI is correct
- Local: mongodb://localhost:27017/movesmart
- Atlas: Check IP whitelist and connection string
```

**Issue: Stripe Integration Not Working**
```
Solution: Verify STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
- Get from Stripe Dashboard
- Ensure webhook endpoint is publicly accessible
```

**Issue: Authentication Fails**
```
Solution: Check AUTH_SECRET is set
- Generate: openssl rand -base64 32
- Update .env.local and restart dev server
```

**Issue: Real-Time Features Not Working**
```
Solution: Set ABLY_API_KEY
- Create account at ably.com
- Get API key from dashboard
- Create Ably app/namespace
```

### Getting Help

- 📖 Check [API_TEST_REPORT.md](./API_TEST_REPORT.md) for endpoint status
- 💭 Review test files: `test-*.js`
- 🐛 Check browser console and server logs
- 📧 Contact maintainers for additional support

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 👥 Acknowledgments

Built with modern, industry-standard technologies:

- **Vercel's Next.js Team** - Framework & deployment platform
- **Radix UI** - Accessible component primitives
- **Tailwind Labs** - Utility-first CSS framework
- **MongoDB** - Document database
- **Stripe** - Payment processing
- **Ably** - Real-time infrastructure

---

## 📞 Contact & Links

- **GitHub**: [KrishnaSaxena108/MoveSmart](https://github.com/KrishnaSaxena108/MoveSmart)
- **Documentation**: See [API_TEST_REPORT.md](./API_TEST_REPORT.md)
- **Live Demo**: [movesmart.vercel.app](https://movesmart.vercel.app) (when deployed)

---

## 🗺️ Project Roadmap

### Planned Features

- [ ] Advanced analytics & reporting
- [ ] Machine learning-based rate predictions
- [ ] Mobile native applications (iOS/Android)
- [ ] Multi-language support (i18n)
- [ ] Enhanced dispute resolution system
- [ ] Integration with major TMS platforms
- [ ] Carbon footprint tracking
- [ ] Insurance provider partnerships

---

**Last Updated:** April 23, 2026

Made with ❤️ by the MoveSmart Team
