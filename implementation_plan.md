# Implement All Remaining Features — Smart Connects

After a thorough audit of the entire codebase (backend routes, frontend pages, database schema), here is a comprehensive list of **missing features** and the plan to implement them all.

---

## Current State Summary

### ✅ Already Implemented
| Feature | Backend | Frontend |
|---|---|---|
| Auth (register, login, logout, email verify, password reset) | ✅ | ✅ |
| Communities CRUD (list, detail, create, edit, delete) | ✅ | ✅ |
| Events CRUD (list, detail, create, edit, delete) | ✅ | ✅ |
| RSVP system (attend/not attend/cancel) | ✅ | ✅ |
| Reviews (community + event) | ✅ | ✅ |
| Community membership (join/leave/check) | ✅ | ✅ |
| Organizer dashboard (overview, members, settings, events) | ✅ | ✅ |
| Organization dashboard (similar to organizer) | ✅ | ✅ |
| Admin dashboard (stats, users, applications, communities, activity, trash) | ✅ | ✅ |
| Announcements (CRUD for community) | ✅ | ✅ |
| Discussions (community threads) | ✅ | ✅ |
| AI Chatbot | ✅ | ✅ |
| Recommendations engine | ✅ | ✅ |
| Activity logging | ✅ | ✅ |
| Profile page (edit name, bio, interests) | ✅ | ✅ |
| My Communities page | ✅ | ✅ |
| My Events page | ✅ | ✅ |
| Onboarding flow | ✅ | ✅ |
| Apply to become organizer | ✅ | ✅ |
| Trash / Recycle bin (admin) | ✅ | ✅ |
| Community sponsors | ✅ (backend only) | ❌ |

---

## 🚀 Features to Implement

### Feature 1: CSV Download/Export System
> **Priority: HIGH** — You specifically requested this

Add CSV export functionality for organizers, organization managers, and admins.

#### [NEW] `backend/src/routes/exports.ts`
- `GET /api/exports/community/:id/members` — Download community members as CSV
- `GET /api/exports/community/:id/events` — Download community events list as CSV
- `GET /api/exports/event/:id/participants` — Download event attendees/RSVP list as CSV
- `GET /api/exports/admin/users` — Admin: download all users as CSV
- `GET /api/exports/admin/communities` — Admin: download all communities as CSV
- `GET /api/exports/admin/events` — Admin: download all events as CSV
- All endpoints require auth + ownership/admin check

#### [MODIFY] `backend/src/index.ts`
- Register the new exports router

#### [MODIFY] `frontend/app/organizer/page.tsx`
- Add "⬇ Download CSV" buttons on Members tab and Events tab

#### [MODIFY] `frontend/app/organization/page.tsx`
- Add "⬇ Download CSV" buttons on Members tab and Events tab

#### [MODIFY] `frontend/app/admin/page.tsx`
- Add "⬇ Download CSV" buttons on Users, Communities, and Events sections

---

### Feature 2: Event Participants/Attendees View for Organizers
> Organizers currently can't see who's attending their events

#### [MODIFY] `frontend/app/organizer/page.tsx`
- In the Events tab, add an expandable "View Attendees" section per event
- Show attendee list with name, email, phone, RSVP date
- Add "Download Attendees CSV" button per event

#### [MODIFY] `frontend/app/organization/page.tsx`
- Same attendee view in Events tab

---

### Feature 3: Member Roles Management (for Community Owners)
> Currently members have no role within a community (no moderator, admin, etc.)

#### [NEW] `backend/migration-v6.sql`
- Add `role` column to `community_members` table (default: 'member', options: 'member', 'moderator', 'admin')

#### [MODIFY] `backend/src/routes/communities.ts`
- Add `PUT /api/communities/:id/members/:userId/role` — Update member role within a community (owner only)
- Modify GET members endpoint to include community-level role

#### [MODIFY] `frontend/app/organizer/page.tsx`
- Show member role badges (Member/Moderator/Admin)
- Add role change dropdown for community owner

#### [MODIFY] `frontend/app/organization/page.tsx`
- Same role management UI

---

### Feature 4: Notification System (Frontend)
> DB table `notifications` exists, backend routes partially exist, but no frontend UI

#### [MODIFY] `backend/src/routes/engagement.ts` or [NEW] `backend/src/routes/notifications.ts`
- `GET /api/notifications` — Get current user's notifications
- `PUT /api/notifications/:id/read` — Mark as read
- `PUT /api/notifications/read-all` — Mark all as read
- `DELETE /api/notifications/:id` — Delete notification
- Auto-create notifications for: RSVP, new member joined, announcement posted, event created

#### [MODIFY] `frontend/app/components/Navbar.tsx`
- Make the notification bell functional: show unread count badge, dropdown with recent notifications

#### [NEW] `frontend/app/notifications/page.tsx`
- Full notifications page with mark as read, delete, filters

---

### Feature 5: Saved/Bookmarked Events
> DB table `saved_events` exists but has no backend routes or frontend UI

