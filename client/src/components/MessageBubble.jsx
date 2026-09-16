import { SourceChip } from "./SourceChip.jsx";

export function MessageBubble({ message }) {
  const isAssistant = message.role === "assistant";
  const notGrounded = isAssistant && message.grounded === false && !message.isError;

  const classes = [
    "message-bubble",
    message.role,
    notGrounded ? "not-grounded" : "",
    message.isError ? "is-error" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`message-row ${message.role}`}>
      <div className={classes}>
        <div>{message.content}</div>
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="sources-block">
            <div className="sources-label">Sources</div>
            {message.sources.map((s, i) => (
              <SourceChip key={i} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
