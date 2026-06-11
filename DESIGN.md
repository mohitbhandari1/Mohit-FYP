# Smart Connects — DESIGN.md

> **Google Stitch – AI-Native Design System**
> Dark theme · Cyan/Teal accent palette · Glassmorphic cards · Advanced modern UI

---

## 1. Design Tokens

### Brand Colors (from Smart Connects Logo)

```yaml
colors:
  primary:
    50:  "#ecfeff"
    100: "#cffafe"
    200: "#a5f3fc"
    300: "#67e8f9"
    400: "#22d3ee"
    500: "#06b6d4"   # -- primary brand
    600: "#0891b2"
    700: "#0e7490"
    800: "#155e75"
    900: "#164e63"
    950: "#083344"
  surface:
    50:  "#f8fafc"
    100: "#f1f5f9"
    200: "#e2e8f0"
    300: "#cbd5e1"
    400: "#94a3b8"
    500: "#64748b"
    600: "#475569"
    700: "#334155"
    800: "#1e293b"
    900: "#0f172a"
    950: "#020617"   # -- app background
  accent:
    cyan:  "#22d3ee"
    teal:  "#14b8a6"
    emerald: "#10b981"
    amber: "#f59e0b"
    rose:  "#f43f5e"
    red:   "#ef4444"
```

### Gradients

```yaml
gradients:
  hero:          "linear-gradient(135deg, #020617 0%, #0f172a 50%, #083344 100%)"
  card:          "linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.95) 100%)"
  accent-glow:   "linear-gradient(135deg, #06b6d4 0%, #14b8a6 50%, #10b981 100%)"
  sidebar:       "linear-gradient(180deg, #0f172a 0%, #020617 100%)"
  button-cyan:   "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
  button-hover:  "linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)"
  danger:        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
  glass:         "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)"
```

### Typography

```yaml
typography:
  font-family: "'Inter', 'ui-sans-serif', 'system-ui', sans-serif"
  display:
    size: "4.5rem"   # 72px
    weight: 700
    tracking: "-0.02em"
    line-height: 1.1
  heading-1:
    size: "2.25rem"  # 36px
    weight: 600
    tracking: "-0.015em"
  heading-2:
    size: "1.5rem"   # 24px
    weight: 600
  heading-3:
    size: "1.125rem" # 18px
    weight: 600
  body:
    size: "0.9375rem" # 15px
    weight: 400
    line-height: 1.6
  small:
    size: "0.8125rem" # 13px
    weight: 400
  caption:
    size: "0.75rem"   # 12px
    weight: 400
  mono:
    font-family: "'JetBrains Mono', 'Fira Code', monospace"
```

### Shadows & Glows

```yaml
shadows:
  sm:   "0 1px 2px rgba(0,0,0,0.3)"
  md:   "0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)"
  lg:   "0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.4)"
  xl:   "0 20px 25px -5px rgba(0,0,0,0.6), 0 8px 10px -6px rgba(0,0,0,0.4)"
  glow-cyan:   "0 0 20px rgba(6,182,212,0.15), 0 0 40px rgba(6,182,212,0.05)"
  glow-red:    "0 0 20px rgba(239,68,68,0.15)"
  glow-amber:  "0 0 20px rgba(245,158,11,0.15)"
  inset-cyan:  "inset 0 1px 0 rgba(34,211,238,0.1)"
```

### Border Radius

```yaml
border-radius:
  sm:     "0.375rem"    # 6px
  md:     "0.5rem"      # 8px
  lg:     "0.75rem"     # 12px
  xl:     "1rem"        # 16px
  2xl:    "1.5rem"      # 24px
  3xl:    "2rem"        # 32px
  full:   "9999px"
```

### Animation Tokens

```yaml
animations:
  default-transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
  spring:             "cubic-bezier(0.34, 1.56, 0.64, 1)"
  glow-pulse:         "pulse 3s ease-in-out infinite"
  float:              "float 6s ease-in-out infinite"
  slide-up:           "slideUp 0.3s ease-out"
  slide-in-right:     "slideInRight 0.25s ease-out"
  fade-in:            "fadeIn 0.2s ease-out"
  scale-in:           "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
```

### Glass Effect Pattern

```yaml
glass:
  card:        "bg-white/[0.02] border border-white/5 backdrop-blur-xl"
  card-hover:  "hover:bg-white/[0.04] hover:border-cyan-500/30"
  card-active: "bg-white/[0.03] border-cyan-500/20"
  surface:     "bg-white/[0.02]"
  divider:     "border-white/5"
```

All UI surfaces use `bg-slate-950` body with glass-layered cards creating depth hierarchy. Apply `glass.card` to containers, `glass.surface` to nested sections.

---

## 2. Layout Grid

```yaml
layout:
  page-max-width: "1280px"     # max-w-7xl
  section-x-padding: "1.5rem"  # px-6, sm:px-8
  section-y-padding: "4rem"    # py-16
  grid-gap: "1rem"             # gap-4
  content-grid: "max-w-6xl"
```

---

## 3. Component Prompts

---

### 3.1 Sidebar Navigation Panel

> **File:** `components/Sidebar.tsx`

```
DESIGN SIDEBAR:
- Fixed left sidebar, w-64 (256px), full viewport height
- Background: gradient sidebar (from slate-900 at top, to slate-950 at bottom)
- Right border: 1px solid rgba(51,65,85,0.6) — subtle slate-700/60
- Top section: app logo "Smart Connects" in text-white font-semibold text-lg, with a cyan-400 dot icon beside it
- Below logo: divider line (border-slate-800)
- Navigation items grouped under labels in uppercase text-[10px] tracking-widest text-slate-500
- Each nav item: flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm
  - Default: text-slate-300, hover: bg-white/5 hover:text-white, transition
  - Active: bg-cyan-500/10 text-cyan-400, left border 2px solid cyan-400 (pseudo-element)
- Icons: outline heroicons, w-5 h-5
- Sections:
  * DISCOVER: 🏠 Home, 🔍 Communities, 📅 Events
  * MY SPACE: 👤 My Communities, 📋 My Events, 🎯 Organizer
  * ACCOUNT: 👥 Profile, 🚪 Sign out (red-400)
- Bottom: a glass card (bg-white/5 rounded-xl p-4 border border-white/5) with "AI Assistant" text and a chatbot icon, clicking opens the Chatbot
- If sidebar collapse needed: a toggle button at top-right of sidebar with chevron-left icon, collapsed state = w-16, showing only icons
- Scroll: overflow-y-auto, thin scrollbar (styled with slate-700 thumb)
- Mobile: sidebar hidden by default, hamburger in navbar toggles it. Fixed inset-0 bg-black/60 z-40 backdrop. Sidebar slides in from left (translate-x-0 / -translate-x-full transition).
```

