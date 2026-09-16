"""Simple evaluation runner: measures retrieval recall and refusal accuracy
against a small hand-labelled question set (see dataset.json).

Usage:
    python eval/run_eval.py <book_id>

Requires the book to already be ingested and the service's Python
environment to be active (it imports app modules directly rather than
going over HTTP, so no server needs to be running).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.retrieval.retriever import answer_question  # noqa: E402


def main(book_id: str) -> None:
    dataset = json.loads((Path(__file__).parent / "dataset.json").read_text())

    hits, total_answerable, refusals_correct, total_unanswerable = 0, 0, 0, 0

    for item in dataset:
        result = answer_question(book_id, item["question"], [])
        expected_pages = set(item.get("expected_pages", []))

        if expected_pages:
            total_answerable += 1
            retrieved_pages = {
                p for s in result["sources"]
                for p in range(s["page_start"], s["page_end"] + 1)
            }
            hit = bool(expected_pages & retrieved_pages)
            hits += hit
            print(f"[{'HIT' if hit else 'MISS'}] {item['question']!r} -> pages {sorted(retrieved_pages)}")
        else:
            total_unanswerable += 1
            correct = not result["grounded"]
            refusals_correct += correct
            print(f"[{'REFUSED OK' if correct else 'HALLUCINATED'}] {item['question']!r}")

    if total_answerable:
        print(f"\nRecall@K: {hits}/{total_answerable} = {hits / total_answerable:.2f}")
    if total_unanswerable:
        print(f"Refusal accuracy: {refusals_correct}/{total_unanswerable} = {refusals_correct / total_unanswerable:.2f}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python eval/run_eval.py <book_id>")
        sys.exit(1)
    main(sys.argv[1])
