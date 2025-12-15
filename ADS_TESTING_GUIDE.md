# Ads Integration Testing Guide

This guide provides step-by-step instructions for testing the ads integration in the Port Kiosk Information System.

## Prerequisites

Before testing, ensure you have:

1. ✅ Database is set up and migrated
2. ✅ Development server is running
3. ✅ At least one regular media item in the playlist
4. ✅ Access to the admin dashboard

---

## Step 1: Verify Database Setup

First, ensure the ads tables are created in your database.

### 1.1 Check Database Connection

```bash
# Make sure your .env.local file has the correct DATABASE_URL
cat .env.local
```

### 1.2 Run Database Migration

```bash
npm run db:migrate
```

This should create all the ads-related tables:
- `advertisers`
- `ad_campaigns`
- `ad_media`
- `ad_schedules`
- `ad_impressions`
- `ad_revenue`

### 1.3 Verify Tables (Optional)

You can verify the tables exist by checking your PostgreSQL database:

```sql
-- Connect to your database
psql -d port_kiosk_db

-- List tables
\dt

-- Check if ads tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ad%';
```

---

## Step 2: Start the Development Server

```bash
npm run dev
```

The application should be available at:
- Admin Dashboard: http://localhost:3000/admin
- Kiosk Display: http://localhost:3000/kiosk

---

## Step 3: Test Advertiser Management

### 3.1 Create an Advertiser

1. Open the admin dashboard: http://localhost:3000/admin
2. Click on the **"Advertisers"** tab in the sidebar
3. Click **"Create New Advertiser"** or similar button
4. Fill in the form:
   - **Company Name**: "Test Advertiser Inc"
   - **Contact Name**: "John Doe"
   - **Email**: "john@testadvertiser.com"
   - **Phone**: "+1234567890"
   - **Address**: "123 Test Street"
   - **Status**: "Active"
5. Click **"Save"** or **"Create"**

**Expected Result**: 
- Success notification appears
- Advertiser appears in the advertisers list
- You can see the advertiser details

### 3.2 Verify Advertiser via API (Optional)

Test the API directly:

```bash
# Get all advertisers
curl http://localhost:3000/api/advertisers

# Get specific advertiser (replace {id} with actual ID)
curl http://localhost:3000/api/advertisers/{id}
```

---

## Step 4: Test Campaign Management

### 4.1 Create a Campaign

1. In the admin dashboard, click on the **"Campaigns"** tab
2. Click **"Create New Campaign"** or similar button
3. Fill in the campaign form:

   **Basic Information:**
   - **Advertiser**: Select the advertiser you created in Step 3
   - **Campaign Name**: "Summer Promotion 2024"
   - **Description**: "Test campaign for summer promotion"
   
   **Dates & Pricing:**
   - **Start Date**: Today's date (or a date in the past for immediate testing)
   - **End Date**: A date in the future (e.g., 7 days from now)
   - **Daily Rate**: `500` (or any test amount)
   - **Billing Period**: "Daily" or "Monthly"
   
   **Display Settings:**
   - **Priority**: `5` (1-10, higher = more frequent)
   - **Frequency Type**: "Interval" (for easiest testing)
   - **Frequency Value**: `3` (show every 3rd video)
   - **Display Type**: "Mixed" or "Interstitial"

4. Click **"Save"** or **"Create"**

**Expected Result**: 
- Campaign is created with status "pending"
- Campaign appears in the campaigns list
- Total cost is calculated automatically

### 4.2 Add Media to Campaign

