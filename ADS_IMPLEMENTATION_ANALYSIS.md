# Ads Implementation Analysis - Port Kiosk Information System

## Executive Summary

This document analyzes the requirements and implementation plan for adding an advertising system to the Port Kiosk Information System. The ads system will enable revenue generation by displaying sponsored content alongside regular media in the kiosk display.

---

## Current State Analysis

### Existing Media System

**Current Media Structure:**
- Media items stored in `media_playlist` table
- Simple structure: `id`, `title`, `source`, `type`, `order_index`
- Playback: Sequential rotation through all media items
- Management: Basic add/delete functionality in admin dashboard
- Display: Full-screen video player on kiosk

**Current Limitations:**
1. No distinction between regular content and ads
2. No scheduling or time-based display rules
3. No tracking of impressions or views
4. No advertiser management
5. No revenue tracking
6. No ad campaign management
7. No priority/weighting system for ads

---

## Ad System Requirements

### 1. Business Requirements

#### 1.1 Ad Types
- **Video Ads**: Full-screen video advertisements (similar to current media)
- **Banner Ads**: Static or animated banner overlays (optional future enhancement)
- **Sponsored Content**: Regular media items marked as sponsored

#### 1.2 Ad Display Models
- **Interstitial Ads**: Play between regular content (e.g., every 3rd video)
- **Rotational Ads**: Mixed into playlist with priority weighting
- **Scheduled Ads**: Time-based display (e.g., show ad X between 9 AM - 5 PM)
- **Frequency Capping**: Limit how often an ad is shown per hour/day

#### 1.3 Revenue Models
- **Fixed Daily Rate**: Simple flat fee per day (e.g., ₱500/day)
- **Fixed Monthly Rate**: Flat fee per month (e.g., ₱15,000/month = ₱500/day × 30 days)
- **Frequency Configuration**: Admin controls how often ad appears (separate from pricing)
  - Frequency is a display setting, not tied to cost
  - Examples: "Show every 3rd video", "Show 10 times per hour", "Show 50 times per day"

### 2. Functional Requirements

#### 2.1 Advertiser Management
- Create/manage advertiser accounts
- Advertiser profiles with contact information
- Payment tracking and billing
- Contract management (start/end dates)

#### 2.2 Ad Campaign Management
- Create ad campaigns
- Upload ad media (video files or URLs)
- Set campaign duration (start/end dates)
- Set pricing: Daily rate or Monthly rate (calculated automatically)
- Set display frequency (admin-controlled, separate from pricing)
  - Frequency options: "Every Nth video", "X times per hour", "X times per day"
- Set priority/weighting for rotation
- Campaign status (active, paused, completed, expired)

#### 2.3 Ad Scheduling
- Time-based scheduling (specific hours/days)
- Day-of-week targeting
- Priority/weighting system
- Frequency capping rules
- Rotation rules (interstitial vs. mixed)

#### 2.4 Analytics & Reporting
- Impressions tracking (views per ad)
- Play duration tracking
- Revenue reporting
- Campaign performance metrics
- Advertiser dashboard

#### 2.5 Admin Controls
- Approve/reject ads
- Manual ad insertion
- Emergency ad removal
- Ad preview before going live

---

## Technical Implementation Plan

### Phase 1: Database Schema Changes

#### New Tables Required

