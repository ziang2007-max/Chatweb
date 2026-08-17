import React, { useState } from 'react';
import { Video, MessageSquare, UserPlus, Check, X, Search } from 'lucide-react';

function FriendsList({ 
  friends, 
  friendRequests, 
  onlineUsers, 
  currentUserId, 
  onCallUser, 
  onStartChat,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/users/search?q=${query}&currentUserId=${currentUserId}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const isOnline = (userId) => {
    return onlineUsers.some(u => u.id === userId);
  };

  const getSocketId = (userId) => {
    const user = onlineUsers.find(u => u.id === userId);
    return user ? user.socketId : null;
  };

  return (
    <div className="online-users-panel glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Search Area */}
      <div className="search-area" style={{ marginBottom: '1rem' }}>
        <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem' }}>
          <Search size={18} style={{ marginRight: '0.5rem', color: 'rgba(255,255,255,0.6)' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm người dùng..." 
            value={searchQuery}
            onChange={handleSearch}
            style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Search Results */}
        {isSearching && (
          <div className="search-results">
            <h4 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Kết quả tìm kiếm</h4>
            <div className="users-list">
              {searchResults.length === 0 ? (
                <p className="no-users" style={{ fontSize: '0.85rem' }}>Không tìm thấy người dùng nào.</p>
              ) : (
                searchResults.map(user => {
                  const isAlreadyFriend = friends.some(f => f.id === user.id);
                  return (
                  <div key={user.id} className="user-item" style={{ padding: '0.5rem' }}>
                    <span className="user-name">{user.username}</span>
                    {!isAlreadyFriend && (
                      <button 
                        className="call-btn chat-btn"
                        title="Kết bạn"
                        onClick={() => onSendRequest(user.id)}
                        style={{ padding: '0.4rem', background: 'rgba(59, 130, 246, 0.5)' }}
                      >
                        <UserPlus size={16} />
                      </button>
                    )}
                  </div>
                )})
              )}
            </div>
          </div>
        )}

        {/* Friend Requests */}
        {!isSearching && friendRequests.length > 0 && (
          <div className="friend-requests">
            <h4 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Lời mời kết bạn ({friendRequests.length})</h4>
            <div className="users-list">
              {friendRequests.map(req => (
                <div key={req.id} className="user-item" style={{ padding: '0.5rem' }}>
                  <span className="user-name">{req.sender.username}</span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button 
                      className="call-btn chat-btn"
                      title="Chấp nhận"
                      onClick={() => onAcceptRequest(req.id)}
                      style={{ padding: '0.3rem', background: 'rgba(34, 197, 94, 0.5)' }}
                    >
                      <Check size={14} />
                    </button>
                    <button 
                      className="call-btn chat-btn"
                      title="Từ chối"
                      onClick={() => onRejectRequest(req.id)}
                      style={{ padding: '0.3rem', background: 'rgba(239, 68, 68, 0.5)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        {!isSearching && (
          <div className="friends-list-area">
            <h4 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Bạn bè ({friends.length})</h4>
            <div className="users-list">
              {friends.length === 0 ? (
                <p className="no-users" style={{ fontSize: '0.85rem' }}>Bạn chưa có người bạn nào.</p>
              ) : (
                friends.map((user) => {
                  const online = isOnline(user.id);
                  const socketId = getSocketId(user.id);

                  return (
                    <div key={user.id} className="user-item" style={{ opacity: online ? 1 : 0.6 }}>
                      <div className="user-info">
                        <div className="online-indicator" style={{ background: online ? '#10b981' : '#6b7280', boxShadow: online ? '0 0 8px #10b981' : 'none' }}></div>
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
                        {online && socketId && (
                          <button 
                            className="call-btn" 
                            onClick={() => onCallUser(socketId, user.username)}
                            title={`Call ${user.username}`}
                            style={{ padding: '0.4rem' }}
                          >
                            <Video size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default FriendsList;