---

### 3.2 Navbar / Top Navigation

> **File:** `components/Navbar.tsx`

```
DESIGN NAVBAR:
- Fixed top bar, h-16 (64px), full width
- Background: slate-950/80 backdrop-blur-xl, border-b border-slate-800/60
- Display when sidebar is collapsed: flex items-center justify-between px-6
- Left: hamburger menu button (to toggle sidebar) — rounded-lg p-2 hover:bg-white/5 text-slate-400
  Then: breadcrumb or page title in text-white font-semibold text-lg
- Right side (flex items-center gap-3):
  * Notification bell icon button: relative, with red dot badge (w-2 h-2 bg-red-500 rounded-full absolute top-1 right-1)
  * Search shortcut button: rounded-lg border border-slate-700/50 px-3 py-1.5 text-xs text-slate-500 flex items-center gap-2 bg-white/[0.02], hover:bg-white/5
  * User avatar: w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500, flex items-center justify-center text-xs font-bold text-white
  * Dropdown on avatar click: absolute top-full right-0 mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/50, with user info at top, then divider, then menu items
- If no sidebar: logo "Smart Connects" on left, nav links in center, auth buttons on right (same as current)
- Mobile (sidebar hidden): show hamburger + logo only on left, no nav links
```

---

### 3.3 Landing / Home Page (Hero Section)

> **File:** `pages/index.tsx`

```
PROMPT LANDING-HERO:
- Full-width hero section, min-h-[calc(100vh-4rem)]
- Background: deep space gradient (slate-950 at top, blue-950 at bottom)
- Subtle animated grid pattern overlay: repeating linear gradient at 1px width, opacity 0.03
- Floating glowing orbs: 3 blurred circles (cyan-400/10, teal-400/10, emerald-400/10) at random positions, animate float
- Layout: max-w-7xl mx-auto grid lg:grid-cols-[1.3fr_0.9fr] gap-12 items-center
- Left column:
  * Badge pill: "Community discovery made simple" — bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider
  * Heading: text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]
    - Gradient text on "Smart Connects" — bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent
  * Subtitle: text-lg text-slate-400 max-w-xl leading-relaxed mt-6
  * CTA buttons flex gap-4 mt-10:
    - Primary: "Browse Communities" — gradient accent button with glow-cyan, rounded-full px-8 py-3.5 text-sm font-semibold text-white, hover:shadow-glow-cyan hover:scale-[1.02] transition-all
    - Secondary: "View Events" — border border-slate-700/60 rounded-full px-8 py-3.5 text-sm font-semibold text-slate-200, hover:border-cyan-500/50 hover:text-white bg-white/[0.02]
  * Animated stat row: 3 stats with labels (e.g. "1,200+ Members", "45 Communities", "200 Events") in text-2xl font-bold text-white, label in text-xs text-slate-500 uppercase tracking-wide
- Right column:
  * Glass card: rounded-3xl border border-white/5 bg-gradient-glass p-8 backdrop-blur-xl shadow-2xl
  * Card header: "Platform Overview" text-xl font-semibold text-white, with a cyan glow dot
  * Feature cards grid gap-4, each:
    - Rounded-2xl border border-white/[0.04] bg-white/[0.03] p-5 hover:bg-white/[0.06] hover:border-cyan-500/20 transition-all duration-300
    - Icon: w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center, icon in cyan-400
    - Title: text-white font-semibold text-sm
    - Description: text-slate-400 text-xs mt-1.5
```

---

### 3.4 Landing — Upcoming Events Section

```
PROMPT LANDING-EVENTS:
- Section after hero, max-w-7xl mx-auto px-6 pb-16
- Glass container: rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm
- Header row: flex items-center justify-between
  * Title: "📅 Upcoming Events" text-2xl font-semibold text-white
  * "View all →" link: text-sm text-cyan-400 hover:text-cyan-300, with arrow transition translate on hover
- Grid: 3 columns md:grid-cols-3 gap-4 mt-6
- Each event card:
  * Rounded-xl border border-white/5 bg-white/[0.02] p-5 group hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5
  * Title: font-semibold text-white group-hover:text-cyan-300 transition
  * Description: text-xs text-slate-500 line-clamp-2 mt-2
  * Tags row: flex gap-2 mt-3
    - Date tag: bg-slate-800/60 text-slate-300 rounded-full px-2.5 py-0.5 text-xs
    - Location tag: same style
  * Community name: text-xs text-cyan-400 mt-2
  * Hover glow effect: shadow-glow-cyan on hover
- Empty state: centered content with ghost icon and "No upcoming events" text
```

---

### 3.5 Landing — Featured Communities / Recommendations Section

```
PROMPT LANDING-COMMUNITIES:
- Section after events, same container style
- Header: flex justify-between items-center
  * Title: "🏆 Featured Communities" or "✨ Recommended for You"
  * If authenticated: "Based on your interests: [tags]" in text-sm text-slate-400
  * Link: "Browse all →" text-sm text-cyan-400
- Grid: 2 columns md:grid-cols-2 gap-4 mt-6
- Each community card:
  * Rounded-xl border border-white/5 bg-white/[0.02] p-6 group hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all duration-300 hover:shadow-glow-cyan
  * Header: flex items-start justify-between
    - Title: text-lg font-semibold text-white group-hover:text-cyan-300
    - Category tag: rounded-full bg-slate-800/60 px-2.5 py-0.5 text-xs text-slate-300
  * Description: text-sm text-slate-400 line-clamp-2 mt-2
  * Footer: flex items-center gap-3 text-xs text-slate-500 mt-4
    - Cyan dot ● with "X members" text
    - Match score badge (if recommended): bg-cyan-500/10 text-cyan-300 rounded-full px-2 py-0.5 text-[10px] font-medium
- Loading state: skeleton cards with animate-pulse
- Empty state: ghost illustration + CTA to create or browse
```

