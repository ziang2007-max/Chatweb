import { useEffect, useRef } from 'react';

function MessageList({ messages, currentUserId, isGlobalChat }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <>
      {isGlobalChat && (
        <div className="message-wrapper others">
          <div className="message-author" style={{ color: '#ff4d4f' }}>Admin</div>
          <div className="message-bubble" style={{ background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.3)' }}>
            Chào mừng đến với web chat vớ vẩn, nơi những câu chuyện được cất giấu
          </div>
        </div>
      )}
      {messages.length === 0 && !isGlobalChat ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
          No messages yet. Be the first to say hi!
        </div>
      ) : (
        messages.map((msg, index) => {
          const isMine = msg.authorId === currentUserId;
          return (
            <div key={index} className={`message-wrapper ${isMine ? 'mine' : 'others'}`}>
              {!isMine && <div className="message-author">{msg.author?.username || 'Unknown'}</div>}
              <div className="message-bubble" style={msg.type === 'IMAGE' ? { padding: '0.5rem', background: 'transparent' } : {}}>
                {msg.type === 'IMAGE' ? (
                  <img src={msg.content} alt="Sent" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }} />
                ) : msg.type === 'AUDIO' ? (
                  <audio controls src={msg.content} style={{ maxWidth: '100%', outline: 'none' }} />
                ) : (
                  msg.content
                )}
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
