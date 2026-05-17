"""
ingest.py — standalone PDF ingestion script.

Two-stage chunking:
  Stage 1: Regex heading detection splits the PDF into named sections.
  Stage 2: RecursiveCharacterTextSplitter chunks each section
           (chunk_size=1000, chunk_overlap=100).

Each chunk's metadata: chunk_index, section_index, section_heading,
page_number, source_document_id.

Usage:
    python ingest.py \
        --file path/to/report.pdf \
        --title "McKinsey AI Survey 2024" \
        --source-url "https://example.com/report.pdf" \
        --industry-tags "retail,finance,healthcare"
"""

import argparse
import hashlib
import logging
import os
import re
import sys
import time
from dataclasses import dataclass

from dotenv import load_dotenv
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase import create_client, Client

from services.embedding_service import embed_batch

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 100
BATCH_SIZE = 10
BATCH_DELAY = 0.5  # seconds between embed_batch() calls

# ── heading detector ──────────────────────────────────────────────────────────
# Matches three heading patterns common in business/research PDFs:
#   1. Chapter / Section / Part / Appendix N[.N]  e.g. "Chapter 3", "Appendix A"
#   2. Numbered sections                           e.g. "1. Introduction", "2.1 Background"
#   3. ALL CAPS lines (≥5 chars)                   e.g. "EXECUTIVE SUMMARY"

HEADING_RE = re.compile(
    r'^(?:'
    r'(?:Chapter|Section|Part|Appendix)\s+[\dA-Z][\d\.]*[^\n]*'  # Chapter 3 Title
    r'|\d+(?:\.\d+)*\.?\s+[A-Z][^\n]+'                           # 1. Intro / 2.1 Background 
    r'|(?:[A-Z][A-Z\s\d\-:&,\/\(\)\.]{4,}){2,}\s*$'  #ALL CAPS, at least 2 words, end of line                                              # ALL CAPS LINE
    r')',
    re.MULTILINE,
)


@dataclass
class Section:
    heading: str | None
    text: str
    page_number: int  # 0-indexed page where the section starts


# ── helpers ───────────────────────────────────────────────────────────────────

def _supabase_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def _md5(file_path: str) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def _check_duplicate(supabase: Client, file_hash: str) -> bool:
    response = (
        supabase.table("source_documents")
        .select("id, title")
        .eq("file_hash", file_hash)
        .limit(1)
        .execute()
    )
    if response.data:
        row = response.data[0]
        logger.warning(
            "Duplicate — file already ingested as '%s' (id=%s). Exiting.",
            row.get("title"), row.get("id"),
        )
        return True
    return False


def _page_at_offset(offset: int, page_offsets: list[tuple[int, int]]) -> int:
    """Return the 0-indexed page number for a given character offset."""
    page_num = 0
    for char_offset, page_number in page_offsets:
        if offset >= char_offset:
            page_num = page_number
        else:
            break
    return page_num


# ── two-stage chunking ────────────────────────────────────────────────────────

def _detect_sections(full_text: str, page_offsets: list[tuple[int, int]]) -> list[Section]:
    """Stage 1 — split text into sections at heading boundaries."""
    matches = list(HEADING_RE.finditer(full_text))

    # (start_pos, heading_text); position 0 captures any preamble before first heading
    boundaries = [(0, None)] + [(m.start(), m.group(0).strip()) for m in matches]
    end_positions = [b[0] for b in boundaries[1:]] + [len(full_text)]

    sections: list[Section] = []
    for (start, heading), end in zip(boundaries, end_positions):
        text = full_text[start:end].strip()
        if text:
            sections.append(Section(
                heading=heading,
                text=text,
                page_number=_page_at_offset(start, page_offsets),
            ))
    return sections


def load_and_chunk(file_path: str) -> tuple[list[dict], int]:
    """Load a PDF and return (chunks, page_count).

    Each chunk is a dict with 'content' and 'metadata' keys.
    """
    logger.info("Loading PDF: %s", file_path)
    loader = PyMuPDFLoader(file_path)
    pages = loader.load()
    page_count = len(pages)
    logger.info("Loaded %d pages", page_count)

    # Concatenate pages into a single string, recording each page's start offset
    full_text = ""
    page_offsets: list[tuple[int, int]] = []
    for doc in pages:
        page_offsets.append((len(full_text), doc.metadata.get("page", 0)))
        full_text += doc.page_content + "\n"

    # Stage 1: heading-based section detection
    sections = _detect_sections(full_text, page_offsets)
    logger.info("Detected %d sections", len(sections))

    # Stage 2: chunk each section
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    chunks: list[dict] = []
    chunk_index = 0

    for section_index, section in enumerate(sections):
        for chunk_text in splitter.split_text(section.text):
            chunks.append({
                "content": chunk_text,
                "metadata": {
                    "chunk_index": chunk_index,
                    "section_index": section_index,
                    "section_heading": section.heading,
                    "page_number": section.page_number,
                },
            })
            chunk_index += 1

    logger.info(
        "Created %d chunks across %d sections (chunk_size=%d, overlap=%d)",
        len(chunks), len(sections), CHUNK_SIZE, CHUNK_OVERLAP,
    )
    return chunks, page_count