---

### 3.6 Login Page

> **File:** `pages/login.tsx`

```
PROMPT LOGIN:
- Full page: min-h-screen bg-slate-950, centered content
- Background: subtle radial gradient overlay (cyan-500/5 at center)
- Center card: max-w-md w-full mx-auto px-6 py-16
  * Glass card: rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm shadow-2xl
  * Logo at top: "Smart Connects" text-white text-2xl font-bold, centered, with cyan dot
  * Title: "Welcome back" text-3xl font-semibold text-white text-center
  * Subtitle: "Sign in to your account" text-slate-400 text-sm text-center mt-2
  * Error alert (conditional): rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-300 text-sm flex items-center gap-3
    - Alert icon (triangle-exclamation)
  * Form: space-y-5 mt-8
    - Each field group: label (text-sm font-medium text-slate-300) + input
    - Input: w-full rounded-xl border border-slate-700/60 bg-white/[0.03] px-4 py-3 text-white placeholder:text-slate-600
      focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition
      with left icon (envelope for email, lock for password) inside input
    - Password: show/hide toggle button (eye icon)
    - "Forgot password?" link: text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-block
  * Submit button: w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold py-3
    hover:shadow-glow-cyan hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50
  * Divider: "or continue with" — flex with lines (border-slate-700) on sides and text-xs text-slate-500 in center
  * Social buttons: 2 outlined buttons (Google, GitHub) with icons
  * Footer: "Don't have an account?" text-sm text-slate-400 text-center mt-8 + "Sign up" link in cyan-400
```

---

### 3.7 Register Page

> **File:** `pages/register.tsx`

```
PROMPT REGISTER:
- Same layout as Login, with background gradient
- Card max-w-md, glass effect
- Title: "Create your account" text-3xl font-semibold text-white
- Subtitle: "Join the Smart Connects community" text-slate-400
- Form fields (space-y-4):
  * Full Name — with user icon
  * Email — with envelope icon
  * Password — with lock icon, strength indicator bar below
    - Strength bar: 4 segments, colors (red-500, amber-500, cyan-400, emerald-400)
    - Text hint: "Use 8+ chars with a number & symbol" in text-xs text-slate-500
  * Confirm Password — with lock icon, match indicator (checkmark or X)
  * Interests — tag input with pills, type and press Enter to add
    - Existing tags as pills: rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-3 py-1 text-xs flex items-center gap-1.5
    - Each pill has × button to remove
    - Placeholder: "Type an interest and press Enter"
  * Terms checkbox: flex items-start gap-3
    - Checkbox: styled checkbox with cyan-500 accent, rounded
    - Text: "I agree to the Terms of Service and Privacy Policy" text-xs text-slate-400
- Submit: "Create Account" button — gradient cyan-to-teal, full width, with loading spinner
- On success: auto-redirect to home with a success toast
- Footer: "Already have an account?" + "Sign in" link
```

---

### 3.8 Profile Page

> **File:** `pages/profile.tsx`

```
PROMPT PROFILE:
- Authenticated page, max-w-3xl mx-auto px-6 py-16
- Glass card container: rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm
- Header: flex items-start justify-between
  * Left: Avatar (w-16 h-16 rounded-full gradient cyan-to-teal flex items-center justify-center text-2xl font-bold text-white)
    + Name text-3xl font-semibold text-white + Email text-sm text-slate-400 mt-1
  * Right: Logout button — border border-red-500/30 text-red-400 rounded-xl px-4 py-2 text-sm hover:bg-red-500/10 transition
- Edit form (space-y-6 mt-8):
  * Name field: label + input (standard dark input style)
  * Bio field: label + textarea (4 rows, same dark style)
  * Interests field: label + tag input (same as register, show current interests as pills)
  * Save button: gradient cyan rounded-xl px-8 py-2.5 font-semibold text-white hover:shadow-glow-cyan
    With loading state: spinner + "Saving..."
  * Success indicator: checkmark animation on save
- Account info section: border-t border-slate-800 pt-8 mt-8
  * Title: "Account Information" text-xl font-semibold text-white
  * Info grid: 2 columns, each item has label (text-xs text-slate-500 uppercase tracking-wider) + value (text-sm text-slate-200)
  * Fields: Role, Member Since, Admin status
- Danger zone: border border-red-500/20 rounded-2xl p-6 mt-8 bg-red-500/[0.02]
  * Title: "Danger Zone" text-red-400 font-semibold
  * Description: text-xs text-red-300/70 mt-1
  * "Delete Account" button: border border-red-500/30 text-red-400 rounded-xl px-6 py-2 text-sm hover:bg-red-500/10
```

---

### 3.9 Communities List Page

> **File:** `pages/communities.tsx`

```
PROMPT COMMUNITIES-LIST:
- max-w-7xl mx-auto px-6 py-16
- Glass container: rounded-3xl border border-white/5 bg-white/[0.02] p-8
- Header: flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
  * Title: "Communities" text-4xl font-semibold text-white
  * Subtitle: "Discover and join communities that match your interests" text-sm text-slate-400
  * Create button (if authenticated): gradient cyan rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:shadow-glow-cyan
- Search & Filter bar: flex gap-3 mt-6
  * Search input: flex-1 rounded-xl border border-slate-700/60 bg-white/[0.03] px-4 py-2.5 text-white placeholder:text-slate-600
    focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition
    Left: search icon (magnifying glass) in text-slate-500
    Right: clear button (×) when has value
  * Category dropdown: rounded-xl border border-slate-700/60 bg-slate-900 px-4 py-2.5 text-slate-300 focus:border-cyan-500
    Custom styled select with chevron-down icon
  * Sort dropdown (optional): "Most Popular", "Newest", "Name A-Z"
- Results grid: 2 columns md:grid-cols-2 gap-4 mt-6
- Each community card:
  * Rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all duration-300
  * Title: text-xl font-semibold text-white
  * Description: text-sm text-slate-400 line-clamp-3 mt-3
  * Tags row: category pill + member count + website link (if any) in text-xs text-slate-500 mt-4
  * Action row: flex gap-2 mt-5
    - "View Details" button: flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-semibold py-2.5 hover:shadow-glow-cyan
    - "Join" button (if not member): flex-1 rounded-xl border border-cyan-500/50 text-cyan-400 py-2.5 text-sm font-semibold hover:bg-cyan-500/10
    - "Joined" badge (if member): flex-1 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5
- Empty state: ghost illustration with "No communities found" message + "Try adjusting your filters" or "Create the first community" CTA
- Loading state: 4 skeleton cards with animate-pulse
```

