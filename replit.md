# RDP Management Dashboard

## Overview

This is a full-stack RDP (Remote Desktop Protocol) management platform that allows users to provision and manage Windows VPS instances across multiple data centers (Moscow and Amsterdam). The application integrates with the OneDash API for VPS provisioning and provides a modern dashboard for both customers and administrators to manage their infrastructure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Components**: Shadcn/ui component library built on Radix UI primitives
- Extensive use of pre-built components (buttons, cards, dialogs, forms, etc.)
- Tailwind CSS for styling with custom design tokens
- Theme support (light/dark modes) via context provider
- Responsive design with mobile-first approach

**State Management**:
- TanStack Query (React Query) for server state management and caching
- React Context for authentication state and theme preferences
- Custom hooks for reusable logic (useAuth, useIsMobile, useToast)

**Routing**: Wouter (lightweight client-side routing)

**Design System**: 
- Typography: Inter for UI, JetBrains Mono for technical data
- Custom spacing primitives and component patterns
- Design inspired by Linear, Vercel Dashboard, and Railway
- Consistent color system with HSL values for light/dark mode support

**Key Pages**:
- Authentication (login/register)
- Customer Dashboard (stats overview, recent VPS)
- VPS Management (list, create, manage instances)
- Orders tracking
- Tariffs catalog
- Admin panel (users, orders, pricing, settings)

### Backend Architecture

**Framework**: Express.js with TypeScript

**API Design**: RESTful endpoints under `/api` prefix
- Session-based authentication using cookies
- Role-based access control (customer/admin roles)
- Middleware for authentication and authorization checks

**Server Structure**:
- `server/index.ts`: Main Express app setup with logging
- `server/routes.ts`: API route definitions and handlers
- `server/storage.ts`: Data access layer abstraction
- `server/onedash.ts`: Third-party API integration service
- `server/static.ts`: Static file serving for production
- `server/vite.ts`: Vite development server integration

**Build Process**:
- Development: Vite dev server with HMR for frontend, tsx for backend
- Production: ESBuild for server bundling, Vite for client build
- Selective bundling of server dependencies to optimize cold start times

### Data Storage

**Database**: PostgreSQL (via Neon serverless)

**ORM**: Drizzle ORM
- Type-safe database queries
- Schema-first approach with migrations
- Zod integration for runtime validation

**Schema Design**:
- `users`: User accounts with role and balance tracking
- `sessions`: Session management for authentication
- `orders`: Customer order records linked to OneDash orders
- `vps_instances`: Individual VPS instance details
- `pricing_rules`: Dynamic pricing configuration by admin

**Session Management**:
- Cookie-based sessions stored in database
- Token-based authentication with session user lookup
- Automatic cleanup and expiration handling

### External Dependencies

**OneDash API Integration**:
- Third-party VPS provisioning service
- RESTful API client for:
  - Balance checking
  - Tariff/system listings
  - Order creation and management
  - VPS instance operations (start, stop, reboot, reinstall)
- API key authentication via environment variables
- Error handling and response validation

**Authentication**:
- bcryptjs for password hashing
- Session-based auth (no JWT)
- Cookie parsing for session tokens
- Protected routes with middleware

**Email & Payments** (prepared but not fully implemented):
- Structure suggests future integration for:
  - Email notifications (nodemailer references in package.json)
  - Payment processing (Stripe references in build config)

**Development Tools**:
- Replit-specific plugins for development environment
- Runtime error overlay
- Hot module replacement
- Source maps for debugging

**Key Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `ONEDASH_API_KEY`: API key for VPS provider
- `NODE_ENV`: Environment mode (development/production)