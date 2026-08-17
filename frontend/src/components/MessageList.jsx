import { useEffect, useRef } from 'react';

function MessageList({ messages, currentUserId }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <>
      {messages.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
          No messages yet. Be the first to say hi!
        </div>
      ) : (
        messages.map((msg, index) => {
          const isMine = msg.authorId === currentUserId;
          return (
            <div key={index} className={`message-wrapper ${isMine ? 'mine' : 'others'}`}>
              {!isMine && <div className="message-author">{msg.author?.username || 'Unknown'}</div>}
              <div className="message-bubble">
                {msg.content}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </>
  );
}

export default MessageList;
