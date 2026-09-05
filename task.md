# Task Tracker — Smart Connects Features

## Feature 1: CSV Export System
- `[ ]` Create `backend/src/routes/exports.ts` with all CSV endpoints
- `[ ]` Register exports router in `backend/src/index.ts`
- `[ ]` Add CSV download buttons to Organizer dashboard
- `[ ]` Add CSV download buttons to Organization dashboard
- `[ ]` Add CSV download buttons to Admin dashboard

## Feature 2: Event Participants View
- `[ ]` Add attendee list view in Organizer Events tab
- `[ ]` Add attendee list view in Organization Events tab

## Feature 3: Member Roles
- `[ ]` Create `backend/migration-v6.sql` (add role to community_members)
- `[ ]` Add role update endpoint to communities routes
- `[ ]` Update members GET to include role
- `[ ]` Add role badges & dropdown in Organizer dashboard
- `[ ]` Add role badges & dropdown in Organization dashboard

## Feature 4: Notifications
- `[x]` Create `backend/src/routes/notifications.ts`
- `[x]` Register notifications router
- `[x]` Make Navbar bell functional with dropdown
- `[x]` Create notifications page (`/notifications` — full history with filters, pagination, mark-read, delete)
- `[x]` In-app notification + email on community join (both join endpoints)
- `[x]` In-app notification on RSVP confirmation, approval, rejection
- `[x]` In-app notification on membership application approve/reject
- `[x]` New preference types: community_joined, rsvp_*, membership_* (migration-v15.sql)
- `[x]` Profile page toggles for all new preference types

## Feature 5: Saved Events
- `[ ]` Add saved events endpoints to engagement routes
- `[ ]` Add bookmark button on event cards/detail
- `[ ]` Create saved events page
- `[ ]` Add nav link

## Feature 6: Sponsors Management
- `[ ]` Add sponsor CRUD endpoints
- `[ ]` Add Sponsors tab in Organizer/Organization dashboards
- `[ ]` Show sponsors on community detail page

## Feature 7: Global Search
- `[ ]` Create `backend/src/routes/search.ts`
- `[ ]` Register search router
- `[ ]` Create SearchModal component
- `[ ]` Wire Navbar search button

## Feature 8: Event Analytics
- `[ ]` Add analytics endpoint
- `[ ]` Add analytics section in Organizer dashboard

## Feature 9: Event Check-in
- `[ ]` Create `backend/migration-v7.sql`
- `[ ]` Add check-in endpoints
- `[ ]` Create check-in page

## Feature 10: Social Sharing
- `[ ]` Verify SharePopup is wired on event/community detail pages