---

### 3.10 Community Detail Page

> **File:** `pages/communities/[id].tsx`

```
PROMPT COMMUNITY-DETAIL:
- max-w-7xl mx-auto px-6 py-16
- Breadcrumb: "← Back to Communities" link in text-sm text-cyan-400 hover:text-cyan-300 mb-6
- Glass card container: rounded-3xl border border-white/5 bg-white/[0.02] p-8
- Header section: flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4
  * Community identity:
    - Icon/avatar: w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl font-bold text-cyan-400
    - Name: text-4xl font-semibold text-white
    - Tags row: category pill (bg-slate-800/60 rounded-full px-3 py-1 text-xs text-slate-300) + members count with cyan dot
    - Owner: "Created by @username" text-xs text-slate-500 mt-1
  * Action buttons:
    - "Join Community" — gradient cyan rounded-full px-6 py-2.5 text-sm font-semibold text-white hover:shadow-glow-cyan
    - "✓ Member" — if already joined, emerald-500 border pill with checkmark
    - "Edit" — if owner, border-cyan-500/30 text-cyan-400 rounded-full px-5 py-2.5
    - "Share" — border border-slate-700 rounded-full p-2.5 with share icon
- Content tabs or sections (space-y-6 mt-8):
  * "About" section: rounded-2xl border border-white/5 bg-white/[0.02] p-6
    - Title: "About this community" text-xl font-semibold text-white with info icon
    - Description: text-slate-300 leading-relaxed
    - Website link: styled as external link with arrow icon
    - Stats mini-grid: 4 stat items (Members, Events Held, Created Date, Category)
  * "Upcoming Events" section:
    - Title with event count badge
    - Each event in a compact card: title, date (formatted), location, community link
    - "No upcoming events" empty state with "Create Event" CTA for owner
  * "Reviews" section:
    - Title + "Add Review" button (if authenticated, gradient cyan rounded-lg px-4 py-2 text-sm)
    - Review form (expandable): rating stars (5 clickable stars, yellow-400 filled, slate-600 empty) + comment textarea + submit
    - Each review: user avatar circle, name, date, star rating, comment text
    - "No reviews yet" empty state
  * "Members" section: grid of member avatars (overlapping circles), count, "View All" link
- Loading: full skeleton page
- Error: 404 state with "Community not found" and "Back to Communities" link
```

---

### 3.11 Create / Edit Community Page

> **File:** `pages/communities/[id]/edit.tsx` + `Organizer page form`

```
PROMPT COMMUNITY-FORM:
- max-w-2xl mx-auto px-6 py-16
- Back link: "← Back" in cyan-400
- Glass card: rounded-3xl border border-white/5 bg-white/[0.02] p-8
- Title: "Create Community" or "Edit Community" text-3xl font-semibold text-white
- Form space-y-6 mt-8:
  * Image upload (optional): drop zone area — dashed border border-slate-700/60 rounded-2xl p-8 text-center
    - Upload icon (cloud-arrow-up) in text-slate-500
    - "Drag & drop or click to upload" text-sm text-slate-400
    - "PNG, JPG up to 2MB" text-xs text-slate-600
    - Preview: rounded-2xl w-full h-40 object-cover
  * Field: Name — label + input (standard dark style)
  * Field: Description — label + textarea (4 rows, standard dark style)
    - Character count: "X/500" text-xs text-slate-500 text-right
  * Field: Category — label + input with autocomplete suggestions dropdown
    - Suggestions: "Technology", "Sports", "Music", "Art", "Education", "Business" as pills below input
  * Field: Website — label + input with url icon
- Action buttons row: flex gap-4
  * Save / Create: gradient cyan rounded-xl flex-1 py-3 text-white font-semibold hover:shadow-glow-cyan
  * Delete (edit mode): border border-red-500/30 text-red-400 rounded-xl px-6 py-3 hover:bg-red-500/10
    - Confirmation modal on click: "Are you sure?" dialog with glass effect
- Loading/spinner states on submit
```

---

### 3.12 Events List Page

> **File:** `pages/events.tsx`

```
PROMPT EVENTS-LIST:
- Same layout structure as Communities list
- Glass container, header with "Events" title + "Create Event" button (if authenticated)
- Filter bar: Search + Date filter (Today, This Week, This Month, All) as segmented buttons
  * Segmented control: flex bg-white/[0.03] rounded-xl p-1 border border-white/5
    - Each option: px-4 py-1.5 text-xs rounded-lg transition
    - Active: bg-cyan-500/20 text-cyan-300
    - Inactive: text-slate-400 hover:text-slate-200
- Grid: 2 columns gap-4 mt-6
- Each event card:
  * Rounded-2xl border border-white/5 bg-white/[0.02] p-6 group hover:border-cyan-500/30 transition
  * Left color strip: 3px solid gradient cyan-to-teal on left border
  * Title: text-xl font-semibold text-white group-hover:text-cyan-300
  * Description: text-sm text-slate-400 line-clamp-2 mt-2
  * Date & Location row: flex gap-3 text-xs text-slate-400 mt-3
    - Date pill: bg-slate-800/60 rounded-full px-3 py-1 with calendar icon
    - Location pill: same with map-pin icon
  * Community link: text-xs text-cyan-400 hover:text-cyan-300 "by Community Name"
  * RSVP button group (if authenticated):
    - "Attending" — filled cyan when selected, outlined when not (border-slate-700)
    - "Not Attending" — filled red when selected, outlined when not
    - Both: rounded-lg py-2 text-xs font-semibold flex-1 transition
  * Attendee count: text-xs text-slate-500 flex items-center gap-1 with users icon
- Empty state: "No events available" with illustration
```

---

### 3.13 Event Detail Page

> **File:** `pages/events/[id].tsx`