1. In the campaign detail view, find the **"Media"** section
2. Click **"Add Media"** or similar button
3. Fill in the media form:
   - **Title**: "Test Ad Video"
   - **Source**: A valid video URL (e.g., YouTube embed URL or direct video URL)
     - Example: `https://www.youtube.com/embed/dQw4w9WgXcQ`
     - Or: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`
   - **Type**: "url"
   - **Duration** (optional): `30` (seconds)
4. Click **"Save"**

**Expected Result**: 
- Media is added to the campaign
- Media appears in the campaign's media list

### 4.3 Approve the Campaign

1. In the campaign detail view, find the **"Actions"** section
2. Click **"Approve Campaign"** button
3. Confirm the approval

**Expected Result**: 
- Campaign status changes from "pending" to "active"
- Campaign is now eligible to be displayed on the kiosk

---

## Step 5: Test Ad Display on Kiosk

### 5.1 Open Kiosk Display

1. Open the kiosk page: http://localhost:3000/kiosk
2. Or click **"View Kiosk"** link in the admin dashboard sidebar

### 5.2 Verify Ads in Playlist

1. Open browser developer tools (F12)
2. Go to the **Console** tab
3. Look for logs showing:
   - Media count (should include ads)
   - Campaign information
   - Ad selection logic

4. In the **Network** tab, check the `/api/kiosk` request:
   - Response should include `media` array
   - Media items should have `isAd: true` for ad items
   - Media items should have `campaignId` and `adMediaId` properties

### 5.3 Verify Ad Playback

1. Watch the kiosk display
2. The ad should appear in the playlist rotation
3. If frequency is set to "every 3rd video", the ad should appear:
   - After 2 regular videos
   - Then after 3 more regular videos
   - And so on...

**Expected Result**: 
- Ads appear in the video rotation
- Ads play correctly
- Regular media continues to play between ads

---

## Step 6: Test Impression Tracking

### 6.1 Verify Impression API

When an ad plays, the kiosk should send impression data to the API.

1. Open browser developer tools on the kiosk page
2. Go to the **Network** tab
3. Filter for `/api/kiosk/impression`
4. Watch for POST requests when ads play

### 6.2 Check Impression Data

Test the impression API directly:

```bash
# Create an impression (replace IDs with actual values)
curl -X POST http://localhost:3000/api/kiosk/impression \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": 1,
    "adMediaId": 1,
    "kioskId": "default",
    "playDuration": 30,
    "completed": true,
    "skipped": false
  }'
