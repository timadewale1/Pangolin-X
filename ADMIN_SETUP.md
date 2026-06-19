# Admin Backend Setup Guide for Pangolin

## Overview

A comprehensive admin dashboard has been created for the Pangolin platform. This system allows authorized administrators to:

- View platform statistics (total farmers, farmers by state, crops tracked, etc.)
- Manage farmers (view list, view details, delete)
- Seed the database with realistic dummy data
- Monitor farmer advisories and fragility data

## Features

### 1. **Admin Authentication**
- Login page at `/admin/login`
- Uses environment variables `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- No signup page for admin (security)
- Token-based authentication with secure httpOnly cookies
- Session duration: 24 hours

### 2. **Protected Routes**
- Middleware automatically redirects unauthorized users to login
- All admin routes require valid admin token cookie
- Automatic logout on token expiration

### 3. **Admin Dashboard**
- Location: `/admin/dashboard`
- Shows key statistics:
  - Total number of farmers
  - Number of states with farmers
  - Number of crops tracked
  - Average farmers per state
  - Top 5 states by farmer count
  - Top 5 crops by adoption
  - Complete state breakdown table

### 4. **Farmer Management**
- Location: `/admin/farmers`
- Features:
  - Paginated list of all farmers (20 per page)
  - Search by name or email
  - Filter by state
  - Filter by crop
  - View farmer details
  - Delete farmer (removes from auth and Firestore)

### 5. **Farmer Details Page**
- Location: `/admin/farmers/{farmerId}`
- Shows:
  - Complete farmer profile (name, email, phone, location, crops)
  - Recent advisories (text advisories)
  - Fragility advisories with severity levels
  - Delete option for complete farmer removal

### 6. **Database Seeding**
- Button on dashboard: "Seed 80 Farmers"
- Creates 80 realistic dummy farmers distributed across:
  - Niger (13-14 farmers)
  - Kano (13-14 farmers)
  - Delta (13-14 farmers)
  - FCT/Abuja (13-14 farmers)
  - Kogi (13-14 farmers)
  - Nasarawa (13-14 farmers)

## Environment Variables

Add these to your `.env` file:

```env
ADMIN_EMAIL=admin@pangolin.test
ADMIN_PASSWORD=YourSecurePassword123!
```

**Important:** Keep these credentials secure. In production, use strong, unique passwords.

## File Structure

```
app/
├── admin/
│   ├── login/
│   │   └── page.tsx              # Admin login page
│   ├── dashboard/
│   │   └── page.tsx              # Admin dashboard with stats
│   ├── farmers/
│   │   ├── page.tsx              # Farmers list & management
│   │   └── [id]/
│   │       └── page.tsx          # Farmer details page
│   ├── layout.tsx                # Admin layout with sidebar
│   └── page.tsx                  # Redirect to dashboard
└── api/
    └── admin/
        ├── auth/
        │   ├── route.ts          # Login endpoint
        │   └── logout/
        │       └── route.ts      # Logout endpoint
        ├── dashboard/
        │   └── stats/
        │       └── route.ts      # Get statistics
        ├── farmers/
        │   ├── route.ts          # Get farmers list
        │   ├── [id]/
        │   │   ├── route.ts      # Get farmer details
        │   │   └── delete/
        │   │       └── route.ts  # Delete farmer
        └── seed-farmers/
            └── route.ts          # Seed database endpoint

middleware.ts                      # Protect admin routes
```

## API Endpoints

### Authentication

**POST `/api/admin/auth`**
- Login with email and password
- Request: `{ email, password }`
- Response: `{ success, token, email }`
- Sets secure httpOnly cookie `admin_token`

**POST `/api/admin/auth/logout`**
- Logout and clear session
- Clears `admin_token` cookie

### Dashboard

**GET `/api/admin/dashboard/stats`**
- Get all statistics
- Requires: Valid admin token
- Returns: `{ stats: { totalFarmers, farmersByState, farmersByCrop, ... } }`

### Farmers

**GET `/api/admin/farmers`**
- Get paginated farmer list
- Query params:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `state` (optional: filter by state)
  - `crop` (optional: filter by crop)
- Requires: Valid admin token
- Returns: `{ farmers: [...], pagination: { page, limit, total, totalPages } }`

**GET `/api/admin/farmers/[id]`**
- Get farmer details with advisories
- Requires: Valid admin token
- Returns: `{ farmer, advisories, fragilityAdvisories }`

**POST `/api/admin/farmers/[id]/delete`**
- Delete farmer and all related data
- Deletes from Firebase Auth and Firestore
- Removes all advisories and fragility data
- Requires: Valid admin token

### Database Seeding

**POST `/api/admin/seed-farmers`**
- Seed database with 80 dummy farmers
- Requires: Valid admin token
- Returns: `{ stats: { totalGenerated, successful, failed, states, crops } }`

## Usage Instructions

### 1. **First Time Setup**

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`
2. Start the development server: `npm run dev`
3. Navigate to `http://localhost:3000/admin/login`
4. Enter your admin credentials