```
PROMPT EVENT-DETAIL:
- max-w-5xl mx-auto px-6 py-16
- Breadcrumb: "← Back to Events" in cyan-400
- Glass card container: rounded-3xl border border-white/5 bg-white/[0.02] p-8
- Header: flex flex-col sm:flex-row justify-between gap-4
  * Title block: "Hosted by [Community]" text-xs text-slate-400 above event title
    - Title: text-4xl font-semibold text-white
  * Action buttons: Edit (if owner, cyan-border), Share (border-slate-700 with icon)
- Event info cards grid: grid-cols-2 md:grid-cols-4 gap-4 mt-8
  * Each info card: rounded-xl border border-white/5 bg-white/[0.02] p-4
    - Label: text-xs text-slate-500 uppercase tracking-wider
    - Value: text-white font-medium text-sm
    - Icon at top: text-cyan-400
  * Cards: Date, Time, Location, Attendees
- "About this event" section: whitespace-pre-wrap description in text-slate-300
- RSVP section (if authenticated):
  * Glass sub-card: rounded-2xl border border-white/5 p-6 bg-white/[0.02]
  * Title: "Your RSVP" text-lg font-semibold
  * Two action buttons:
    - "✓ Attending" — gradient cyan, filled when selected, with checkmark
    - "✗ Not Attending" — gradient red, filled when selected, with X
  * Both: rounded-xl py-3 text-sm font-semibold flex-1 transition-all
- Reviews section: same as community detail reviews
```

---

### 3.14 Create / Edit Event Page

> **File:** `pages/events/create.tsx` + `pages/events/[id]/edit.tsx`

```
PROMPT EVENT-FORM:
- max-w-2xl mx-auto px-6 py-16
- Back link, glass card, "Create Event" / "Edit Event" title
- Form space-y-6:
  * Community selector (create only): styled select with all owned communities
  * Event Title — input
  * Description — textarea with character count
  * Date & Time — datetime-local picker with custom styling (dark theme, cyan accent)
    - Styled as rounded-xl border border-slate-700/60 bg-white/[0.03] w-full py-3 px-4 text-white
    - Calendar icon inside
  * Location — input with map-pin icon, "Online" toggle checkbox
    - If toggled, disable input and show "Online" badge
  * Cover image upload (optional) — same as community form drop zone
- Buttons: Save (gradient cyan) + Delete (edit mode, red border) with confirmation modal
- If no communities owned: info message "Create a community first" with link to Organizer page
```

---

### 3.15 My Communities Page

> **File:** `pages/my-communities.tsx`

```
PROMPT MY-COMMUNITIES:
- Authenticated page, max-w-7xl mx-auto px-6 py-16
- Glass card container: rounded-3xl border border-white/5 bg-white/[0.02] p-8
- Header: flex justify-between items-center
  * Title: "My Communities" text-3xl font-semibold text-white
  * Subtitle: "Communities you've joined" text-sm text-slate-400
  * Link: "Browse all →" in cyan-400
- Grid: 2 columns gap-4 mt-8
- Each card:
  * Rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-cyan-500/30 transition group
  * Gradient left accent strip
  * Name + Category tag
  * Description line-clamp-2
  * Tags: category pill + "Joined" badge (emerald-500/10 text-emerald-400) + join date
  * "View" button: gradient cyan rounded-lg text-sm py-2
- Empty state: "You haven't joined any communities" with ghost icon + "Browse Communities" CTA button
```

---

### 3.16 My Events Page

> **File:** `pages/my-events.tsx`

```
PROMPT MY-EVENTS:
- Authenticated page, similar layout
- Two sections with tabs or headers:
  * "Events I'm Attending" (green accent underline)
    - Grid of cards with "Attending" badge (emerald-500/10)
  * "Events I'm Not Attending" (red accent underline)
    - Grid of cards with "Not Attending" badge (red-500/10)
- Each card: event title, date, community name, status badge
- Section empty states with appropriate messaging
```

---

### 3.17 Organizer Dashboard

> **File:** `pages/organizer.tsx`

```
PROMPT ORGANIZER-DASHBOARD:
- Authenticated page, max-w-7xl mx-auto px-6 py-16
- Glass card container: rounded-3xl border border-white/5 bg-white/[0.02] p-8
- Header: flex justify-between items-center
  * Title: "Organizer Dashboard" text-3xl font-semibold text-white
  * "Create Community" button — gradient cyan rounded-xl px-5 py-2.5 text-sm font-semibold hover:shadow-glow-cyan
    Toggles inline creation form
- Create Community form (expandable):
  * Sub-card with rounded-2xl border border-white/5 bg-white/[0.03] p-6 mt-6
  * Fields: Name, Description, Category, Website (all standard dark inputs)
  * "Create" button — gradient cyan w-full
- "Your Communities" list:
  * Title: "Your Communities" text-2xl font-semibold text-white mt-10
  * Each community: linked card with name, description, category, member count
    - Actions: "Manage Events" button, "Edit" link
  * Empty state: "No communities yet" with CTA
  * Stats row: total communities count, total members, total events
- Quick stats mini-dashboard at top (if data available):
  * 3 stat cards in a row: total communities, total members across all, total events
  * Each: rounded-xl border border-white/5 bg-white/[0.02] p-5
    - Icon + label + value in text-2xl font-bold text-cyan-400
```

---

### 3.18 Admin Dashboard

> **File:** `pages/admin.tsx`

```
PROMPT ADMIN-DASHBOARD:
- Admin-only page, max-w-7xl mx-auto px-6 py-16
- Title: "Admin Dashboard" text-4xl font-semibold text-white
- Stats grid: 3 columns md:grid-cols-3 gap-4 mt-8
  * Each stat: rounded-xl border border-white/5 bg-white/[0.02] p-6
    - Icon at top (users icon, building icon, calendar icon) in cyan-400
    - Label: text-xs text-slate-500 uppercase tracking-wider
    - Value: text-3xl font-bold text-white
    - Mini sparkline chart (optional decorative element)
- Users table: rounded-3xl border border-white/5 bg-white/[0.02] p-8 mt-8
  * Title: "Users" text-2xl font-semibold text-white
  * Table: w-full text-sm
    - Header row: border-b border-slate-700/60, text-slate-400 text-xs uppercase tracking-wider
    - Columns: Name, Email, Role, Status, Joined, Actions
    - Each row: border-b border-slate-800/40 hover:bg-white/[0.02] transition
    - Role cell: styled pill (bg-slate-800 text-slate-300 rounded-full px-3 py-0.5 text-xs)
    - Actions: Delete button (text-red-400 hover:text-red-300)
    - Pagination: page numbers at bottom
- Empty/error states handled
```

