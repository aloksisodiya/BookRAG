"""Recursive character-boundary chunking with page-span tracking.

Splits on paragraph, then sentence, then word boundaries — never mid-word —
and records which pages each chunk's text was drawn from, since a chunk can
straddle a page break.
"""
import re
from dataclasses import dataclass

from app.config import settings

_SEPARATORS = ["\n\n", ". ", "! ", "? ", " "]


@dataclass
class Chunk:
    text: str
    page_start: int
    page_end: int


def chunk_pages(pages: list[dict], outline: list[dict]) -> list[Chunk]:
    """pages: [{"page": int, "text": str}, ...] in order."""
    from app.loaders.pdf_loader import section_for_page  # local import avoids a cycle

    # Concatenate pages while remembering the character offset each page starts at,
    # so a chunk's character span can be mapped back to page numbers.
    full_text_parts = []
    offsets = []  # (start_char, page_number)
    cursor = 0
    for p in pages:
        offsets.append((cursor, p["page"]))
        full_text_parts.append(p["text"])
        cursor += len(p["text"]) + 1  # +1 for the joining space
    full_text = " ".join(full_text_parts)

    raw_chunks = _split_text(full_text, settings.chunk_size, settings.chunk_overlap)

    chunks = []
    for text, start_char, end_char in raw_chunks:
        page_start = _page_for_offset(offsets, start_char)
        page_end = _page_for_offset(offsets, end_char)
        chunks.append(Chunk(text=text.strip(), page_start=page_start, page_end=page_end))
    return chunks


def _page_for_offset(offsets: list[tuple[int, int]], char_pos: int) -> int:
    page = offsets[0][1]
    for start_char, page_num in offsets:
        if start_char <= char_pos:
            page = page_num
        else:
            break
    return page


def _split_text(text: str, size: int, overlap: int) -> list[tuple[str, int, int]]:
    """Returns [(chunk_text, start_char, end_char), ...] with the given
    target size and overlap, splitting on the largest available separator."""
    if len(text) <= size:
        return [(text, 0, len(text))] if text.strip() else []

    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        if end < n:
            end = _find_split_point(text, start, end)
        chunk_text = text[start:end]
        if chunk_text.strip():
            chunks.append((chunk_text, start, end))
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return chunks


def _find_split_point(text: str, start: int, target_end: int) -> int:
    window = text[start:target_end]
    for sep in _SEPARATORS:
        idx = window.rfind(sep)
        if idx != -1 and idx > len(window) * 0.5:
            return start + idx + len(sep)
    return target_end  # fall back to a hard cut if no good boundary exists