```

**Expected Result**: 
- Impression is recorded successfully
- Returns success response

### 6.3 View Analytics

1. In the admin dashboard, click on the **"Ad Analytics"** tab
2. Check the analytics dashboard for:
   - Total impressions
   - Campaign performance
   - Revenue data

**Expected Result**: 
- Analytics show impression counts
- Revenue is calculated correctly
- Campaign performance metrics are displayed

---

## Step 7: Test Different Frequency Types

### 7.1 Test Interval Frequency

1. Create a campaign with:
   - **Frequency Type**: "Interval"
   - **Frequency Value**: `5` (every 5th video)
2. Approve the campaign
3. Watch the kiosk display
4. Count videos: ad should appear at positions 5, 10, 15, etc.

### 7.2 Test Per-Hour Frequency

1. Create a campaign with:
   - **Frequency Type**: "Per Hour"
   - **Frequency Value**: `10` (10 times per hour)
2. Approve the campaign
3. Watch the kiosk for an hour
4. Count ad appearances: should not exceed 10 times

### 7.3 Test Per-Day Frequency

1. Create a campaign with:
   - **Frequency Type**: "Per Day"
   - **Frequency Value**: `50` (50 times per day)
2. Approve the campaign
3. Monitor throughout the day
4. Count ad appearances: should not exceed 50 times

---

## Step 8: Test Scheduling

### 8.1 Create Time-Based Schedule

1. In a campaign, go to the **"Schedules"** section
2. Click **"Add Schedule"**
3. Fill in:
   - **Day of Week**: "Monday" (or leave blank for all days)
   - **Start Time**: "09:00"
   - **End Time**: "17:00"
4. Save the schedule

### 8.2 Test Schedule Enforcement

1. Check the current time
2. If within 9 AM - 5 PM:
   - Ad should appear on kiosk
3. If outside 9 AM - 5 PM:
   - Ad should NOT appear on kiosk

**Note**: You may need to wait or adjust your system time for testing.

---

## Step 9: Test Multiple Campaigns

### 9.1 Create Multiple Active Campaigns

1. Create 2-3 different campaigns with:
   - Different advertisers
   - Different priorities (e.g., 10, 7, 5)
   - Different frequency values
2. Approve all campaigns

### 9.2 Verify Priority System

1. Watch the kiosk display
2. Higher priority campaigns should appear more frequently
3. Lower priority campaigns should appear less frequently

**Expected Result**: 
- Campaigns with priority 10 appear more often than priority 5
- All active campaigns appear in rotation

---

## Step 10: Test Campaign Status Changes

### 10.1 Pause a Campaign

1. In the campaign detail view, click **"Pause Campaign"**
2. Check the kiosk display
3. The paused campaign's ads should stop appearing

### 10.2 Resume a Campaign

1. Click **"Resume Campaign"**
2. Check the kiosk display
3. The campaign's ads should start appearing again

### 10.3 Test Expired Campaign

1. Create a campaign with:
   - **End Date**: Yesterday (or a past date)
2. The campaign status should automatically be "expired"
3. Expired campaigns should NOT appear on kiosk

---

## Step 11: Test Revenue Calculation

### 11.1 Verify Revenue Calculation

1. Create a campaign with:
   - **Start Date**: 2024-01-01
   - **End Date**: 2024-01-31 (31 days)
   - **Daily Rate**: 500
   - **Billing Period**: "Daily"
2. Check the **Total Cost**:
   - Should be: 500 × 31 = 15,500

### 11.2 Test Monthly Billing

1. Create a campaign with:
   - **Start Date**: 2024-01-01
   - **End Date**: 2024-01-31 (31 days)
   - **Daily Rate**: 500
   - **Billing Period**: "Monthly"
2. Check the **Monthly Rate**:
   - Should be calculated: 500 × 31 = 15,500
3. Check the **Total Cost**:
   - Should match the monthly rate

---

## Step 12: End-to-End Test

### 12.1 Complete Flow Test

1. **Create Advertiser** → Verify it appears
2. **Create Campaign** → Verify it's created with status "pending"
3. **Add Media** → Verify media is added
4. **Approve Campaign** → Verify status changes to "active"
5. **Check Kiosk** → Verify ad appears in rotation
6. **Watch Ad Play** → Verify impression is tracked
7. **Check Analytics** → Verify data appears in analytics

### 12.2 Test Edge Cases

- **No active campaigns**: Kiosk should show only regular media
- **Campaign with no media**: Campaign should not appear on kiosk
- **Campaign outside date range**: Should not appear
- **Multiple campaigns with same priority**: Should rotate fairly

---

## Troubleshooting

### Ads Not Appearing on Kiosk

1. **Check Campaign Status**:
   - Must be "active" (not "pending", "paused", or "expired")
   
2. **Check Date Range**:
   - Current date must be between start_date and end_date
   
3. **Check Media**:
   - Campaign must have at least one media item
   - Media source must be a valid URL
   
4. **Check Frequency**:
   - If using "interval", wait for the interval to pass
   - If using "per_hour" or "per_day", check impression limits
   
5. **Check Browser Console**:
   - Look for errors in the kiosk page console
   - Check network requests to `/api/kiosk`

### API Errors

1. **Check Database Connection**:
   ```bash
   # Verify DATABASE_URL in .env.local
   cat .env.local
   ```

2. **Check Database Tables**:
   ```bash
   # Run migration again
   npm run db:migrate
   ```

3. **Check Server Logs**:
   - Look at the terminal where `npm run dev` is running
   - Check for database errors or API errors

### Impression Tracking Not Working

1. **Check VideoPlayer Component**:
   - Ensure it's calling `/api/kiosk/impression` when ads play
   - Check browser network tab for POST requests

2. **Verify Request Format**:
   - Campaign ID must exist
   - Ad Media ID must exist
   - Kiosk ID should match

---

## Quick Test Checklist

Use this checklist for quick testing:

- [ ] Database migration completed successfully
- [ ] Development server running
- [ ] Created at least one advertiser
- [ ] Created at least one campaign
- [ ] Added media to campaign
- [ ] Approved campaign (status = "active")
- [ ] Verified ad appears on kiosk
- [ ] Verified impression tracking works
- [ ] Checked analytics dashboard
- [ ] Tested different frequency types
- [ ] Tested campaign pause/resume
- [ ] Verified revenue calculation

---

## Next Steps

After successful testing:

1. **Performance Testing**: Test with multiple campaigns and high frequency
2. **Load Testing**: Test with many impressions
3. **UI/UX Testing**: Verify admin interface is user-friendly
4. **Documentation**: Update any missing documentation
5. **Production Deployment**: Deploy to production environment

---

## Additional Resources

- **Implementation Analysis**: See `ADS_IMPLEMENTATION_ANALYSIS.md`
- **Quick Reference**: See `ADS_QUICK_REFERENCE.md`
- **API Documentation**: Check the API route files in `app/api/`

---

**Happy Testing! 🎉**
