# Ads Implementation - Quick Reference Guide

## Overview

This is a quick reference for implementing the ads system. For detailed analysis, see `ADS_IMPLEMENTATION_ANALYSIS.md`.

---

## Key Components

### 1. Database Tables (6 new tables)
- `advertisers` - Advertiser accounts
- `ad_campaigns` - Ad campaigns
- `ad_media` - Ad video/media files
- `ad_schedules` - Time-based scheduling
- `ad_impressions` - Analytics tracking
- `ad_revenue` - Revenue tracking

### 2. Core Business Logic
- **Ad Selection**: Merge ads with regular media based on rules
- **Frequency Control**: Configure how often ad displays (interval, per_hour, per_day)
- **Scheduling**: Time/day-based display rules
- **Revenue Calculation**: Fixed daily/monthly rate (simple multiplication)

### 3. API Endpoints
- `/api/advertisers` - Advertiser CRUD
- `/api/campaigns` - Campaign management
- `/api/campaigns/[id]/media` - Ad media management
- `/api/campaigns/[id]/schedules` - Scheduling
- `/api/analytics/ads` - Analytics & reporting
- `/api/kiosk` (modified) - Returns merged playlist

### 4. Admin UI Components
- Advertiser management page
- Campaign management page
- Analytics dashboard
- Campaign approval workflow

---

## Implementation Priority

### MVP (Minimum Viable Product)
1. ✅ Database schema
2. ✅ Basic advertiser & campaign CRUD
3. ✅ Simple ad selection (priority-based)
4. ✅ Impression tracking (for analytics only)
5. ✅ Fixed daily/monthly rate calculation

### Phase 2
- Scheduling system
- Frequency capping
- Advanced analytics
- Campaign approval workflow

### Phase 3
- Self-service portal
- Payment integration
- Advanced targeting

---

## Quick Start Checklist

### Database Setup
- [ ] Run migration script to create ad tables
- [ ] Add indexes for performance
- [ ] Insert default settings

### Backend
- [ ] Create TypeScript types
- [ ] Implement advertiser API
- [ ] Implement campaign API
- [ ] Implement ad selection logic
- [ ] Modify kiosk API to merge ads
- [ ] Add impression tracking

### Frontend
- [ ] Create advertiser management UI
- [ ] Create campaign management UI
- [ ] Update media playlist to show ads
- [ ] Add analytics dashboard
- [ ] Update kiosk player to track impressions

### Testing
- [ ] Test ad selection algorithm
- [ ] Test frequency capping
- [ ] Test scheduling
- [ ] Test revenue calculation
- [ ] End-to-end flow testing

---

## Key Algorithms

### Ad Selection Flow
```
1. Get active campaigns (date range, status = 'active')
2. Filter by scheduling rules (time, day of week)
3. Check frequency configuration:
   - Interval: Show every Nth video (e.g., every 3rd)
   - Per Hour: Show X times per hour (check impressions)
   - Per Day: Show X times per day (check impressions)
4. Apply priority weighting
5. Merge with regular media:
   - Mixed: Interleave based on priority
   - Interstitial: Insert every N videos
   - Scheduled: Only during time windows
6. Return combined playlist
```

### Revenue Calculation
```
Daily Rate Model:
  Total Revenue = daily_rate × number_of_days
  
Monthly Rate Model:
  Total Revenue = daily_rate × days_in_period
  (Auto-calculated when campaign is created)

Example:
  Daily Rate: ₱500
  1 Month (30 days): ₱500 × 30 = ₱15,000
```

**Note**: Frequency is a display setting, NOT tied to pricing. 
Admin controls how often ad shows, but price is fixed per day/month.

---

## File Structure

```
app/
  api/
    advertisers/
      route.ts          # NEW
    campaigns/
      route.ts          # NEW
      [id]/
        media/
          route.ts      # NEW
        schedules/
          route.ts      # NEW
    analytics/
      ads/
        route.ts        # NEW
    kiosk/
      route.ts          # MODIFY (merge ads)

components/
  admin/
    AdvertiserManagement.tsx    # NEW
    CampaignManagement.tsx      # NEW
    CampaignForm.tsx            # NEW
    AdAnalytics.tsx              # NEW
  kiosk/
    VideoPlayer.tsx              # MODIFY (track impressions)
    AdIndicator.tsx              # NEW (optional)

lib/
  ad-utils.ts                    # NEW (ad selection logic)
  revenue-utils.ts               # NEW (revenue calculation)

types/
  index.ts                       # MODIFY (add ad types)

scripts/
  migrate-ads.js                 # NEW (or update migrate.js)
```

---

## Revenue Model

**Fixed Daily/Monthly Rate** (Simple & Predictable)

| Duration | Daily Rate | Total Cost | Example Frequency |
|----------|-----------|------------|-------------------|
| 1 Day | ₱500 | ₱500 | Every 5th video |
| 1 Week | ₱500 | ₱3,500 | Every 3rd video |
| 1 Month | ₱500 | ₱15,000 | Every 2nd video |

**Key Points:**
- Price is fixed per day/month (not based on impressions)
- Frequency is configured separately (admin controls display frequency)
- Simple calculation: `daily_rate × number_of_days`
- Guaranteed revenue regardless of actual display count

---

## Testing Scenarios

### Test Case 1: Basic Ad Display
- Create campaign
- Add media
- Verify ad appears in kiosk playlist

### Test Case 2: Frequency Control
- Set frequency: "Every 3rd video"
- Verify ad appears at correct intervals
- Set frequency: "10 per hour"
- Verify ad shows max 10 times per hour
- Set frequency: "50 per day"
- Verify ad shows max 50 times per day

### Test Case 3: Scheduling
- Set schedule: 9 AM - 5 PM
- Verify ad only shows during window
- Verify ad hidden outside window

### Test Case 4: Priority
- Create 2 campaigns (priority 10 and 5)
- Verify higher priority shows more often

### Test Case 5: Interstitial
- Set interval: every 3rd video
- Verify ad appears at correct intervals

### Test Case 6: Revenue Tracking
- Record impressions
- Verify revenue calculated correctly
- Verify revenue reports accurate

---

## Common Issues & Solutions

### Issue: Ads not showing
- Check campaign status (must be 'active')
- Check date range (must be within start/end)
- Check scheduling rules
- Check frequency caps

### Issue: Performance slow
- Add database indexes
- Cache active campaigns
- Optimize impression queries

### Issue: Revenue incorrect
- Verify daily_rate is set correctly
- Check billing_period (daily vs monthly)
- Verify date range calculation (end_date - start_date)
- Check: Total = daily_rate × number_of_days

---

## Next Steps After Implementation

1. **Monitor Performance**: Track query times, cache hit rates
2. **Gather Feedback**: From advertisers and end users
3. **Optimize**: Based on usage patterns
4. **Expand**: Add new features based on demand

---

**See `ADS_IMPLEMENTATION_ANALYSIS.md` for complete details.**

