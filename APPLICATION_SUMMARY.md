# Port Kiosk Information System - Application Summary

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Key Features](#key-features)
6. [Implementation Details](#implementation-details)
7. [API Endpoints](#api-endpoints)
8. [Component Structure](#component-structure)
9. [Data Flow](#data-flow)
10. [Configuration](#configuration)
11. [Future Modifications Guide](#future-modifications-guide)

---

## Overview

**Port Kiosk Information System** is a Next.js-based digital signage application designed for port terminals to display boat trip schedules and media content. The system consists of two main interfaces:

1. **Admin Dashboard** (`/admin`) - Management interface for schedules, media, and system settings
2. **Kiosk Display** (`/kiosk`) - Public-facing display showing real-time schedules and video content

The application uses PostgreSQL for data persistence and implements real-time status calculations for boat departures based on configurable boarding and last-call times.

---

## Architecture

### Application Structure
```
Port-kiosk-Info/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin dashboard pages
│   ├── api/                # API routes (REST endpoints)
│   ├── kiosk/              # Kiosk display pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (redirects to /admin)
├── components/             # React components
│   ├── admin/              # Admin-specific components
│   ├── kiosk/              # Kiosk-specific components
│   └── shared/             # Shared components
├── lib/                    # Utility functions and database
│   ├── db.ts               # PostgreSQL connection pool
│   ├── utils.ts            # Time formatting, status calculation
│   └── video-utils.ts      # YouTube URL conversion utilities
├── types/                  # TypeScript type definitions
├── scripts/                # Database migration scripts
└── [config files]          # Next.js, TypeScript, Tailwind configs
```

### Design Patterns
- **Server Components & Client Components**: Uses Next.js App Router with `'use client'` directives for interactive components
- **RESTful API**: All data operations go through API routes
- **Polling-based Updates**: Kiosk polls API every 30 seconds for data, 1.5 seconds for video control
- **Database Connection Pooling**: Uses `pg.Pool` for efficient database connections

---

## Technology Stack

### Core Framework
- **Next.js 14.0.4** - React framework with App Router
- **React 18.2.0** - UI library
- **TypeScript 5.3.3** - Type safety

### Database
- **PostgreSQL** - Relational database
- **pg (8.11.3)** - PostgreSQL client for Node.js

### Authentication & Security
- **next-auth 4.24.5** - Authentication framework (configured but not fully implemented)
- **bcryptjs 2.4.3** - Password hashing

### Styling
- **Tailwind CSS 3.4.0** - Utility-first CSS framework
- **Glassmorphism Design** - Modern UI with backdrop blur effects
- **Font Awesome 6.4.0** - Icon library (via CDN)

### Utilities
- **date-fns 2.30.0** - Date manipulation (available but not heavily used)
- **zod 3.22.4** - Schema validation (available but not implemented)
- **clsx 2.0.0** - Conditional class names

---

## Database Schema

### Tables

#### `users`
- **Purpose**: User authentication and authorization
- **Fields**:
  - `id` (SERIAL PRIMARY KEY)
  - `username` (VARCHAR(255) UNIQUE NOT NULL)
  - `password_hash` (VARCHAR(255) NOT NULL)
  - `role` (VARCHAR(50) DEFAULT 'port') - 'admin' or 'port'
  - `permissions` (TEXT[]) - Array of permissions: 'schedules', 'media', 'settings'
  - `last_login` (TIMESTAMP)
  - `created_at`, `updated_at` (TIMESTAMP)

#### `schedules`
- **Purpose**: Boat trip schedules
- **Fields**:
  - `id` (SERIAL PRIMARY KEY)
  - `days` (TEXT[]) - Array of weekdays (e.g., ['Monday', 'Wednesday'])
  - `departure_time` (TIME NOT NULL) - 24-hour format (e.g., '08:00')
  - `arrival_time` (TIME NOT NULL)
  - `time_display` (VARCHAR(50) NOT NULL) - Formatted display (e.g., '08:00 AM - 10:00 AM')
  - `vessel` (VARCHAR(255) NOT NULL)
  - `destination` (VARCHAR(255) NOT NULL)
  - `status` (VARCHAR(50) DEFAULT 'Ontime') - 'Ontime', 'Boarding', 'Last Called', 'Departed', 'Delayed', 'Cancelled'
  - `created_at`, `updated_at` (TIMESTAMP)
- **Indexes**: GIN index on `days` array for efficient filtering

#### `media_playlist`
- **Purpose**: Video/media content for kiosk display
- **Fields**:
  - `id` (SERIAL PRIMARY KEY)
  - `title` (VARCHAR(255) NOT NULL)
  - `source` (TEXT NOT NULL) - URL to video (YouTube or direct file)
  - `type` (VARCHAR(50) DEFAULT 'url') - 'url' or 'file'
  - `order_index` (INTEGER DEFAULT 0) - Playback order
  - `created_at`, `updated_at` (TIMESTAMP)
- **Indexes**: Index on `order_index` for sorting

#### `system_settings`
- **Purpose**: System-wide configuration
- **Fields**:
  - `id` (SERIAL PRIMARY KEY)
  - `setting_key` (VARCHAR(255) UNIQUE NOT NULL)
  - `setting_value` (TEXT)
  - `updated_at` (TIMESTAMP)
- **Default Settings**:
  - `system_name`: 'Socorro Feeder Port'
  - `logo`: '' (empty string)
  - `boarding_time`: '30' (minutes before departure)
  - `last_call_time`: '5' (minutes after departure)
  - `fade_interval`: '5' (seconds for schedule transitions)
  - `theme`: 'windows-glass'

#### `video_control`
- **Purpose**: Remote control state for video playback on kiosks
- **Fields**:
  - `id` (SERIAL PRIMARY KEY)
  - `kiosk_id` (VARCHAR(255) DEFAULT 'default' UNIQUE)
  - `current_video_index` (INTEGER DEFAULT 0)
  - `is_playing` (BOOLEAN DEFAULT true)
  - `is_looping` (BOOLEAN DEFAULT false)
  - `volume` (INTEGER DEFAULT 80) - 0-100
  - `last_updated` (TIMESTAMP)
- **Note**: Supports multi-kiosk (one record per kiosk_id)

---

## Key Features

### 1. Schedule Management
- **Create/Edit/Delete** boat trip schedules
- **Multi-day Support**: Each schedule can run on multiple days of the week
- **Real-time Status Calculation**: Automatically updates status based on:
  - Current time vs. departure time
  - Configurable boarding time (default: 30 minutes)
  - Configurable last call time (default: 5 minutes)
- **Status States**: Ontime → Boarding → Last Called → Departed

### 2. Media Playlist Management
- **Add/Delete** media items (YouTube URLs or direct video files)
- **Playback Order**: Automatic ordering via `order_index`
- **YouTube Support**: Converts YouTube URLs to embed format
- **Direct Video Support**: MP4, WebM, OGG, MOV, AVI, MKV

### 3. Video Player
- **Remote Control**: Admin can control playback from dashboard
- **Synchronized Playback**: Video control state synced across kiosks
- **Auto-advance**: Automatically plays next video when current ends
- **Error Handling**: Skips to next video on playback errors
- **Volume Control**: 0-100 volume levels
- **Loop Support**: Can loop individual videos or entire playlist

### 4. Kiosk Display
- **Schedule Slideshow**: Rotates through today's schedules every 5 seconds
- **Real-time Clock**: Updates every second
- **Status Badges**: Color-coded status indicators
- **Upcoming Trips**: Shows next 3 scheduled trips
- **Weather Display**: Static weather information (hardcoded, not connected to API)
- **Fullscreen Support**: Auto-requests fullscreen on load

### 5. System Settings
- **Customizable Branding**: System name and logo
- **Timing Configuration**: Boarding time, last call time, fade interval
- **Theme Selection**: Windows glass, dark mode, light mode (theme not fully implemented)

---

## Implementation Details

### Time Formatting
- **Storage**: Times stored in 24-hour format (HH:MM) in database
- **Display**: Converted to 12-hour format (HH:MM AM/PM) for UI
- **Functions**: 
  - `formatTime24to12()` - Converts 24h to 12h
  - `formatTime12to24()` - Converts 12h to 24h
  - `getTimeDifferenceInMinutes()` - Calculates minutes until departure

### Status Calculation Logic
Located in `lib/utils.ts` - `calculateScheduleStatus()`:

```typescript
// Status transitions:
// - diffMinutes <= 0 && > -lastCallTime: "Last Called"
// - diffMinutes > 0 && <= boardingTime: "Boarding"
// - diffMinutes <= -lastCallTime: "Departed"
// - Otherwise: Uses schedule.status from database
```

### Video URL Processing
Located in `lib/video-utils.ts`:
- **YouTube Detection**: Regex patterns for various YouTube URL formats
- **Embed Conversion**: Converts watch URLs to embed format
- **Loop Support**: Adds playlist parameter for YouTube looping
- **Direct Video Detection**: File extension matching

### Database Connection
- **Connection Pool**: Uses `pg.Pool` for connection management
- **Environment Variable**: `DATABASE_URL` required
- **SSL Support**: Enabled in production, disabled in development
- **Error Handling**: Logs connection errors and exits on idle client errors

### Polling Strategy
- **Full Data Poll**: Every 30 seconds (schedules, media, settings)
- **Video Control Poll**: Every 1.5 seconds (for responsive remote control)
- **Timestamp Comparison**: Only updates if `last_updated` timestamp is newer

---

## API Endpoints

### Schedules API (`/api/schedules`)

#### `GET /api/schedules`
- **Purpose**: Retrieve all schedules
- **Response**: `{ schedules: Schedule[] }`
- **Ordering**: By `departure_time`, then `created_at DESC`

#### `POST /api/schedules`
- **Purpose**: Create new schedule
- **Body**: `CreateScheduleInput`
  ```typescript
  {
    days: string[];
    departureTime: string;  // 24h format
    arrivalTime: string;    // 24h format
    vessel: string;
    destination: string;
    status: ScheduleStatus;
  }
  ```
- **Response**: `{ schedule: Schedule }` (201)

#### `PUT /api/schedules`
- **Purpose**: Update existing schedule
- **Body**: `UpdateScheduleInput` (all fields optional except `id`)
- **Response**: `{ schedule: Schedule }`

#### `DELETE /api/schedules?id={id}`
- **Purpose**: Delete schedule
- **Response**: `{ message: string }`

### Media API (`/api/media`)

#### `GET /api/media`
- **Purpose**: Retrieve all media items
- **Response**: `{ media: MediaItem[] }`
- **Ordering**: By `order_index`, then `created_at ASC`

#### `POST /api/media`
- **Purpose**: Add media item
- **Body**: `CreateMediaInput`
  ```typescript
  {
    title: string;
    source: string;  // URL
    type: 'url' | 'file';
  }
  ```
- **Response**: `{ media: MediaItem }` (201)
- **Note**: Automatically assigns `order_index` (max + 1)

#### `DELETE /api/media?id={id}`
- **Purpose**: Delete media item
- **Response**: `{ message: string }`

### Kiosk API (`/api/kiosk`)

#### `GET /api/kiosk?kioskId={id}`
- **Purpose**: Get all data for kiosk display
- **Response**: 
  ```typescript
  {
    schedules: Schedule[];      // Filtered for today
    media: MediaItem[];
    videoControl: VideoControl | null;
    settings: Record<string, string>;
  }
  ```
- **Schedule Filtering**: Only returns schedules where today's day is in `days` array
- **Status Calculation**: Calculates real-time status for each schedule

#### `PUT /api/kiosk`
- **Purpose**: Update video control state
- **Body**:
  ```typescript
  {
    kioskId?: string;           // Default: 'default'
    currentVideoIndex?: number;
    isPlaying?: boolean;
    isLooping?: boolean;
    volume?: number;            // 0-100
  }
  ```
- **Response**: `{ videoControl: VideoControl }`
- **Note**: Uses `ON CONFLICT` to upsert based on `kiosk_id`

### Settings API (`/api/settings`)

#### `GET /api/settings`
- **Purpose**: Get all system settings
- **Response**: `{ settings: Partial<SystemSettings> }`
- **Note**: Numeric values are parsed (boardingTime, lastCallTime, fadeInterval)

#### `PUT /api/settings`
- **Purpose**: Update system settings
- **Body**: `Partial<SystemSettings>`
- **Response**: `{ message: string }`
- **Note**: Uses `ON CONFLICT` to upsert based on `setting_key`

---

## Component Structure

### Admin Components (`components/admin/`)

#### `ScheduleForm.tsx`
- **Purpose**: Form for creating/editing schedules
- **Features**:
  - Day selection (checkboxes)
  - Time inputs (24h format)
  - Vessel and destination inputs
  - Status dropdown
  - Edit mode support

#### `ScheduleTable.tsx`
- **Purpose**: Display and manage schedules
- **Features**: Edit, delete actions

#### `MediaPlaylist.tsx`
- **Purpose**: Manage media playlist
- **Features**: Add media, delete media, reorder (if implemented)

#### `SystemSettingsPanel.tsx`
- **Purpose**: Configure system settings
- **Features**: Update branding, timing, theme

### Kiosk Components (`components/kiosk/`)

#### `ScheduleSlideshow.tsx`
- **Purpose**: Display schedules in rotating slideshow
- **Features**:
  - 5-second rotation with fade transitions
  - Real-time clock
  - Status badges
  - Upcoming trips list
  - Weather display (static)
  - Slide indicators

#### `VideoPlayer.tsx`
- **Purpose**: Play media content
- **Features**:
  - YouTube iframe support
  - Direct video file support
  - Remote control synchronization
  - Auto-advance on end
  - Error handling
  - Volume control

#### `KioskFooter.tsx`
- **Purpose**: Footer information for kiosk

#### `KioskHeader.tsx`
- **Purpose**: Header information for kiosk

#### `ScheduleGrid.tsx`
- **Purpose**: Grid layout for schedules (if used)

### Shared Components (`components/shared/`)

#### `StatusBadge.tsx`
- **Purpose**: Color-coded status indicator
- **Status Colors**: Based on status type (Ontime, Boarding, Last Called, etc.)

---

## Data Flow

### Admin Dashboard Flow
1. **Page Load** (`app/admin/page.tsx`):
   - Fetches schedules, media, settings via `Promise.all()`
   - Sets up tab navigation (schedules/media/settings)
   - Displays notification system

2. **Schedule Management**:
   - User fills `ScheduleForm` → POST/PUT `/api/schedules`
   - API creates/updates in database
   - `ScheduleTable` refreshes via `fetchData()`

3. **Media Management**:
   - User adds media via `MediaPlaylist` → POST `/api/media`
   - API inserts with auto-incremented `order_index`
   - Playlist refreshes

4. **Settings Update**:
   - User updates settings → PUT `/api/settings`
   - Settings stored as key-value pairs
   - Kiosk picks up changes on next poll

### Kiosk Display Flow
1. **Initial Load** (`app/kiosk/page.tsx`):
   - Requests fullscreen
   - Fetches data from `/api/kiosk`
   - Renders `ScheduleSlideshow` and `VideoPlayer`

2. **Polling**:
   - **Full Poll** (30s): Fetches schedules, media, settings
   - **Video Control Poll** (1.5s): Checks for remote control updates
   - Only updates if timestamp is newer

3. **Schedule Display**:
   - Filters schedules for today's day
   - Calculates real-time status
   - Rotates through schedules every 5 seconds
   - Shows upcoming trips

4. **Video Playback**:
   - `VideoPlayer` receives `videoControl` prop
   - Updates current video index, play/pause, volume
   - Handles YouTube vs. direct video
   - Auto-advances on end (if not looping)

---

## Configuration

### Environment Variables
Required in `.env.local`:
```env
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NODE_ENV=development
```

### Database Setup
1. Create PostgreSQL database
2. Run migrations: `npm run db:migrate`
3. Default admin user: `admin` / `admin123` (hashed)

### Next.js Configuration
- **TypeScript**: Strict mode enabled
- **Path Aliases**: `@/*` maps to project root
- **React Strict Mode**: Enabled

### Tailwind Configuration
- Custom glassmorphism classes in `globals.css`
- Font Awesome icons via CDN

---

## Future Modifications Guide

### Adding New Features

#### 1. User Authentication
**Current State**: NextAuth configured but not implemented
**To Implement**:
- Add authentication middleware to `/app/admin`
- Create login page
- Protect API routes with session validation
- Use existing `users` table and bcrypt hashing

**Files to Modify**:
- `app/admin/layout.tsx` - Add auth check
- `app/api/**/route.ts` - Add session validation
- Create `app/api/auth/[...nextauth]/route.ts`

#### 2. File Upload for Media
**Current State**: Only URL input supported
**To Implement**:
- Add file upload component
- Use Next.js API route for file handling
- Store files in `/public/media/` or cloud storage
- Update `media_playlist.type` to 'file' and store path

**Files to Modify**:
- `components/admin/MediaPlaylist.tsx` - Add file input
- Create `app/api/media/upload/route.ts`
- Update `lib/video-utils.ts` if needed

#### 3. Real-time Updates (WebSocket)
**Current State**: Polling-based (30s/1.5s intervals)
**To Implement**:
- Install WebSocket library (e.g., `ws` or Socket.io)
- Create WebSocket server
- Replace polling with WebSocket subscriptions
- Broadcast updates on schedule/media changes

**Files to Modify**:
- `app/kiosk/page.tsx` - Replace polling with WebSocket
- Create WebSocket server endpoint
- Update API routes to broadcast on changes

#### 4. Multi-kiosk Management
**Current State**: Single kiosk (kiosk_id='default')
**To Implement**:
- Add kiosk registration/management in admin
- Create `kiosks` table with location, name, etc.
- Update video control to support multiple kiosks
- Add kiosk selection in admin dashboard

**Files to Modify**:
- Create `app/api/kiosks/route.ts`
- Update `app/api/kiosk/route.ts` to require kiosk_id
- Add kiosk management UI in admin

#### 5. Weather API Integration
**Current State**: Static weather data
**To Implement**:
- Integrate weather API (OpenWeatherMap, etc.)
- Create `app/api/weather/route.ts`
- Update `ScheduleSlideshow.tsx` to fetch real weather
- Cache weather data (update every 15-30 minutes)

**Files to Modify**:
- `components/kiosk/ScheduleSlideshow.tsx`
- Create `app/api/weather/route.ts`
- Add weather API key to environment variables

#### 6. Analytics and Reporting
**To Implement**:
- Create `analytics` table for tracking
- Log schedule views, video plays, etc.
- Create analytics dashboard in admin
- Export reports (CSV, PDF)

**Files to Create**:
- `app/api/analytics/route.ts`
- `components/admin/AnalyticsDashboard.tsx`
- Database migration for analytics table

#### 7. Schedule Recurring Patterns
**Current State**: Manual day selection
**To Implement**:
- Add "recurring" patterns (daily, weekly, monthly)
- Auto-generate schedules based on patterns
- Add pattern management UI

**Files to Modify**:
- `types/index.ts` - Add recurring pattern types
- `components/admin/ScheduleForm.tsx` - Add pattern selector
- `app/api/schedules/route.ts` - Handle pattern generation

#### 8. Media Reordering
**Current State**: Auto-ordered by creation
**To Implement**:
- Add drag-and-drop reordering in `MediaPlaylist`
- Update `order_index` on reorder
- Use library like `react-beautiful-dnd` or `@dnd-kit/core`

**Files to Modify**:
- `components/admin/MediaPlaylist.tsx`
- `app/api/media/route.ts` - Add PUT endpoint for reordering

### Database Modifications

#### Adding New Tables
1. Update `scripts/migrate.js` with new table schema
2. Run `npm run db:migrate`
3. Add TypeScript types in `types/index.ts`
4. Create API routes if needed

#### Modifying Existing Tables
1. Create migration script (add to `scripts/migrate.js` or new file)
2. Use `ALTER TABLE` statements
3. Update TypeScript types
4. Update API routes to handle new fields

### Styling Modifications

#### Changing Theme
- Modify `globals.css` for glassmorphism styles
- Update `SystemSettings` to persist theme choice
- Apply theme classes conditionally in components

#### Responsive Design
- Add Tailwind responsive classes
- Test on mobile/tablet breakpoints
- Update kiosk layout for different screen sizes

### Performance Optimizations

#### Database Indexing
- Add indexes for frequently queried fields
- Review query performance with `EXPLAIN ANALYZE`

#### Caching
- Implement Redis for frequently accessed data
- Cache schedule calculations
- Cache media metadata

#### Code Splitting
- Use Next.js dynamic imports for heavy components
- Lazy load video player
- Code split admin and kiosk bundles

### Security Enhancements

#### API Security
- Add rate limiting
- Implement CSRF protection
- Validate all inputs with Zod
- Sanitize user inputs

#### Database Security
- Use parameterized queries (already implemented)
- Implement connection encryption
- Add database backup strategy

---

## Common Modification Scenarios

### Adding a New Schedule Field
1. Update database schema in `scripts/migrate.js`
2. Add field to `Schedule` type in `types/index.ts`
3. Update `ScheduleForm.tsx` to include new field
4. Update `app/api/schedules/route.ts` to handle new field
5. Update `ScheduleSlideshow.tsx` if display needed
6. Run migration

### Adding a New Media Type
1. Update `MediaItem.type` in `types/index.ts`
2. Modify `VideoPlayer.tsx` to handle new type
3. Add conversion utility in `lib/video-utils.ts` if needed
4. Update `MediaPlaylist.tsx` UI if needed

### Changing Status Calculation Logic
1. Modify `calculateScheduleStatus()` in `lib/utils.ts`
2. Update status badge colors in `StatusBadge.tsx` if needed
3. Test with various time scenarios

### Adding New System Settings
1. Add default value in `scripts/migrate.js`
2. Update `SystemSettings` type in `types/index.ts`
3. Add UI control in `SystemSettingsPanel.tsx`
4. Use setting in relevant components

---

## Testing Recommendations

### Manual Testing Checklist
- [ ] Create/edit/delete schedules
- [ ] Add/delete media items
- [ ] Update system settings
- [ ] Verify kiosk displays today's schedules
- [ ] Test video playback (YouTube and direct)
- [ ] Test remote video control
- [ ] Verify status calculations at different times
- [ ] Test schedule slideshow rotation
- [ ] Verify fullscreen functionality

### Automated Testing (To Implement)
- Unit tests for utility functions
- Integration tests for API routes
- E2E tests for admin workflows
- E2E tests for kiosk display

---

## Troubleshooting

### Common Issues

#### Schedules Not Showing on Kiosk
- Check day name format (must match exactly: 'Monday', 'Tuesday', etc.)
- Verify schedule has current day in `days` array
- Check database query logs

#### Video Not Playing
- Verify URL is accessible
- Check YouTube URL format
- Verify CORS settings for direct video files
- Check browser console for errors

#### Database Connection Errors
- Verify `DATABASE_URL` format
- Check PostgreSQL is running
- Verify database exists
- Check network/firewall settings

#### Video Control Not Syncing
- Check `last_updated` timestamp comparison
- Verify polling interval (1.5s)
- Check API response includes `videoControl`
- Verify `kiosk_id` matches

---

## Version History

- **v1.0.0** - Initial release
  - Schedule management
  - Media playlist
  - Kiosk display
  - Basic admin dashboard
  - PostgreSQL database
  - Real-time status calculation

---

## Notes

- Authentication is configured but not fully implemented
- Weather data is static (hardcoded)
- File upload not implemented (URL-only)
- WebSocket not implemented (polling-based)
- Multi-kiosk support partially implemented (video control supports it)
- Analytics/reporting not implemented

---

**Last Updated**: Generated from codebase analysis
**Maintainer**: Review and update this document when making significant changes

