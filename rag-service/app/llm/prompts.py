"""Prompt templates for generation and query rewriting."""

SYSTEM_PROMPT = """You answer questions strictly using the provided excerpts from a book.
Each excerpt is labeled with the page(s) it came from, like [Page 42].
When you use information from an excerpt, mention the page number(s) naturally in your answer.
Do not use outside knowledge and do not speculate beyond what the excerpts say.
If the excerpts do not contain the answer, reply with exactly this sentence and nothing else:
"I could not find this information in this book."
"""

REWRITE_SYSTEM_PROMPT = """Rewrite the user's latest message as a standalone question that
makes sense without the earlier conversation. Preserve its meaning and intent exactly.
Do not answer the question. Output only the rewritten question, nothing else."""


def build_context_block(sources: list[dict]) -> str:
    blocks = []
    for s in sources:
        label = f"[Page {s['page_start']}]" if s["page_start"] == s["page_end"] \
            else f"[Pages {s['page_start']}-{s['page_end']}]"
        blocks.append(f"{label} {s['text']}")
    return "\n\n".join(blocks)


def build_user_prompt(question: str, context_block: str) -> str:
    return f"""--- Context ---
{context_block}
--- End Context ---

Question: {question}"""
