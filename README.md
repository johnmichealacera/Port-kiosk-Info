# Port Kiosk Information System

A Next.js-based port information kiosk system for managing boat trip schedules and displaying media content.

## Features

- **Admin Dashboard**: Manage schedules, media playlists, and system settings
- **Kiosk Display**: Public-facing display showing today's departures and media content
- **Real-time Updates**: Automatic synchronization between admin and kiosk displays
- **PostgreSQL Database**: Robust data persistence
- **Responsive Design**: Modern UI with glassmorphism effects

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Git

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```sql
CREATE DATABASE port_kiosk_db;
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/port_kiosk_db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NODE_ENV=development
```

**Important**: Replace `username`, `password`, and `your-secret-key-here` with your actual values.

### 4. Run Database Migrations

```bash
npm run db:migrate
```

This will create all necessary tables and insert default data.

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at:
- Admin Dashboard: http://localhost:3000/admin
- Kiosk Display: http://localhost:3000/kiosk

## Default Credentials

After running migrations, you can use:
- Username: `admin`
- Password: `admin123`

**Note**: The default password is hashed. You'll need to implement authentication to use these credentials.

## Project Structure

```
port-kiosk-app/
├── app/
│   ├── admin/          # Admin dashboard pages
│   ├── kiosk/          # Kiosk display pages
│   └── api/            # API routes
├── components/
│   ├── admin/          # Admin components
│   ├── kiosk/          # Kiosk components
│   └── shared/         # Shared components
├── lib/                # Utility functions
├── types/              # TypeScript types
└── scripts/            # Database migration scripts
```

## API Endpoints

### Schedules
- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules` - Update schedule
- `DELETE /api/schedules?id={id}` - Delete schedule

### Media
- `GET /api/media` - Get all media items
- `POST /api/media` - Add media item
- `DELETE /api/media?id={id}` - Delete media item

### Settings
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings

### Kiosk
- `GET /api/kiosk` - Get kiosk data (schedules, media, video control)
- `PUT /api/kiosk` - Update video control state

## Development

### Build for Production

```bash
npm run build
npm start
```

### Database Migrations

To create new migrations, modify `scripts/migrate.js` and run:

```bash
npm run db:migrate
```

## Features to Implement

- [ ] User authentication with NextAuth.js
- [ ] File upload for media (currently URL-only)
- [ ] WebSocket support for real-time updates
- [ ] Multi-kiosk support
- [ ] Analytics and reporting
- [ ] Mobile responsive admin interface

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure database exists

### Migration Errors

- Drop and recreate database if needed
- Check PostgreSQL logs for detailed error messages

## License

MIT

## Support

For issues and questions, please open an issue on the repository.

