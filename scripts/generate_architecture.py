#!/usr/bin/env python3
"""
Generate the Smart Connects system architecture diagram.

Layers rendered (top -> bottom):
  1. Client Layer        - browser / user roles
  2. Presentation        - Next.js 15 App Router frontend
  3. Application / API   - Express REST API (routers grouped by domain)
  4. Services            - reminder scheduler, email service, AI helpers
  5. External Services   - Gemini API, Gmail SMTP
  6. Data Layer          - PostgreSQL tables + static file uploads

Output: docs/system-architecture.jpg (3600 x 2600, high quality)

Usage:
    python3 scripts/generate_architecture.py
"""

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------- constants
W, H = 3600, 2900
BG = (2, 6, 23)          # slate-950
PANEL = (15, 23, 42)     # slate-900
CARD = (30, 41, 59)      # slate-800
CYAN = (34, 211, 238)
TEAL = (20, 184, 166)
EMERALD = (16, 185, 129)
AMBER = (245, 158, 11)
VIOLET = (167, 139, 250)
ROSE = (244, 63, 94)
WHITE = (248, 250, 252)
GREY = (148, 163, 184)
DGREY = (100, 116, 139)

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(size, bold=True):
    try:
        return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)
    except OSError:
        return ImageFont.load_default()


F_TITLE = font(76)
F_SUB = font(36, bold=False)
F_LAYER = font(40)
F_NODE_T = font(34)
F_NODE_S = font(26, bold=False)
F_TAG = font(24)
F_ARROW = font(26, bold=False)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)


