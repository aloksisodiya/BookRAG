import { useCallback, useState } from "react";
import { askQuestion, apiErrorMessage } from "../api/client.js";

export function useChat(bookId) {
  const [messages, setMessages] = useState([]); // { role, content, sources?, grounded? }
  const [pending, setPending] = useState(false);

  const send = useCallback(async (question) => {
    if (!bookId || !question.trim()) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setPending(true);

    try {
      const result = await askQuestion(bookId, question, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, sources: result.sources, grounded: result.grounded },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: apiErrorMessage(err), sources: [], grounded: false, isError: true },
      ]);
    } finally {
      setPending(false);
    }
  }, [bookId, messages]);

  const reset = useCallback(() => setMessages([]), []);

  return { messages, pending, send, reset };
}
