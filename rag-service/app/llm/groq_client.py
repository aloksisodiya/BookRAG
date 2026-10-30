"""LangChain Groq chains for query rewriting and answer generation.

Retries are limited to transient failures (rate limits, 5xx, timeouts) with
exponential backoff — a bad prompt or an auth failure should surface
immediately rather than retry three times pointlessly.
"""
from groq import APIStatusError, APIConnectionError
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.config import settings
from app.llm.prompts import ANSWER_PROMPT, REWRITE_PROMPT

_answer_model: ChatGroq | None = None
_rewrite_model: ChatGroq | None = None


def _get_model(model_name: str, temperature: float, max_tokens: int) -> ChatGroq:
    return ChatGroq(
        model=model_name,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=settings.groq_api_key,
    )


def get_answer_model() -> ChatGroq:
    global _answer_model
    if _answer_model is None:
        _answer_model = _get_model(
            settings.groq_model,
            temperature=0.1,
            max_tokens=800,
        )
    return _answer_model


def get_rewrite_model() -> ChatGroq:
    global _rewrite_model
    if _rewrite_model is None:
        _rewrite_model = _get_model(
            settings.groq_rewrite_model,
            temperature=0,
            max_tokens=100,
        )
    return _rewrite_model


def _rewrite_chain():
    return REWRITE_PROMPT | get_rewrite_model() | StrOutputParser()


def _answer_chain():
    return ANSWER_PROMPT | get_answer_model() | StrOutputParser()


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
    rewritten = _rewrite_chain().invoke({
        "history": turns,
        "question": question,
    }).strip()
    return rewritten or question


@retry(
    retry=retry_if_exception(_is_transient),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    reraise=True,
)
def generate_answer(question: str, context_block: str) -> str:
    return _answer_chain().invoke({
        "question": question,
        "context": context_block,
    }).strip()
