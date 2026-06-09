# Journey Junction

Journey Junction is a full-stack travel platform for discovering destinations, planning trips, managing bookings, and running a dynamic admin-controlled tourism experience.

The project combines a polished React frontend with a TypeScript Express backend, MongoDB Atlas, Stripe payments, Cloudinary uploads, OpenStreetMap, email notifications, and an admin panel for managing destinations, packages, transport, meals, bookings, reviews, and user activity.

## Project Highlights

- Dynamic destination discovery with state and destination detail pages
- Admin panel for destinations, hotels, activities, transport, meals, pickup locations, and bookings
- Secure authentication with email/password and role-based admin access
- Stripe Checkout integration for paid trip bookings
- MongoDB-backed user, booking, review, payment, wishlist, and destination data
- Cloudinary-powered media upload flow
- OpenStreetMap and Leaflet maps with no Google billing dependency
- Traveler dashboard with bookings, payment status, reviews, wishlist, and trip countdowns
- Real-time style notification experience for users and admins
- Premium responsive UI built for desktop, tablet, and mobile

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Shadcn UI
- React Query
- Framer Motion
- Leaflet / React Leaflet

### Backend

- Node.js
- Express.js
- TypeScript
- MongoDB Atlas
- Mongoose
- Stripe
- Cloudinary
- Nodemailer
- Socket.io
- Gemini API

## Main Features

### Traveler Experience

- Browse destinations across India
- View destination details, galleries, hotels, activities, weather, and reviews
- Select check-in/check-out dates and travelers
- Build a dynamic trip flow with pickup, transport, hotel, activities, meals, and payment
- Pay securely through Stripe Checkout
- Track bookings and payment status from the dashboard
- Submit public reviews with ratings and photos

### Admin Experience

- Create, edit, publish, and unpublish destinations
- Add unlimited destinations under each state
- Manage destination photos, descriptions, tags, climate, hotels, transport, meals, flights, and activities
- View users, reviews, inquiries, pickup requests, and bookings
- Assign drivers/staff and update booking statuses
- Track user activity and dashboard analytics

## Repository Structure

```text
artifacts/
  frontend/      React + Vite frontend
  backend/       Express + TypeScript backend
lib/
  db/            Mongoose models and database package
  api-zod/       API validation helpers
  api-client-react/
scripts/         Utility and seed scripts
tests/           E2E tests
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the backend:

```bash
cd artifacts/backend
pnpm run build
pnpm run start
```

Run the frontend:

```bash
cd artifacts/frontend
pnpm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Environment Variables

Copy `.env.example` to `.env` and fill in your local values.

Important values include:

```env
MONGODB_URI=
SESSION_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
STRIPE_SECRET_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
GEMINI_API_KEY=
FRONTEND_URL=
```

Never commit real `.env` secrets.

## Deployment

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Media: Cloudinary
- Payments: Stripe

### Vercel Frontend

- Root directory: `artifacts/frontend`
- Build command: `pnpm run build`
- Output directory: `dist/public`

### Render Backend

- Root directory: `artifacts/backend`
- Build command: `pnpm install && pnpm run build`
- Start command: `pnpm run start`

Set `NODE_ENV=production` and configure `FRONTEND_URL` with your Vercel domain.

## About The Creator

Built by Shivendra Tiwari as a modern travel-tech platform focused on making trip planning simpler, more personal, and more reliable for travelers.

## Project Vision

Journey Junction aims to become a trusted digital travel companion where users can discover destinations, plan complete trips, book securely, and manage their journey from one beautiful platform.