# ---------------------------------------------------------------- helpers
def rrect(box, r, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def ctext(cx, y, text, f, fill):
    w = d.textlength(text, font=f)
    d.text((cx - w / 2, y), text, font=f, fill=fill)


def arrow_v(x, y1, y2, color, label=None):
    """Vertical arrow with head."""
    d.line([(x, y1), (x, y2)], fill=color, width=6)
    d.polygon([(x - 16, y2 - 22), (x + 16, y2 - 22), (x, y2)], fill=color)
    if label:
        f = F_ARROW
        w = d.textlength(label, font=f)
        d.text((x + 26, (y1 + y2) / 2 - 18), label, font=f, fill=DGREY)


def node(box, title, subtitle, accent, tsize=34, ssize=26):
    x1, y1, x2, y2 = box
    rrect(box, 18, fill=CARD, outline=accent, width=4)
    # accent strip on the left
    d.rectangle([x1 + 4, y1 + 18, x1 + 16, y2 - 18], fill=accent)
    if subtitle:
        ty = y1 + 18
    else:
        ty = (y1 + y2) / 2 - tsize / 2 - 10
    ctext((x1 + x2) / 2, ty, title, font(tsize), WHITE)
    if subtitle:
        f_sub = font(ssize, bold=False)
        lines = subtitle.split("\n")
        sy = y1 + 22 + tsize + 8
        for line in lines:
            ctext((x1 + x2) / 2, sy, line, f_sub, GREY)
            sy += ssize + 10


# ---------------------------------------------------------------- header
ctext(W / 2, 70, "SMART CONNECTS", F_TITLE, WHITE)
ctext(W / 2, 170, "System Architecture — Next.js Frontend · Express REST API · PostgreSQL · Gemini AI", F_SUB, CYAN)
d.line([(W / 2 - 700, 240), (W / 2 + 700, 240)], fill=(30, 41, 59), width=3)

MARGIN = 220
INNER = W - MARGIN * 2          # content width
CX = W / 2

y = 300


# ---------------------------------------------------------------- layer 1: clients
def layer_box(y, h, label, color):
    rrect([MARGIN, y, W - MARGIN, y + h], 26, fill=(15, 23, 42, ), outline=(51, 65, 85), width=3)
    # layer tag
    f = F_TAG
    tw = d.textlength(label, font=f)
    tx = MARGIN + 30
    d.rounded_rectangle([tx, y - 20, tx + tw + 40, y + 20], radius=14, fill=color, outline=None)
    d.text((tx + 20, y - 14), label, font=f, fill=(2, 6, 23))
    return y + h


h = 200
y_end = layer_box(y, h, "CLIENT LAYER", GREY)
roles = ["Visitors", "Members", "Organizers", "Admins"]
bw = 380
gap = (INNER - 80 - bw * len(roles)) / (len(roles) - 1)
x = MARGIN + 40
for r in roles:
    node([x, y + 45, x + bw, y + 165], r, None, GREY)
    x += bw + gap
y = y_end + 70
arrow_v(CX, y - 60, y, CYAN, "HTTPS")

# ---------------------------------------------------------------- layer 2: frontend
h = 470
y0 = y
y_end = layer_box(y0, h, "PRESENTATION — FRONTEND", CYAN)
node([MARGIN + 40, y0 + 50, MARGIN + 560, y0 + 210], "Next.js 15 (App Router)", "TypeScript · Tailwind CSS · Port 3001", CYAN)
node([MARGIN + 40, y0 + 250, MARGIN + 560, y0 + 420], "ThemeContext + Auth Store", "Client state · JWT cookie sessions", CYAN)

# page groups (3 columns)
pg = [
    ("Public Pages", "Landing · Communities · Events", "Login · Register · Verify · Reset"),
    ("Member Pages", "My Communities · My Events", "Profile · Chatbot Widget"),
    ("Role Dashboards", "Organizer · Organization", "Admin · Onboarding · Apply"),
]
colw = 800
x = MARGIN + 640
for t1, s1, s2 in pg:
    rrect([x, y0 + 50, x + colw, y0 + 420], 18, fill=CARD, outline=(51, 65, 85), width=3)
    ctext(x + colw / 2, y0 + 70, t1, font(34), CYAN)
    ctext(x + colw / 2, y0 + 130, s1, font(28, bold=False), GREY)
    ctext(x + colw / 2, y0 + 175, s2, font(28, bold=False), GREY)
    ctext(x + colw / 2, y0 + 250, "/api via fetch (JSON + cookies)", font(26, bold=False), DGREY)
    x += colw + 30

y = y_end + 70
arrow_v(CX, y - 60, y, TEAL, "REST /api · JSON over HTTPS")

# ---------------------------------------------------------------- layer 3: API
h = 560
y0 = y
y_end = layer_box(y0, h, "APPLICATION LAYER — EXPRESS REST API (Node.js · TypeScript · Port 4000)", TEAL)

# middleware row
mw = ["CORS + Credentials", "Cookie Parser", "JSON Body Parser", "Auth Middleware (JWT)", "Multer Uploads", "Static /uploads", "Error Handler"]
bw = 430
gap = (INNER - 80 - bw * len(mw)) / (len(mw) - 1)
x = MARGIN + 40
for m in mw:
    rrect([x, y0 + 55, x + bw, y0 + 135], 14, fill=(2, 6, 23), outline=(71, 85, 105), width=3)
    ctext(x + bw / 2, y0 + 75, m, font(26, bold=False), GREY)
    x += bw + gap

d.line([(MARGIN + 40, y0 + 165), (W - MARGIN - 40, y0 + 165)], fill=(51, 65, 85), width=2)

# route groups: 4 columns x 2 rows
routes = [
    ("Auth & Users", ["auth", "users", "notification-preferences"], CYAN),
    ("Core Domain", ["communities", "events", "engagement"], EMERALD),
    ("Social", ["discussions", "announcements", "notifications", "chat"], VIOLET),
    ("Admin & Ops", ["admin", "admin-activity", "applications", "stats/health"], AMBER),
]
colw = (INNER - 80 - 3 * 30) / 4
x = MARGIN + 40
for name, items, accent in routes:
    rrect([x, y0 + 195, x + colw, y0 + 500], 18, fill=CARD, outline=accent, width=4)
    ctext(x + colw / 2, y0 + 215, name, font(32), accent)
    yy = y0 + 285
    for it in items:
        ctext(x + colw / 2, yy, "/api/" + it, font(27, bold=False), WHITE)
        yy += 52
    x += colw + 30

y = y_end + 70
arrow_v(CX, y - 60, y, VIOLET, "SQL queries (pg Pool)")

# ---------------------------------------------------------------- layer 4: services + externals
h = 420
y0 = y
y_end = layer_box(y0, h, "SERVICES & EXTERNAL INTEGRATIONS", VIOLET)

# left: internal services
svcs = [
    ("Reminder Scheduler", "cron-style event reminders", EMERALD),
    ("Email Service", "nodemailer · HTML templates", CYAN),
    ("AI Chat Service", "SQL gen + safety validation", VIOLET),
    ("File Upload Store", "backend/uploads (static)", AMBER),
]
x = MARGIN + 40
bw = 760
for t1, s1, accent in svcs:
    node([x, y0 + 50, x + bw, y0 + 180], t1, s1, accent)
    x += bw + 20

# right: external services (second row)
ext = [
    ("Google Gemini API", "AI chatbot · text-to-SQL", VIOLET),
    ("Gmail SMTP", "verification · reminders · approvals", ROSE),
]
x = MARGIN + 40
bw = 1550
for t1, s1, accent in ext:
    node([x, y0 + 230, x + bw, y0 + 370], t1, s1, accent, tsize=32, ssize=24)
    x += bw + 20

y = y_end + 70
arrow_v(CX, y - 60, y, AMBER, "Prisma-free raw SQL via node-postgres")

# ---------------------------------------------------------------- layer 5: data
h = 300
y0 = y
y_end = layer_box(y0, h, "DATA LAYER", AMBER)

node([MARGIN + 40, y0 + 55, MARGIN + 1500, y0 + 245], "PostgreSQL — smart_connects", "users · communities · events · rsvps · community_members · reviews", AMBER)
node([MARGIN + 1560, y0 + 55, W - MARGIN - 40, y0 + 245], "Tables (contd.)", "event_questions · announcements · discussions · organizer_applications\nnotifications · saved_events · activity_log · sponsors", AMBER, ssize=24)

y = y_end + 60

# ---------------------------------------------------------------- legend
d.line([(MARGIN, y), (W - MARGIN, y)], fill=(30, 41, 59), width=3)
y += 30
legend = [
    (CYAN, "Frontend"), (TEAL, "REST API"), (VIOLET, "AI / Social"), (EMERALD, "Background jobs"),
    (AMBER, "Data"), (ROSE, "Email"), (GREY, "Client"),
]
x = CX - 1100
for color, label in legend:
    d.rounded_rectangle([x, y, x + 46, y + 34], radius=8, fill=color)
    d.text((x + 60, y + 2), label, font=F_TAG, fill=GREY)
    x += 330

ctext(W / 2, y + 70, "Smart Connects — Community & Event Discovery Platform", font(28, bold=False), DGREY)

# ---------------------------------------------------------------- save
img.save("docs/system-architecture.jpg", "JPEG", quality=90, optimize=True)
print("Saved docs/system-architecture.jpg", img.size)
