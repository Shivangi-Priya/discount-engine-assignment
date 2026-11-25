"""Regenerates sample-data/cart.pdf (text-based PDF) from the official cart. Needs: pip install reportlab"""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

rows = [
    ("Cushion Cover", "Natura Casa", "Amazon India", "Rs.1,299"),
    ("Bed Sheet Set", "Natura Casa", "Flipkart", "Rs.849"),
    ("Wall Shelf", "LivSpace Pro", "Amazon India", "Rs.599"),
    ("Ceramic Vase", "LivSpace Pro", "Noon", "Rs.2,499"),
    ("Cutting Board", "Nordic Basics", "Amazon India", "Rs.449"),
    ("Desk Organiser", "Nordic Basics", "Flipkart", "Rs.899"),
]
c = canvas.Canvas("sample-data/cart.pdf", pagesize=A4)
w, h = A4
c.setFont("Helvetica-Bold", 16); c.drawString(50, h - 60, "Customer Cart")
c.setFont("Helvetica", 10); c.drawString(50, h - 80, "Order #OP-9921"); c.drawString(50, h - 94, "Date: 2026-01-15")
xs = [50, 210, 330, 460]
y = h - 140
c.setFont("Helvetica-Bold", 11)
for x, t in zip(xs, ["Product", "Brand", "Platform", "Base Price"]): c.drawString(x, y, t)
c.line(50, y - 5, 540, y - 5)
c.setFont("Helvetica", 11)
for r in rows:
    y -= 24
    for x, t in zip(xs, r): c.drawString(x, y, t)
c.save()