---

### 3.19 Chatbot (Floating Widget)

> **File:** `components/Chatbot.tsx`

```
PROMPT CHATBOT:
- Floating action button: fixed bottom-6 right-6 z-50
  * w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500
  * shadow-lg shadow-cyan-500/20 hover:shadow-glow-cyan
  * hover:scale-110 active:scale-95 transition-all
  * Icon: chat bubble (when closed) / × (when open)
  * Pulse animation: subtle ring effect on idle
- Chat panel (open state):
  * fixed bottom-24 right-6 z-50 w-80 sm:w-96
  * rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl
  * shadow-2xl shadow-black/50
  * Animate: slide-up on open, slide-down on close (0.2s)
  * Header: bg-white/[0.02] border-b border-white/5 px-4 py-3
    - Bot avatar: w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center (robot icon in cyan-400)
    - "Smart Connects Assistant" text-sm font-semibold text-white
    - "AI-powered help" text-xs text-slate-400
    - Close button (×) in top-right
  * Messages area: flex-1 overflow-y-auto max-h-80 p-4 space-y-4
    - User messages: right-aligned, bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]
    - Bot messages: left-aligned, bg-slate-800/80 text-slate-200 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]
    - Support markdown: bold (**), bullet points (•), numbered lists
    - Typing indicator: 3 bouncing dots with staggered animation
    - Timestamps: text-[10px] opacity-50
    - Auto-scroll to bottom
  * Quick prompts bar (shown when messages <= 2):
    - border-t border-white/5 px-4 py-2
    - Flex-wrap of pill buttons: rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400 hover:border-cyan-500 hover:text-cyan-300
    - Prompts: "Show me communities", "What events are coming up?", "Recommend communities", "What categories?"
  * Input area: border-t border-white/5 bg-black/20 p-3
    - Input: rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500
    - Send button: rounded-xl bg-cyan-500 p-2.5 hover:bg-cyan-400 disabled:opacity-50
    - Send icon: upward arrow
    - Enter to send, Shift+Enter for newline
```

---

### 3.20 Search & Filter System

```
PROMPT SEARCH-BAR:
- Global search component triggered from navbar
- Modal overlay: fixed inset-0 bg-black/60 z-50, backdrop-blur-sm
  * Click outside to close
- Search dialog: max-w-2xl mx-auto mt-[15vh] rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl
  * animate: scale-in 0.2s spring
  * Search input: border-b border-white/5 px-6 py-4
    - Large input: text-lg bg-transparent text-white placeholder:text-slate-600 focus:outline-none w-full
    - Left: search icon (magnifying glass) in text-slate-500
    - Right: keyboard shortcut hint "⌘K" or "Ctrl+K" in text-xs text-slate-600 bg-white/5 rounded px-2 py-0.5
  * Results area: max-h-80 overflow-y-auto p-2
    - Section label: "Communities" or "Events" text-xs text-slate-500 uppercase tracking-wider px-4 py-2
    - Each result: flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.04] cursor-pointer
      - Icon (building for community, calendar for event) in text-slate-400
      - Title text-sm text-white
      - Subtitle text-xs text-slate-500
      - Category tag
    - No results: "No results found for [query]" centered with ghost icon
  * Footer: text-xs text-slate-600 px-6 py-3 border-t border-white/5
    - "↑↓ navigate · ↵ open · esc close"
```

---

### 3.21 Modals & Dialogs

```
PROMPT MODAL:
- Generic overlay: fixed inset-0 bg-black/60 z-50 flex items-center justify-center
  * backdrop-blur-sm
- Modal container: max-w-md w-full mx-4 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50
  * animate: scale-in 0.2s spring
- Header: flex items-center justify-between px-6 py-4 border-b border-white/5
  * Title: text-lg font-semibold text-white
  * Close button: rounded-lg p-1 text-slate-400 hover:bg-white/5
- Body: px-6 py-4 text-sm text-slate-300
- Footer: px-6 py-4 border-t border-white/5 flex justify-end gap-3
  * Cancel: border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300
  * Confirm (danger): bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg px-4 py-2 text-sm font-semibold
  * Confirm (action): bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg px-4 py-2 text-sm font-semibold
```

---

### 3.22 Toast / Notification System

```
PROMPT TOAST:
- Fixed container: top-4 right-4 z-[100] space-y-3
- Each toast:
  * min-w-[320px] max-w-[420px] rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/30
  * animate: slide-in-right 0.25s, then slide-out-right 0.25s after duration
  * Flex items-start gap-3 p-4
  * Icon: (check-circle for success, alert-circle for error, info for info, warning for warning)
    - Success: text-emerald-400
    - Error: text-red-400
    - Info: text-cyan-400
    - Warning: text-amber-400
  * Content: flex-1
    - Title: text-sm font-semibold text-white
    - Message: text-xs text-slate-400 mt-0.5
  * Close button: text-slate-500 hover:text-white
  * Progress bar at bottom: h-0.5 rounded-full, color matches icon, animates width to 0 over duration
  * Variants: success (emerald-500 border-l-4), error (red-500 border-l-4), info (cyan-500 border-l-4)
- Auto-dismiss after 4s, or on click
```

---

### 3.23 Loading Skeleton

```
PROMPT SKELETON:
- animate-pulse with bg-slate-800/50
- Shapes:
  * Text line: rounded h-4 w-full, variants for w-3/4, w-1/2
  * Title: rounded h-6 w-1/3
  * Avatar: rounded-full w-12 h-12
  * Card: rounded-2xl w-full h-32
  * Image: rounded-xl w-full h-48
  * Button: rounded-lg w-24 h-10
- Used in grids: same grid layout as content, each cell is skeleton card with stacked skeleton lines
- Table: skeleton rows with alternating widths
```

---

### 3.24 Empty State

