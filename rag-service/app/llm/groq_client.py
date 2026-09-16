"""Groq API client for query rewriting and answer generation.

Retries are limited to transient failures (rate limits, 5xx, timeouts) with
exponential backoff — a bad prompt or an auth failure should surface
immediately rather than retry three times pointlessly.
"""
from groq import Groq, APIStatusError, APIConnectionError
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.config import settings
from app.llm.prompts import SYSTEM_PROMPT, REWRITE_SYSTEM_PROMPT, build_user_prompt

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def _is_transient(exc: BaseException) -> bool:
    if isinstance(exc, APIConnectionError):
        return True
    if isinstance(exc, APIStatusError):
        return exc.status_code == 429 or exc.status_code >= 500
    return False


@retry(
    retry=retry_if_exception(_is_transient),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    reraise=True,
)
def rewrite_query(question: str, history: list[dict]) -> str:
    if not history:
        return question

    turns = "\n".join(f"{h['role']}: {h['content']}" for h in history[-4:])
    client = get_client()
    resp = client.chat.completions.create(
        model=settings.groq_rewrite_model,
        temperature=0,
        max_tokens=100,
        messages=[
            {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
            {"role": "user", "content": f"Conversation so far:\n{turns}\n\nLatest message: {question}"},
        ],
    )
    rewritten = resp.choices[0].message.content.strip()
    return rewritten or question


@retry(
    retry=retry_if_exception(_is_transient),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    reraise=True,
)
def generate_answer(question: str, context_block: str) -> str:
    client = get_client()
    user_prompt = build_user_prompt(question, context_block)
    resp = client.chat.completions.create(
        model=settings.groq_model,
        temperature=0.1,
        max_tokens=800,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    return resp.choices[0].message.content.strip()
