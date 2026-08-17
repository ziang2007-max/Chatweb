import React from 'react';
import { Video, MessageSquare } from 'lucide-react';

function OnlineUsersList({ users, currentUserId, onCallUser, onStartChat }) {
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="online-users-panel glass-panel">
      <h3>Online Users ({otherUsers.length})</h3>
      <div className="users-list">
        {otherUsers.length === 0 ? (
          <p className="no-users">No one else is online right now.</p>
        ) : (
          otherUsers.map((user) => (
            <div key={user.socketId} className="user-item">
              <div className="user-info">
                <div className="online-indicator"></div>
                <span className="user-name">{user.username}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="call-btn chat-btn" 
                  onClick={() => onStartChat(user)}
                  title={`Chat with ${user.username}`}
                  style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.1)' }}
                >
                  <MessageSquare size={16} />
                </button>
                <button 
                  className="call-btn" 
                  onClick={() => onCallUser(user.socketId, user.username)}
                  title={`Call ${user.username}`}
                  style={{ padding: '0.4rem' }}
                >
                  <Video size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default OnlineUsersList;