```
PROMPT EMPTY-STATE:
- Centered flex flex-col items-center justify-center py-16
- Ghost illustration: w-24 h-24 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center
  * Icon in text-4xl (emoji or heroicon) in text-slate-600
- Title: "No [items] yet" text-lg font-semibold text-slate-300 mt-6
- Description: text-sm text-slate-500 max-w-sm text-center mt-2
- CTA button: gradient cyan rounded-xl px-6 py-2.5 text-sm font-semibold text-white mt-6 hover:shadow-glow-cyan
- Optional secondary action: text link
```

---

### 3.25 Navigation Dropdown (User Menu)

```
PROMPT USER-DROPDOWN:
- Trigger: user avatar button in navbar, onClick toggles
- Dropdown panel: absolute top-full right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50
  * animate: scale-in 0.15s, origin top-right
- User info section: px-4 py-3 border-b border-white/5
  * Name: text-sm font-semibold text-white
  * Email: text-xs text-slate-400 truncate
  * Role badge (if admin): text-[10px] bg-amber-500/10 text-amber-400 rounded-full px-2 py-0.5
- Menu items: py-1
  * Each item: flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition
  * Icon: w-4 h-4 text-slate-500
  * Variant: "Sign out" in text-red-400 hover:bg-red-500/10
- Divider: border-t border-white/5 my-1
```

---

### 3.26 Review Card / Star Rating

```
PROMPT REVIEW-STARS:
- Display: flex items-center gap-0.5
  * Filled star: ★ text-yellow-400 text-sm
  * Empty star: ★ text-slate-600 text-sm
- Interactive (for input): 5 star buttons, hover fills all stars up to current
  * Hover/selected: text-yellow-400 scale-110 transition
  * Click sets rating value
  * Accessible: aria-label for each star
- Review card:
  * Flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]
  * Avatar: w-8 h-8 rounded-full bg-gradient-cyan text-xs font-bold flex items-center justify-center
  * Review name + date + stars row
  * Comment text below
```

---

### 3.27 Pagination

```
PROMPT PAGINATION:
- Flex items-center justify-center gap-2 mt-8
- Page button: min-w-[36px] h-9 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-slate-400
  * Hover: border-cyan-500/30 text-cyan-300
  * Active: bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold
  * Disabled: opacity-30 cursor-not-allowed
- Arrow buttons: prev (←) and next (→)
- "Page X of Y" text in text-xs text-slate-500 mx-2
- Omitted pages shown as "..."
```

---

### 3.28 Join Community Confirmation Popup

```
PROMPT JOIN-POPUP:
- Trigger: clicking "Join" button on a community card or detail page
- Modal overlay: fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm
- Modal container: max-w-sm w-full mx-4 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50
  * animate: scale-in 0.2s spring
- Icon at top: w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mt-6
  * Icon: hand-wave or door-open in text-3xl text-cyan-400
- Title: "Join [Community Name]?" text-xl font-semibold text-white text-center
- Description: "You'll get updates about events and activities in this community." text-sm text-slate-400 text-center mt-2 px-4
- Community details (preview): flex items-center gap-3 bg-white/[0.02] rounded-xl p-3 mx-4 mt-4
  * Avatar: w-10 h-10 rounded-lg bg-gradient-cyan flex items-center justify-center text-sm font-bold text-white
  * Name: text-sm text-white
  * Members: text-xs text-slate-500
- Buttons: flex gap-3 px-6 pb-6 mt-6
  * "Cancel" — flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-white/5
  * "Join Now" — flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white py-2.5 text-sm font-semibold hover:shadow-glow-cyan
    On click: shows brief loading spinner, then transitions to "Joined ✓" state and auto-closes after 1s
- Mobile: full-width modal with rounded-b-none at bottom
```

---

### 3.29 Share Popup / Sheet

```
PROMPT SHARE-POPUP:
- Trigger: clicking share icon (📤) on community detail or event detail page
- Bottom sheet on mobile, centered modal on desktop:
  * Desktop: max-w-sm w-full mx-4 rounded-2xl centered
  * Mobile: fixed bottom-0 left-0 right-0 rounded-t-2xl rounded-b-none, max-h-[70vh]
- Overlay: fixed inset-0 bg-black/60 z-50 backdrop-blur-sm (click to close)
- Container: border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50
  * animate: slide-up on open
- Header: px-6 py-4 border-b border-white/5 flex items-center justify-between
  * Title: "Share" text-lg font-semibold text-white
  * Close button: ×
- Body: px-6 py-6 space-y-6
  * Share link row: flex items-center gap-3 bg-white/[0.02] rounded-xl p-3
    - URL text: truncate text-sm text-slate-300 flex-1
    - Copy button: rounded-lg bg-white/5 px-4 py-2 text-xs text-cyan-400 hover:bg-cyan-500/10
      On click: changes to "Copied!" with checkmark for 2s
  * Share platforms grid: grid-cols-4 gap-4
    - Each platform: rounded-xl bg-white/[0.02] p-4 flex flex-col items-center gap-2 hover:bg-white/[0.04] cursor-pointer
      * Icon: text-2xl
      * Label: text-xs text-slate-400
    - Platforms: Twitter/X, Facebook, WhatsApp, Email, Telegram, LinkedIn, Copy Link, More
  * QR code (optional): centered QR code image with "Scan to share" text
- Footer: px-6 py-4 border-t border-white/5 text-xs text-slate-500 text-center
  * "Share Smart Connects with your network"
```

---

### 3.30 Error Pages (404 / 500)

> **Files:** `pages/not-found.tsx` + `pages/error.tsx`

