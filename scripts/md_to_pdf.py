#!/usr/bin/env python3
"""Convert Chapter 4 markdown to a formatted PDF using fpdf2."""

import re
from fpdf import FPDF

class ChapterPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 6, "Chapter 4: Design & Implementation", align="R")
            self.ln(4)
            self.set_draw_color(200, 200, 200)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


pdf = ChapterPDF(orientation="P", unit="mm", format="A4")
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.set_margins(18, 18, 18)

# Add Unicode-capable font
pdf.add_font("DejaVu", "", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
pdf.add_font("DejaVu", "B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
pdf.add_font("DejaVuMono", "", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")

FONT = "DejaVu"
FONTB = "DejaVu"
FONTI = "DejaVu"  # same as regular since no oblique available
FONTMONO = "DejaVuMono"

pdf.add_page()

# ─── Read the markdown file ───
with open("docs/chapter4-design-implementation.md", "r", encoding="utf-8") as f:
    md_text = f.read()

lines = md_text.split("\n")

def clean_md_inline(text):
    """Remove markdown bold/italic syntax and return plain text."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'`(.+?)`', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    return text.strip()


def parse_inline(text):
    """Return list of (text, style) tuples. style: 'B'=bold, 'I'=italic, 'M'=mono, ''=normal."""
    result = []
    # Process bold, italic, mono in order
    pattern = re.compile(r'(\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*)')
    last = 0
    for m in pattern.finditer(text):
        if m.start() > last:
            result.append((text[last:m.start()], ""))
        if m.group(2):  # bold
            result.append((m.group(2), "B"))
        elif m.group(3):  # mono
            result.append((m.group(3), "M"))
        elif m.group(4):  # italic
            result.append((m.group(4), "I"))
        last = m.end()
    if last < len(text):
        result.append((text[last:], ""))
    return result if result else [((text, ""))]


def write_rich_text(pdf, text, font_size=9.5, line_height=5):
    """Write text with inline bold/italic/mono formatting."""
    parts = parse_inline(text)
    x_start = pdf.get_x()
    for part_text, style in parts:
        if not part_text:
            continue
        if style == "B":
            pdf.set_font(FONTB, "B", font_size)
        elif style == "I":
            pdf.set_font(FONT, "I", font_size)  # using regular font for italic
        elif style == "M":
            pdf.set_font(FONTMONO, "", font_size - 0.5)
        else:
            pdf.set_font(FONT, "", font_size)
        pdf.set_text_color(30, 30, 30)
        # Use multi_cell for word wrapping
        pdf.cell(0, line_height, part_text, new_x="LMARGIN", new_y="NEXT")


def set_text(text, size=9.5, style="", color=(30, 30, 30)):
    pdf.set_font(FONT, style, size)
    pdf.set_text_color(*color)


def write_line(text, size=9.5, style="", color=(30, 30, 30), indent=0):
    set_text(text, size, style, color)
    if indent:
        pdf.set_x(18 + indent)
    pdf.multi_cell(0, 5, text)


def parse_table(lines_block):
    """Parse markdown table lines into headers and rows."""
    headers = []
    rows = []
    for i, line in enumerate(lines_block):
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        # Skip separator line
        if all(re.match(r'^[-:]+$', c) for c in cells):
            continue
        if i == 0 or not headers:
            headers = cells
        else:
            rows.append(cells)
    return headers, rows


def draw_table(headers, rows, col_widths=None):
    """Draw a table in the PDF."""
    avail_w = 174  # page width minus margins
    n_cols = len(headers)

    if col_widths is None:
        # Auto-calculate widths
        all_widths = []
        for h in headers:
            pdf.set_font(FONTB, "B", 8)
            all_widths.append(pdf.get_string_width(h) + 6)
        for row in rows:
            for i, cell in enumerate(row):
                pdf.set_font(FONT, "", 8)
                w = pdf.get_string_width(cell) + 6
                if i < len(all_widths):
                    all_widths[i] = max(all_widths[i], w)

        total = sum(all_widths)
        if total > avail_w:
            col_widths = [w * avail_w / total for w in all_widths]
        else:
            col_widths = all_widths
            # Distribute remaining space
            extra = (avail_w - total) / n_cols
            col_widths = [w + extra for w in col_widths]

    # Ensure we don't overflow
    if sum(col_widths) > avail_w:
        col_widths = [w * avail_w / sum(col_widths) for w in col_widths]

    row_h = 5

    def draw_header():
        pdf.set_font(FONTB, "B", 8)
        pdf.set_fill_color(240, 240, 245)
        pdf.set_text_color(30, 30, 30)
        x = pdf.get_x()
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], row_h, clean_md_inline(h)[:40], border=1, fill=True)
        pdf.ln(row_h)

    def draw_row(row):
        pdf.set_font(FONT, "", 7.5)
        pdf.set_text_color(50, 50, 50)
        for i, cell in enumerate(row):
            pdf.cell(col_widths[i], row_h, clean_md_inline(cell)[:50], border=1)
        pdf.ln(row_h)

    # Check if table fits on current page
    needed = row_h * (len(rows) + 1) + 5
    if pdf.get_y() + needed > 280:
        pdf.add_page()

    draw_header()
    for row in rows:
        if pdf.get_y() > 280:
            pdf.add_page()
            draw_header()
        draw_row(row)
    pdf.ln(3)


# ─── Parse and render ───
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    # Skip empty lines
    if not stripped:
        i += 1
        continue

    # Horizontal rule
    if stripped == "---":
        pdf.ln(2)
        pdf.set_draw_color(180, 180, 180)
        pdf.line(18, pdf.get_y(), 192, pdf.get_y())
        pdf.ln(4)
        i += 1
        continue

    # Headings
    if stripped.startswith("# ") and not stripped.startswith("## "):
        text = clean_md_inline(stripped[2:])
        pdf.add_page()
        set_text(text, 20, "B", (20, 20, 60))
        pdf.multi_cell(0, 10, text)
        pdf.ln(4)
        i += 1
        continue

    if stripped.startswith("## "):
        text = clean_md_inline(stripped[3:])
        if pdf.get_y() > 240:
            pdf.add_page()
        pdf.ln(6)
        set_text(text, 15, "B", (30, 30, 80))
        pdf.multi_cell(0, 8, text)
        pdf.ln(2)
        # Underline
        pdf.set_draw_color(30, 30, 80)
        pdf.line(18, pdf.get_y(), 192, pdf.get_y())
        pdf.ln(4)
        i += 1
        continue

    if stripped.startswith("### ") and not stripped.startswith("#### "):
        text = clean_md_inline(stripped[4:])
        if pdf.get_y() > 255:
            pdf.add_page()
        pdf.ln(4)
        set_text(text, 12, "B", (50, 50, 50))
        pdf.multi_cell(0, 7, text)
        pdf.ln(2)
        i += 1
        continue

    if stripped.startswith("#### "):
        text = clean_md_inline(stripped[5:])
        pdf.ln(3)
        set_text(text, 10.5, "B", (60, 60, 60))
        pdf.multi_cell(0, 6, text)
        pdf.ln(1)
        i += 1
        continue

    # Code blocks
    if stripped.startswith("```"):
        lang = stripped[3:].strip()
        code_lines = []
        i += 1
        while i < len(lines) and not lines[i].strip().startswith("```"):
            code_lines.append(lines[i])
            i += 1
        i += 1  # skip closing ```

        pdf.ln(2)
        pdf.set_fill_color(245, 245, 250)
        pdf.set_draw_color(200, 200, 210)
        pdf.set_text_color(50, 50, 50)

        code_text = "\n".join(code_lines)
        pdf.set_font(FONTMONO, "", 7.5)

        # Draw code block background
        y_start = pdf.get_y()
        x_start = 18
        w = 174

        pdf.set_x(x_start + 2)
        pdf.multi_cell(w - 4, 4, code_text, border=0)
        y_end = pdf.get_y()

        # Draw border
        pdf.rect(x_start, y_start - 1, w, y_end - y_start + 3)
        pdf.ln(3)
        continue

    # Table detection
    if "|" in stripped and i + 1 < len(lines) and re.match(r'^\|[\s:-]+\|', lines[i+1].strip()):
        table_lines = []
        while i < len(lines) and "|" in lines[i].strip():
            table_lines.append(lines[i])
            i += 1
        headers, rows = parse_table(table_lines)
        if headers and rows:
            pdf.ln(2)
            draw_table(headers, rows)
        continue

    # Bullet points
    if stripped.startswith("- ") or stripped.startswith("* "):
        text = stripped[2:]
        pdf.set_font(FONT, "", 9.5)
        pdf.set_text_color(30, 30, 30)

        # Draw bullet
        x = 22
        y = pdf.get_y()
        pdf.set_fill_color(80, 80, 80)
        pdf.circle(x - 1, y + 1.8, 1, style="F")
        pdf.set_x(x + 3)
        pdf.multi_cell(174 - 8, 5, clean_md_inline(text))
        i += 1
        continue

    # Numbered list
    num_match = re.match(r'^(\d+)\.\s+(.+)', stripped)
    if num_match:
        num = num_match.group(1)
        text = num_match.group(2)
        pdf.set_font(FONTB, "B", 9.5)
        pdf.set_text_color(60, 60, 120)
        x = 22
        pdf.set_x(x)
        pdf.cell(8, 5, f"{num}.")
        pdf.set_font(FONT, "", 9.5)
        pdf.set_text_color(30, 30, 30)
        pdf.multi_cell(174 - 12, 5, clean_md_inline(text))
        i += 1
        continue

    # Regular paragraph
    if stripped:
        pdf.set_font(FONT, "", 9.5)
        pdf.set_text_color(30, 30, 30)
        pdf.set_x(18)
        pdf.multi_cell(174, 5, clean_md_inline(stripped))

    i += 1

# ─── Save ───
output_path = "docs/chapter4-design-implementation.pdf"
pdf.output(output_path)
print(f"PDF generated: {output_path}")
print(f"Pages: {pdf.pages_count}")