##### 1. `advertisers` Table
```sql
CREATE TABLE advertisers (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 2. `ad_campaigns` Table
```sql
CREATE TABLE ad_campaigns (
  id SERIAL PRIMARY KEY,
  advertiser_id INTEGER REFERENCES advertisers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, paused, completed, expired, rejected
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_rate DECIMAL(10, 2) NOT NULL, -- Price per day (e.g., 500.00)
  monthly_rate DECIMAL(10, 2), -- Auto-calculated: daily_rate * days_in_period
  billing_period VARCHAR(50) DEFAULT 'daily', -- 'daily' or 'monthly'
  total_cost DECIMAL(10, 2), -- Total cost for the campaign period
  priority INTEGER DEFAULT 5, -- 1-10, higher = more frequent
  frequency_type VARCHAR(50) DEFAULT 'interval', -- 'interval', 'per_hour', 'per_day'
  frequency_value INTEGER, -- 
    -- if interval: show every Nth video (e.g., 3 = every 3rd video)
    -- if per_hour: show X times per hour (e.g., 10 = 10 times/hour)
    -- if per_day: show X times per day (e.g., 50 = 50 times/day)
  display_type VARCHAR(50) DEFAULT 'mixed', -- mixed, interstitial, scheduled
  interstitial_interval INTEGER, -- show every Nth video (if interstitial) - legacy, use frequency_value instead
  approved_at TIMESTAMP,
  approved_by INTEGER, -- user_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 3. `ad_schedules` Table
```sql
CREATE TABLE ad_schedules (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20), -- Monday, Tuesday, etc., or NULL for all days
  start_time TIME, -- e.g., 09:00
  end_time TIME, -- e.g., 17:00
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 4. `ad_media` Table
```sql
CREATE TABLE ad_media (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  source TEXT NOT NULL, -- URL or file path
  type VARCHAR(50) DEFAULT 'url', -- url, file
  duration INTEGER, -- in seconds (optional, for tracking)
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 5. `ad_impressions` Table (Analytics)
```sql
CREATE TABLE ad_impressions (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  ad_media_id INTEGER REFERENCES ad_media(id) ON DELETE CASCADE,
  kiosk_id VARCHAR(255) DEFAULT 'default',
  impression_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  play_duration INTEGER, -- seconds watched
  completed BOOLEAN DEFAULT false, -- watched to end
  skipped BOOLEAN DEFAULT false
);
```

##### 6. `ad_revenue` Table (Financial Tracking)
```sql
CREATE TABLE ad_revenue (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  revenue_model VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Modified Tables

##### `media_playlist` Table - Add Ad Flag
```sql
ALTER TABLE media_playlist 
ADD COLUMN is_ad BOOLEAN DEFAULT false,
ADD COLUMN ad_campaign_id INTEGER REFERENCES ad_campaigns(id) ON DELETE SET NULL,
ADD COLUMN ad_media_id INTEGER REFERENCES ad_media(id) ON DELETE SET NULL;
```

**Alternative Approach**: Keep ads separate from regular media and merge at playback time.

---

### Phase 2: TypeScript Type Definitions

#### New Types (`types/index.ts`)

```typescript
export type AdCampaignStatus = 'pending' | 'active' | 'paused' | 'completed' | 'expired' | 'rejected';
export type BillingPeriod = 'daily' | 'monthly';
export type FrequencyType = 'interval' | 'per_hour' | 'per_day';
export type DisplayType = 'mixed' | 'interstitial' | 'scheduled';

export interface Advertiser {
  id: number;
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface AdCampaign {
  id: number;
  advertiserId: number;
  advertiser?: Advertiser;
  name: string;
  description?: string;
  status: AdCampaignStatus;
  startDate: Date;
  endDate: Date;
  dailyRate: number; // Price per day (e.g., 500.00)
  monthlyRate?: number; // Auto-calculated: dailyRate * days in period
  billingPeriod: BillingPeriod; // 'daily' or 'monthly'
  totalCost?: number; // Total cost for the campaign period
  priority: number; // 1-10, higher = more frequent
  frequencyType: FrequencyType; // 'interval', 'per_hour', 'per_day'
  frequencyValue: number; // 
    // if interval: show every Nth video (e.g., 3 = every 3rd video)
    // if per_hour: show X times per hour (e.g., 10 = 10 times/hour)
    // if per_day: show X times per day (e.g., 50 = 50 times/day)
  displayType: DisplayType;
  totalImpressions: number; // Track for analytics (not for billing)
  approvedAt?: Date;
  approvedBy?: number;
  createdAt: Date;
  updatedAt: Date;
  media?: AdMedia[];
  schedules?: AdSchedule[];
}

export interface AdSchedule {
  id: number;
  campaignId: number;
  dayOfWeek?: string; // Monday, Tuesday, etc.
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  isActive: boolean;
  createdAt: Date;
}

export interface AdMedia {
  id: number;
  campaignId: number;
  title: string;
  source: string;
  type: 'url' | 'file';
  duration?: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdImpression {
  id: number;
  campaignId: number;
  adMediaId: number;
  kioskId: string;
  impressionTime: Date;
  playDuration?: number;
  completed: boolean;
  skipped: boolean;
}

export interface AdRevenue {
  id: number;
  campaignId: number;
  date: Date;
  impressions: number; // For analytics only
  dailyRate: number;
  billingPeriod: BillingPeriod;
  totalRevenue: number; // Revenue for this day/period
  daysActive: number; // Number of days active
  createdAt: Date;
}
```

---

### Phase 3: API Endpoints

#### Advertiser Management API (`/api/advertisers`)

**GET /api/advertisers**
- List all advertisers
- Query params: `status`, `search`

**POST /api/advertisers**
- Create new advertiser

**GET /api/advertisers/[id]**
- Get advertiser details

**PUT /api/advertisers/[id]**
- Update advertiser

**DELETE /api/advertisers/[id]**
- Delete advertiser (soft delete or cascade)

#### Campaign Management API (`/api/campaigns`)

**GET /api/campaigns**
- List campaigns
- Query params: `status`, `advertiserId`, `date` (filter by active on date)

**POST /api/campaigns**
- Create new campaign
- Body: `CreateAdCampaignInput`

**GET /api/campaigns/[id]**
- Get campaign details with media and schedules

**PUT /api/campaigns/[id]**
- Update campaign

**PUT /api/campaigns/[id]/approve**
- Approve campaign (admin only)
- Sets `status` to 'active', sets `approved_at`

**PUT /api/campaigns/[id]/pause**
- Pause active campaign

**PUT /api/campaigns/[id]/resume**
- Resume paused campaign

**DELETE /api/campaigns/[id]**
- Delete campaign

#### Ad Media API (`/api/campaigns/[id]/media`)

**GET /api/campaigns/[id]/media**
- Get all media for a campaign

**POST /api/campaigns/[id]/media**
- Add media to campaign

**PUT /api/campaigns/[id]/media/[mediaId]**
- Update media

**DELETE /api/campaigns/[id]/media/[mediaId]**
- Delete media

#### Ad Schedules API (`/api/campaigns/[id]/schedules`)

**GET /api/campaigns/[id]/schedules**
- Get schedules for campaign

**POST /api/campaigns/[id]/schedules**
- Add schedule

**PUT /api/campaigns/[id]/schedules/[scheduleId]**
- Update schedule

**DELETE /api/campaigns/[id]/schedules/[scheduleId]**
- Delete schedule

#### Analytics API (`/api/analytics/ads`)

**GET /api/analytics/ads/impressions**
- Get impression data
- Query params: `campaignId`, `startDate`, `endDate`, `kioskId`

**GET /api/analytics/ads/revenue**
- Get revenue data
- Query params: `startDate`, `endDate`, `campaignId`

**GET /api/analytics/ads/campaigns/[id]/performance**
- Get detailed performance for a campaign

#### Kiosk API Modifications (`/api/kiosk`)

**GET /api/kiosk** (Modified)
- Merge regular media with active ads
- Apply scheduling rules (time/day)
- Apply frequency configuration (interval, per_hour, per_day)
- Return combined playlist with ad markers
- Note: Frequency is for display control, not billing

**POST /api/kiosk/impression**
- Track ad impression
- Body: `{ campaignId, adMediaId, kioskId, playDuration?, completed, skipped }`

---

### Phase 4: Business Logic Implementation

#### 4.1 Ad Selection Algorithm

**Location**: `lib/ad-utils.ts`

```typescript
/**
 * Selects which ads to display based on:
 * - Active campaigns (date range, status = 'active')
 * - Scheduling rules (time of day, day of week)
 * - Frequency configuration (interval, per_hour, per_day)
 * - Priority weighting (higher priority = more frequent)
 * - Display type (mixed, interstitial, scheduled)
 */
export async function selectAdsForPlaylist(
  regularMedia: MediaItem[],
  activeCampaigns: AdCampaign[],
  currentTime: Date,
  kioskId: string,
  currentVideoIndex: number
): Promise<MediaItem[]> {
  // 1. Filter active campaigns (date range, status = 'active')
  const active = activeCampaigns.filter(c => 
    c.status === 'active' &&
    currentTime >= new Date(c.startDate) &&
    currentTime <= new Date(c.endDate)
  );
  
  // 2. Apply scheduling rules (time of day, day of week)
  const scheduled = await filterBySchedule(active, currentTime);
  
  // 3. Check frequency rules (interval, per_hour, per_day)
  const eligible = await Promise.all(
    scheduled.map(async (campaign) => {
      const shouldShow = await shouldShowAd(
        campaign, 
        kioskId, 
        currentVideoIndex,
        0 // total videos played (can track separately)
      );
      return shouldShow ? campaign : null;
    })
  );
  const eligibleCampaigns = eligible.filter(c => c !== null) as AdCampaign[];
  
  // 4. Apply priority weighting and select ads
  // 5. Merge with regular media based on display type
  // 6. Return combined playlist
  return mergeAdsWithMedia(regularMedia, eligibleCampaigns);
}
```

**Display Type Logic:**

1. **Mixed**: Interleave ads with regular content based on priority
2. **Interstitial**: Insert ads every N videos
3. **Scheduled**: Only show during scheduled time windows

#### 4.2 Frequency Control

**Location**: `lib/ad-utils.ts`

```typescript
/**
 * Check if ad should be shown based on frequency configuration
 * Frequency is a display setting, not a billing cap
 */
export async function shouldShowAd(
  campaign: AdCampaign,
  kioskId: string,
  currentVideoIndex: number,
  totalVideosPlayed: number
): Promise<boolean> {
  switch (campaign.frequencyType) {
    case 'interval':
      // Show every Nth video (e.g., every 3rd video)
      return (currentVideoIndex % campaign.frequencyValue) === 0;
    
    case 'per_hour':
      // Check impressions in last hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const impressionsLastHour = await getImpressionCount(
        campaign.id, 
        kioskId, 
        hourAgo
      );
      return impressionsLastHour < campaign.frequencyValue;
    
    case 'per_day':
      // Check impressions today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const impressionsToday = await getImpressionCount(
        campaign.id, 
        kioskId, 
        today
      );
      return impressionsToday < campaign.frequencyValue;
    
    default:
      return true;
  }
}
```

#### 4.3 Revenue Calculation

**Location**: `lib/ad-utils.ts`

```typescript
/**
 * Calculate total revenue for a campaign period
 * Simple fixed daily/monthly rate model
 */
export function calculateCampaignRevenue(
  campaign: AdCampaign
): number {
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (campaign.billingPeriod === 'monthly') {
    // Monthly rate is already calculated (dailyRate * days in period)
    return campaign.monthlyRate || (campaign.dailyRate * daysDiff);
  } else {
    // Daily rate: multiply by number of days
    return campaign.dailyRate * daysDiff;
  }
}

/**
 * Calculate daily revenue (for reporting)
 */
export function calculateDailyRevenue(
  dailyRate: number,
  billingPeriod: BillingPeriod
): number {
  if (billingPeriod === 'monthly') {
    // For monthly billing, daily revenue = monthlyRate / days in month
    // This is calculated when campaign is created
    return dailyRate; // Already normalized to daily
  }
  return dailyRate;
}
```

#### 4.4 Campaign Status Management

**Location**: `lib/ad-utils.ts`

```typescript
/**
 * Update campaign status based on dates and impressions
 */
export async function updateCampaignStatus(
  campaign: AdCampaign
): Promise<AdCampaignStatus> {
  const now = new Date();
  
  if (now < campaign.startDate) return 'pending';
  if (now > campaign.endDate) return 'expired';
  if (campaign.maxImpressions && campaign.totalImpressions >= campaign.maxImpressions) {
    return 'completed';
  }
  if (campaign.status === 'paused') return 'paused';
  
  return 'active';
}
```

---

### Phase 5: UI/UX Changes

#### 5.1 Admin Dashboard - New Sections

##### Advertiser Management (`/admin/advertisers`)
- List of advertisers
- Create/edit advertiser form
- Advertiser details view
- Link to advertiser's campaigns

##### Campaign Management (`/admin/campaigns`)
- Campaign list with filters (status, advertiser, date)
- Campaign creation wizard:
  1. Select advertiser
  2. Campaign details (name, dates, budget)
  3. Upload media
  4. Set scheduling
  5. Set display rules
- Campaign detail view:
  - Campaign info
  - Media list
  - Schedules
  - Performance metrics
  - Approve/reject/pause buttons
- Campaign preview

##### Ad Analytics Dashboard (`/admin/analytics/ads`)
- Revenue overview (daily, weekly, monthly)
- Top performing campaigns
- Impression charts
- Advertiser performance
- Export reports (CSV, PDF)

#### 5.2 Media Playlist Component Updates

**Current**: `components/admin/MediaPlaylist.tsx`

**Changes Needed**:
- Add "Ad Campaign" indicator for ad media
- Filter to show/hide ads
- Link to campaign management
- Show ad revenue info

#### 5.3 Kiosk Display Updates

**Current**: `components/kiosk/VideoPlayer.tsx`

**Changes Needed**:
- Track ad impressions (play duration, completion)
- Send impression data to API
- Visual indicator for ads (optional: "Advertisement" label)
- Handle ad-specific playback rules

**New Component**: `components/kiosk/AdIndicator.tsx`
- Small "Ad" badge overlay (optional)

---

### Phase 6: Data Migration & Setup

#### Migration Script Updates

**File**: `scripts/migrate.js` or new `scripts/migrate-ads.js`

1. Create all new tables
2. Add indexes for performance:
   ```sql
   CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);
   CREATE INDEX idx_ad_campaigns_dates ON ad_campaigns(start_date, end_date);
   CREATE INDEX idx_ad_impressions_campaign ON ad_impressions(campaign_id, impression_time);
   CREATE INDEX idx_ad_impressions_kiosk ON ad_impressions(kiosk_id, impression_time);
   CREATE INDEX idx_ad_schedules_campaign ON ad_schedules(campaign_id);
   ```

3. Insert default settings:
   ```sql
   INSERT INTO system_settings (setting_key, setting_value)
   VALUES 
     ('ads_enabled', 'true'),
     ('ads_default_priority', '5'),
     ('ads_interstitial_interval', '3');
   ```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema creation
- [ ] TypeScript type definitions
- [ ] Basic API endpoints (advertisers, campaigns CRUD)
- [ ] Database migration script

### Phase 2: Core Functionality (Week 3-4)
- [ ] Ad selection algorithm
- [ ] Frequency capping logic
- [ ] Scheduling system
- [ ] Kiosk API modifications (merge ads with media)
- [ ] Impression tracking

### Phase 3: Admin Interface (Week 5-6)
- [ ] Advertiser management UI
- [ ] Campaign management UI
- [ ] Media upload for campaigns
- [ ] Schedule management UI
- [ ] Campaign approval workflow

### Phase 4: Analytics & Reporting (Week 7)
- [ ] Impression tracking API
- [ ] Revenue calculation
- [ ] Analytics dashboard
- [ ] Report generation

### Phase 5: Testing & Refinement (Week 8)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation

---

## Key Considerations

### 1. Performance
- **Caching**: Cache active campaigns and schedules
- **Database Queries**: Optimize impression queries with proper indexes
- **Playlist Generation**: Pre-calculate playlist, update periodically

### 2. Scalability
- **Multi-kiosk Support**: Track impressions per kiosk
- **High Volume**: Consider separate analytics database
- **Real-time Updates**: WebSocket for immediate ad changes

### 3. Business Rules
- **Ad Approval**: Require admin approval before going live
- **Content Moderation**: Review ads for appropriateness
- **Contract Management**: Track contract terms and billing

### 4. User Experience
- **Ad Frequency**: Balance revenue with user experience
- **Ad Length**: Consider maximum ad duration
- **Visual Indicators**: Clearly mark ads (if required by regulations)

### 5. Legal & Compliance
- **Privacy**: Track impressions without PII
- **Regulations**: Comply with advertising regulations
- **Terms of Service**: Advertiser agreements

---

## Revenue Potential Analysis

### Fixed Daily/Monthly Rate Model

#### Daily Rate Model
- **Example**: ₱500/day
- **Calculation**: Simple multiplication by number of days
- **1 Week**: ₱500 × 7 = ₱3,500
- **1 Month (30 days)**: ₱500 × 30 = ₱15,000
- **3 Months**: ₱500 × 90 = ₱45,000

#### Monthly Rate Model
- **Example**: ₱15,000/month (equivalent to ₱500/day)
- **Calculation**: Auto-calculated from daily rate × days in period
- **Pros**: 
  - Simple and predictable for advertisers
  - Easy to understand and quote
  - No complex tracking needed
  - Guaranteed revenue regardless of actual impressions
- **Cons**: 
  - Fixed cost regardless of actual display frequency
  - May need to adjust if frequency changes significantly

#### Frequency Configuration (Separate from Pricing)
- **Frequency is a display setting, not tied to cost**
- Admin controls how often ad appears:
  - **Interval-based**: "Show every 3rd video" (most common)
  - **Per Hour**: "Show 10 times per hour"
  - **Per Day**: "Show 50 times per day"
- **Priority System**: Higher priority ads show more frequently
- **Flexibility**: Can adjust frequency without changing price

### Pricing Examples

| Duration | Daily Rate | Total Cost | Frequency Example |
|----------|-----------|------------|-------------------|
| 1 Day | ₱500 | ₱500 | Every 5th video |
| 1 Week | ₱500 | ₱3,500 | Every 3rd video |
| 1 Month | ₱500 | ₱15,000 | Every 2nd video |
| 3 Months | ₱500 | ₱45,000 | Every 2nd video |

### Recommended Approach
- **Simple Fixed Daily Rate**: Start with ₱500/day as base rate
- **Tiered Pricing**: 
  - Standard: ₱500/day (every 5th video)
  - Premium: ₱750/day (every 3rd video)
  - Premium Plus: ₱1,000/day (every 2nd video)
- **Monthly Discounts**: Offer 5-10% discount for monthly commitments
- **Package Deals**: 
  - 1 month: ₱15,000
  - 3 months: ₱42,000 (₱14,000/month, 7% discount)
  - 6 months: ₱81,000 (₱13,500/month, 10% discount)

---

## Risk Assessment

### Technical Risks
- **Performance Impact**: Ad selection logic may slow down playlist generation
  - *Mitigation*: Cache results, optimize queries
- **Data Loss**: Impression tracking failures
  - *Mitigation*: Robust error handling, backup systems

### Business Risks
- **Ad Quality**: Poor ads may hurt user experience
  - *Mitigation*: Approval process, content guidelines
- **Revenue Dependency**: Over-reliance on ads
  - *Mitigation*: Diversify revenue streams

### Operational Risks
- **Advertiser Management**: Time-consuming
  - *Mitigation*: Self-service portal (future enhancement)

---

## Future Enhancements

### Phase 2 Features
1. **Self-Service Portal**: Advertisers create/manage campaigns
2. **Payment Integration**: Stripe/PayPal for payments
3. **Advanced Targeting**: Demographic, location-based
4. **A/B Testing**: Test different ad creatives
5. **Banner Ads**: Overlay banners on schedule display
6. **Interactive Ads**: Clickable ads with QR codes
7. **Mobile App**: Advertiser mobile app
8. **API for Advertisers**: REST API for campaign management

---

## Estimated Development Effort

### Development Time
- **Backend (API + Logic)**: 3-4 weeks
- **Frontend (Admin UI)**: 2-3 weeks
- **Analytics & Reporting**: 1-2 weeks
- **Testing & Refinement**: 1 week
- **Total**: 7-10 weeks

### Resources Needed
- 1 Full-stack developer
- 1 UI/UX designer (for admin interface)
- Database administrator (for optimization)
- QA tester

---

## Conclusion

The ads implementation requires significant additions to the current system but is feasible with the existing architecture. The modular design allows for incremental implementation, starting with basic ad display and gradually adding advanced features.

**Recommended Next Steps:**
1. Review and approve this analysis
2. Prioritize features for MVP (Minimum Viable Product)
3. Create detailed technical specifications
4. Begin Phase 1 implementation

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Author**: AI Analysis  
**Status**: Draft for Review