### 2. **View Dashboard**

1. After login, you're automatically redirected to dashboard
2. View platform statistics
3. Click "Seed 80 Farmers" to populate test data
4. Statistics update in real-time

### 3. **Manage Farmers**

1. Click "Farmers" in sidebar navigation
2. Browse all farmers in paginated table
3. Use filters and search to find specific farmers
4. Click eye icon to view farmer details
5. Click trash icon to delete farmer

### 4. **View Farmer Details**

1. Click eye icon on any farmer row
2. View complete profile and location
3. See all crops and their planting stages
4. View recent advisories and fragility reports
5. Delete farmer with confirmation

### 5. **Seed Test Data**

1. On dashboard, click "Seed 80 Farmers"
2. Confirm the seeding action
3. Wait for completion
4. Dashboard statistics update automatically
5. Test farmer login credentials:
   - Email: `farmer1@pangolin.test` to `farmer80@pangolin.test`
   - Password: `Dummy@123456`

## Dummy Data Details

Each seeded farmer includes:

- **Name**: Realistic Nigerian names (first + last name)
- **Email**: `farmerXX@pangolin.test` (numbered 1-80)
- **Phone**: Nigerian phone numbers (+234...)
- **Title**: Mr, Mrs, Ms, Dr, or Engr
- **State**: Distributed across 6 states
- **LGA**: Valid Local Government Area for their state
- **Crops**: 1-4 random crops from 16 available options
- **Crop Stages**: Random growth stages (Seedling to Maturity)
- **Planting Dates**: Random dates within past 180 days
- **Coordinates**: Realistic lat/lon for their state
- **Registration Date**: Random within past 365 days

### Available States (in seeded data):
- Niger
- Kano
- Delta
- FCT (Abuja)
- Kogi
- Nasarawa

### Available Crops:
- Maize, Rice, Cassava, Yam
- Cowpea, Groundnut, Soybean
- Millet, Sorghum
- Tomato, Pepper, Onion, Cabbage, Okra
- Sweet Potato, Sugarcane

## Security Considerations

1. **Credentials**: Never commit actual admin credentials to git
2. **Password**: Use strong, unique password in production
3. **HTTPS**: Only use in production with HTTPS
4. **Token Expiry**: Tokens expire after 24 hours (configurable)
5. **Cookie Security**: Tokens stored in httpOnly, Secure cookies only

## Troubleshooting

### Login Issues
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`
- Ensure Firestore Admin SDK is initialized
- Check browser console for errors

### Seeding Fails
- Verify `SERVICE_ACCOUNT_KEY` in `.env`
- Check Firestore quota limits
- Ensure Firebase project has Auth and Firestore enabled

### No Farmers Showing
- Click "Refresh" button on dashboard
- Verify farmers were created (check stats)
- Check Firestore directly for documents

### Delete Not Working
- Verify admin token is valid
- Check Firebase Auth permissions
- Ensure farmer exists in both Auth and Firestore

## Production Deployment

Before deploying to production:

1. **Change Credentials**: Use secure, strong passwords
2. **Environment Variables**: Set in production environment, not in git
3. **HTTPS**: Ensure all admin traffic uses HTTPS
4. **Backups**: Back up Firestore before running delete operations
5. **Rate Limiting**: Consider adding rate limiting to API endpoints
6. **Audit Logging**: Log all admin actions for security
7. **2FA**: Consider implementing 2FA for extra security

## Future Enhancements

Possible features to add:

- [ ] Edit farmer information
- [ ] Bulk operations (delete, export, etc.)
- [ ] Advanced analytics and charts
- [ ] Admin activity logging
- [ ] Two-factor authentication
- [ ] Role-based access control (multiple admin types)
- [ ] Export farmer data to CSV/Excel
- [ ] Bulk farmer upload/import
- [ ] Farmer messaging system
- [ ] Advisory management