#### [MODIFY] `backend/src/routes/engagement.ts`
- `POST /api/engagement/saved-events/:eventId` — Save/bookmark an event
- `DELETE /api/engagement/saved-events/:eventId` — Unsave an event
- `GET /api/engagement/saved-events` — Get user's saved events
- `GET /api/engagement/saved-events/check/:eventId` — Check if event is saved

#### [MODIFY] `frontend/app/events/page.tsx` & `frontend/app/events/[id]/page.tsx`
- Add bookmark icon button on event cards and detail page

#### [NEW] `frontend/app/saved-events/page.tsx`
- Page showing all saved/bookmarked events

#### [MODIFY] `frontend/app/components/Navbar.tsx`
- Add "Saved Events" link in the navigation

---

### Feature 6: Community Sponsors Management (Frontend)
> Backend route exists (`GET /api/communities/:id/sponsors`) but no CRUD or frontend

#### [MODIFY] `backend/src/routes/communities.ts`
- `POST /api/communities/:id/sponsors` — Add sponsor (owner only)
- `PUT /api/communities/:id/sponsors/:sponsorId` — Update sponsor
- `DELETE /api/communities/:id/sponsors/:sponsorId` — Remove sponsor

#### [MODIFY] `frontend/app/organizer/page.tsx` & `frontend/app/organization/page.tsx`
- Add "Sponsors" tab with sponsor management UI (add/edit/remove sponsors with logo upload)

#### [MODIFY] `frontend/app/communities/[id]/page.tsx`
- Show sponsors section on community detail page

---

### Feature 7: Search System (Global Search)
> DESIGN.md defines a ⌘K global search modal, not yet implemented

#### [NEW] `backend/src/routes/search.ts`
- `GET /api/search?q=...` — Search across communities, events, and users

#### [MODIFY] `backend/src/index.ts`
- Register search router

#### [NEW] `frontend/app/components/SearchModal.tsx`
- ⌘K / Ctrl+K triggered search modal with results grouped by type (communities, events)
- Click result to navigate to detail page

#### [MODIFY] `frontend/app/components/Navbar.tsx`
- Wire the search shortcut button to open SearchModal

---

### Feature 8: Event Analytics for Organizers
> Organizers need analytics about their events

#### [MODIFY] `frontend/app/organizer/page.tsx`
- Add "📊 Analytics" tab or section in Overview
- Show: total attendees across all events, RSVP trends, most popular event, average rating

#### [MODIFY] `backend/src/routes/communities.ts` or [NEW] analytics endpoint
- `GET /api/communities/:id/analytics` — Return aggregated stats for community owner

---

### Feature 9: Event Check-in System
> For physical events, organizers need to check in attendees

#### [NEW] `backend/migration-v7.sql`
- Add `checked_in` boolean and `checked_in_at` timestamp to `rsvps` table

#### [MODIFY] `backend/src/routes/engagement.ts`
- `PUT /api/engagement/rsvp/checkin` — Mark attendee as checked in
- Modify event RSVPs endpoint to include check-in status

#### [NEW] `frontend/app/events/[id]/checkin/page.tsx`
- Check-in page for event organizers: list attendees with check-in toggle
- Search bar to quickly find attendees

---

### Feature 10: Share Events/Communities (Social Sharing)
> SharePopup component exists but may not be fully wired

#### [MODIFY] `frontend/app/events/[id]/page.tsx`
- Ensure share button opens SharePopup with event URL

#### [MODIFY] `frontend/app/communities/[id]/page.tsx`  
- Ensure share button opens SharePopup with community URL

---

## Open Questions

> [!IMPORTANT]
> **Scope confirmation**: This is a large set of features. Do you want me to implement ALL of them in this session, or should I prioritize specific ones?

> [!IMPORTANT]
> **Member roles**: Should community-level roles (moderator/admin) have special permissions (e.g., moderators can manage announcements), or is it just a label for now?

> [!IMPORTANT]
> **Check-in system**: Do you want QR code-based check-in, or a simple manual toggle is sufficient?

---

## Proposed Implementation Order

1. **CSV Export System** (Feature 1) — Backend + all 3 dashboards ← *You explicitly requested this*
2. **Event Participants View** (Feature 2) — Goes with CSV
3. **Member Roles** (Feature 3) — Schema change + UI
4. **Saved Events** (Feature 5) — Quick win, DB table already exists
5. **Notifications** (Feature 4) — DB table exists, needs routes + frontend
6. **Global Search** (Feature 7) — Design already defined
7. **Sponsors Management** (Feature 6) — Backend partially exists
8. **Event Analytics** (Feature 8) — Dashboard enhancement
9. **Event Check-in** (Feature 9) — New feature
10. **Social Sharing** (Feature 10) — Polish existing component

---

## Verification Plan

### Automated Tests
- `npx tsc --noEmit` on the backend to check TypeScript compilation
- Manual API testing via browser/curl for each new endpoint

### Manual Verification
- Verify CSV downloads contain correct data with proper headers
- Test organizer dashboard with export buttons
- Test admin dashboard with export buttons
- Verify notification bell shows unread count
- Verify saved events bookmark toggle works
- Test global search returns relevant results
