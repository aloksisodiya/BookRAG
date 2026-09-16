"""PDF text extraction that preserves page numbers.

Uses PyMuPDF rather than pypdf: it is faster on large books and gives more
reliable text ordering on multi-column layouts.
"""
import re
import pymupdf

from app.config import settings


class ScannedPDFError(Exception):
    """Raised when a PDF has too little extractable text to be a real book."""


def extract_pages(file_path: str) -> list[dict]:
    """Returns a list of {"page": int, "text": str}, one entry per page (1-indexed)."""
    doc = pymupdf.open(file_path)
    pages = []
    try:
        for i, page in enumerate(doc, start=1):
            raw = page.get_text("text")
            pages.append({"page": i, "text": _clean_page_text(raw)})
    finally:
        doc.close()

    total_chars = sum(len(p["text"]) for p in pages)
    avg_chars = total_chars / max(len(pages), 1)
    if avg_chars < settings.min_chars_per_page:
        raise ScannedPDFError(
            f"Average of {avg_chars:.0f} extractable characters per page — "
            "this PDF appears to be scanned images rather than real text."
        )
    return pages


def _clean_page_text(text: str) -> str:
    # Rejoin words split by a hyphen at a line break: "situa-\ntion" -> "situation"
    text = re.sub(r"-\n(?=[a-z])", "", text)
    # Collapse remaining newlines into spaces, then collapse repeated whitespace.
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def extract_outline(file_path: str) -> list[dict]:
    """Best-effort chapter/section titles from the PDF's bookmark outline.

    Returns [] when the PDF has no outline — chapter metadata then stays
    null rather than being guessed at.
    """
    doc = pymupdf.open(file_path)
    try:
        toc = doc.get_toc(simple=True)  # [[level, title, page], ...]
    finally:
        doc.close()
    return [{"level": lvl, "title": title, "page": page} for lvl, title, page in toc]


def section_for_page(outline: list[dict], page: int) -> str | None:
    """Finds the nearest outline entry at or before `page`."""
    candidates = [o for o in outline if o["page"] <= page]
    if not candidates:
        return None
    return max(candidates, key=lambda o: o["page"])["title"]
