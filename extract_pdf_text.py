from pathlib import Path
import sys

path = Path('BHANDARI_MOHIT_MR_NP069596_NP3F2509IT_CORE_IR.pdf')
try:
    import fitz
except Exception as e:
    print('MISSING_FITZ', e)
    sys.exit(1)

doc = fitz.open(path)
with open('extracted_pdf.txt', 'w', encoding='utf-8') as out:
    for i, page in enumerate(doc, 1):
        txt = page.get_text()
        out.write(f'--- PAGE {i} ---\n')
        out.write(txt[:2000])
        out.write('\n\n')