```
PROMPT ERROR-PAGE:
- Full page: min-h-screen bg-slate-950 flex items-center justify-center
- Background: subtle radial gradient (cyan-500/[0.02] at center)
- Content: flex flex-col items-center text-center max-w-md mx-auto px-6
- Large status code: text-[120px] md:text-[160px] font-bold tracking-tighter
  * 404: colors cycle through gradient (cyan-400 → teal-400 → emerald-400) using bg-gradient-to-r bg-clip-text text-transparent
  * 500: gradient red-400 → rose-500
- Icon: w-24 h-24 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6
  * 404: compass or map icon in text-5xl text-cyan-400
  * 500: alert-triangle or broken-server icon in text-5xl text-red-400
- Title: 
  * 404: "Page not found" text-3xl font-semibold text-white
  * 500: "Something went wrong" text-3xl font-semibold text-white
- Description:
  * 404: "The page you're looking for doesn't exist or has been moved." text-sm text-slate-400 mt-3
  * 500: "Our servers encountered an issue. Please try again later." text-sm text-slate-400 mt-3
- Actions: flex gap-4 mt-8
  * "Go Home" — gradient cyan rounded-xl px-6 py-3 text-sm font-semibold text-white hover:shadow-glow-cyan
  * "Go Back" (404) — border border-slate-700 rounded-xl px-6 py-3 text-sm text-slate-300 hover:border-slate-500
  * "Try Again" (500) — border border-slate-700 rounded-xl px-6 py-3 text-sm text-slate-300 hover:border-slate-500
- Decorative: subtle floating geometric shapes in background (opacity 0.03) with animate float
- Mobile: status code text-[80px], full-width buttons
```

---

### 3.31 Form Input (Shared Component)

```
PROMPT FORM-INPUT:
- Reusable form input component used across all pages
- Wrapper: space-y-1.5
- Label: text-sm font-medium text-slate-300, with optional tooltip icon for help text
- Input field:
  * w-full rounded-xl border border-slate-700/60 bg-white/[0.03] px-4 py-3
  * text-white placeholder:text-slate-600 text-sm
  * focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none
  * transition-all duration-200
- Input variants:
  * Default: as above
  * Error: border-red-500/50 ring-1 ring-red-500/20
  * Success: border-emerald-500/50
  * Disabled: opacity-40 cursor-not-allowed
- Left icon: absolute left-3 top-1/2 -translate-y-1/2 text-slate-500
- Right icon: absolute right-3 top-1/2 -translate-y-1/2
  * Password: eye toggle button (show/hide)
  * Clear: × button when has value
- Helper text: text-xs text-slate-500 mt-1.5
- Error text: text-xs text-red-400 mt-1.5
- Character count: text-xs text-slate-500 text-right mt-1
- Textarea variant:
  * Same styling, resize-y vertical, min-h-[100px] max-h-[300px]
  * Character limit bar: h-0.5 rounded-full bg-slate-700, overflow indicator changes to amber/red
- Select variant:
  * Custom chevron-down icon on right
  * bg-slate-900 for options dropdown
```

---

## 4. Notes on Component Reuse

- **Review component** (3.26) is the canonical review card reused in Community Detail (3.10) and Event Detail (3.13).
- **Star rating** (3.26) is used for both display (read-only) and input (interactive) modes.
- **Form Input** (3.31) is the base for all form fields across Login, Register, Profile, Create/Edit pages.
- **Modal** (3.21) is the generic dialog container; Join Popup (3.28) and Share Popup (3.29) extend it with specific content.
- **Glass card** pattern is applied consistently across all page containers. Apply `glass.card` class for primary containers.
- **Mobile behavior**: All page grids collapse to single column on mobile (`grid-cols-1 sm:grid-cols-2`). Sidebar is hidden on mobile, replaced by hamburger-toggle in navbar.

---

## 5. Page Index

| # | Page | Path | Key Features |
|---|------|------|-------------|
| 1 | Landing / Home | `/` | Hero, Featured Communities, Upcoming Events, Recommendations |
| 2 | Communities List | `/communities` | Search, Filter, Grid, Join |
| 3 | Community Detail | `/communities/[id]` | About, Events, Reviews, Members, Join |
| 4 | Create Community | Modal + `/organizer` | Form, Image Upload |
| 5 | Edit Community | `/communities/[id]/edit` | Form, Delete Confirmation |
| 6 | Events List | `/events` | Filter, RSVP, Date Sort |
| 7 | Event Detail | `/events/[id]` | Info, RSVP, Reviews |
| 8 | Create Event | `/events/create` | Form, Community Selector |
| 9 | Edit Event | `/events/[id]/edit` | Form, Delete |
| 10 | My Communities | `/my-communities` | Joined List |
| 11 | My Events | `/my-events` | Attending / Not Attending tabs |
| 12 | Organizer Dashboard | `/organizer` | Create Community, Manage |
| 13 | Admin Dashboard | `/admin` | Stats, Users Table, Delete User |
| 14 | Profile | `/profile` | Edit Info, Interests, Danger Zone |
| 15 | Login | `/login` | Email/Password, Social Auth |
| 16 | Register | `/register` | Name, Email, Password, Interests |

---

## 6. Micro-Interactions & Polish

```yaml
micro-interactions:
  button-press: "scale-[0.97] on click, spring back"
  card-hover: "-translate-y-0.5, border glow, shadow increase — all 0.3s ease"
  link-hover: "text color transition + underline slide-in from left"
  input-focus: "border-cyan-500/50 + ring-1 ring-cyan-500/20, smooth 0.2s"
  page-enter: "fade-in + subtle translate-y-2, 0.3s ease-out"
  modal-enter: "scale-in 0.2s spring, backdrop fade 0.15s"
  toast-enter: "slide-in-right 0.25s, slide-out-right 0.25s"
  skeleton-pulse: "animate-pulse 1.5s infinite"
  loading-spinner: "animate-spin, 3/4 circle with gradient"
  star-hover: "scale-110, yellow fill, 0.15s"
  count-animation: "animate-number-scroll on stat values"
  gradient-shift: "background-position shift on hover for gradient buttons"
  glass-intensify: "backdrop-blur increase + bg opacity increase on hover for glass cards"
```

---

## 7. Implementation Notes

```yaml
implementation:
  framework: "Next.js 14+ App Router + TypeScript"
  styling: "Tailwind CSS v3.4+ with custom theme extension"
  animations: "Tailwind animate classes + CSS keyframes"
  icons: "Heroicons v2 (outline, 20x20)"
  glass-effect: "backdrop-blur-xl + bg-white/[0.02] + border border-white/5"
  gradients: "bg-gradient-to-r from-cyan-500 to-teal-500, etc."
  dark-theme: "body bg-slate-950, text-slate-100, color-scheme: dark"
  responsive: "Mobile-first, sm/md/lg breakpoints"
  font: "'Inter', sans-serif via next/font"
```

---

*Generated with Google Stitch DESIGN.md format — each prompt is self-contained and agent-friendly.*