# ── database operations ───────────────────────────────────────────────────────

def insert_source_document(
    supabase: Client,
    *,
    title: str,
    file_path: str,
    source_url: str | None,
    file_hash: str,
    page_count: int,
    industry_tags: list[str],
) -> str:
    """Insert a source_documents row and return its UUID."""
    response = supabase.table("source_documents").insert({
        "title": title,
        "filename": os.path.basename(file_path),
        "source_url": source_url,
        "file_type": "pdf",
        "file_size_bytes": os.path.getsize(file_path),
        "file_hash": file_hash,
        "page_count": page_count,
        "industry_tags": industry_tags,
        "metadata": {},
    }).execute()
    source_document_id = response.data[0]["id"]
    logger.info("Inserted source_document id=%s", source_document_id)
    return source_document_id


def embed_and_insert_chunks(
    supabase: Client,
    chunks: list[dict],
    source_document_id: str,
) -> None:
    """Embed and insert all chunks in batches.

    A failed embedding skips the whole batch; a failed insert skips
    only that chunk — neither aborts the full ingestion.
    """
    total = len(chunks)
    inserted = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch = chunks[batch_start : batch_start + BATCH_SIZE]

        # embed_batch() applies a 0.1 s delay between individual calls internally
        try:
            embeddings = embed_batch([c["content"] for c in batch])
        except Exception as e:
            logger.error(
                "Embedding failed for batch at chunk %d — skipping batch: %s",
                batch_start, e,
            )
            if batch_start + BATCH_SIZE < total:
                time.sleep(BATCH_DELAY)
            continue

        for chunk, embedding in zip(batch, embeddings):
            try:
                supabase.table("rag_documents").insert({
                    "content": chunk["content"],
                    "embedding": embedding,
                    "source_document_id": source_document_id,
                    "metadata": {
                        **chunk["metadata"],
                        "source_document_id": source_document_id,
                    },
                }).execute()
                inserted += 1
            except Exception as e:
                logger.error(
                    "Insert failed for chunk %d — skipping: %s",
                    chunk["metadata"]["chunk_index"], e,
                )

        logger.info(
            "Progress: %d/%d chunks embedded and inserted",
            min(batch_start + BATCH_SIZE, total), total,
        )
        if batch_start + BATCH_SIZE < total:
            time.sleep(BATCH_DELAY)

    logger.info(
        "Ingestion complete — %d/%d chunks inserted (source_document_id=%s)",
        inserted, total, source_document_id,
    )


# ── CLI ───────────────────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest a PDF into the RAG store with two-stage chunking."
    )
    parser.add_argument("--file",          required=True, help="Path to the PDF file")
    parser.add_argument("--title",         required=True, help='Human-readable title e.g. "McKinsey AI Survey 2024"')
    parser.add_argument("--source-url",    default=None,  help="URL the document was downloaded from")
    parser.add_argument("--industry-tags", default="",    help="Comma-separated tags e.g. retail,finance")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    if not os.path.isfile(args.file):
        logger.error("File not found: %s", args.file)
        sys.exit(1)

    industry_tags = [t.strip() for t in args.industry_tags.split(",") if t.strip()]
    supabase = _supabase_client()

    file_hash = _md5(args.file)
    logger.info("File hash (MD5): %s", file_hash)

    if _check_duplicate(supabase, file_hash):
        sys.exit(0)

    chunks, page_count = load_and_chunk(args.file)

    source_document_id = insert_source_document(
        supabase,
        title=args.title,
        file_path=args.file,
        source_url=args.source_url,
        file_hash=file_hash,
        page_count=page_count,
        industry_tags=industry_tags,
    )

    embed_and_insert_chunks(supabase, chunks, source_document_id)


if __name__ == "__main__":
    main()
