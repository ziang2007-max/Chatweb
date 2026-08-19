import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import FriendsList from '../components/FriendsList';
import VideoCallModal from '../components/VideoCallModal';

function Chat({ setIsAuthenticated }) {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // null means Global Chat
  const activeChatRef = useRef(null);
  
  // Friend States
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const socketRef = useRef(null);

  // WebRTC States
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerRef = useRef(null);
  const otherUserSocketId = useRef(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  const fetchFriends = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/users/${user.id}/friends`);
      const data = await res.json();
      setFriends(data.friends || []);
      setFriendRequests(data.friendRequests || []);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const fetchMessages = () => {
    let url = `${backendUrl}/api/messages`;
    if (activeChatRef.current) {
      url += `?userId=${user.id}&receiverId=${activeChatRef.current.id}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error('Failed to fetch messages:', err));
  };

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user?.id]);

  useEffect(() => {
    activeChatRef.current = activeChat;
    fetchMessages();
  }, [activeChat]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch(e) {
      console.log("Audio play error", e);
    }
  };

  useEffect(() => {
    if (!user) {
      setIsAuthenticated(false);
      navigate('/login');
      return;
    }

    socketRef.current = io(backendUrl);
    socketRef.current.emit('register', user);

    // Listeners
    socketRef.current.on('newMessage', (message) => {
      if (message.authorId !== user.id) {
        playNotificationSound();
      }
      setMessages((prev) => {
        const currentActiveChat = activeChatRef.current;
        const isGlobalMessage = !message.receiverId;
        const isCurrentlyGlobal = !currentActiveChat;
        
        if (isCurrentlyGlobal && isGlobalMessage) {
           return [...prev, message];
        }
        
        if (!isCurrentlyGlobal && !isGlobalMessage) {
           const isFromActiveChat = message.authorId === currentActiveChat.id || message.receiverId === currentActiveChat.id;
           if (isFromActiveChat) return [...prev, message];
        }
        return prev;
      });
    });

    socketRef.current.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('receiveFriendRequest', () => {
      fetchFriends();
    });

    // --- WebRTC Signaling Listeners ---
    socketRef.current.on('callUser', ({ from, name, signal }) => {
      setIsReceivingCall(true);
      setCaller({ socketId: from, name, signal });
      otherUserSocketId.current = from;
    });

    socketRef.current.on('callAccepted', (signal) => {
      setIsCallAccepted(true);
      if (peerRef.current) {
        peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
    });

    socketRef.current.on('iceCandidate', ({ candidate }) => {
      if (peerRef.current) {
        peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.log('Add Ice Error', e));
      }
    });

    socketRef.current.on('callEnded', () => {
      endCallLocally();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [navigate, setIsAuthenticated, user?.id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const handleSendMessage = (messageData) => {
    const isString = typeof messageData === 'string';
    const content = isString ? messageData : messageData.content;
    const type = isString ? 'TEXT' : messageData.type;

    if (content && socketRef.current) {
      socketRef.current.emit('sendMessage', {
        content,
        type,
        authorId: user.id,
        receiverId: activeChat ? activeChat.id : null
      });
    }
  };

  // --- Friendship Methods ---
  const handleSendRequest = async (friendId) => {
    try {
      await fetch(`${backendUrl}/api/users/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId })
      });
      if (socketRef.current) {
        socketRef.current.emit('sendFriendRequest', { senderId: user.id, receiverId: friendId });
      }
      alert('Đã gửi lời mời kết bạn!');
    } catch (error) {
      console.error('Send request error:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      const data = await response.json();
      fetchFriends(); // Refresh lists
      if (socketRef.current && data.friendship) {
        const otherUserId = data.friendship.userId === user.id ? data.friendship.friendId : data.friendship.userId;
        socketRef.current.emit('friendRequestHandled', { receiverId: otherUserId });
      }
    } catch (error) {
      console.error('Accept error:', error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await fetch(`${backendUrl}/api/users/friends/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      const data = await response.json();
      fetchFriends(); // Refresh lists
      if (socketRef.current && data.friendship) {
        const otherUserId = data.friendship.userId === user.id ? data.friendship.friendId : data.friendship.userId;
        socketRef.current.emit('friendRequestHandled', { receiverId: otherUserId });
      }
    } catch (error) {
      console.error('Reject error:', error);
    }
  };

  // --- WebRTC Methods ---
  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices.", err);
      alert("Cannot access camera/microphone");
      return null;
    }
  };

  const createPeer = (stream, toSocketId) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]
    });

    stream.getTracks().forEach(track => {
      peer.addTrack(track, stream);
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('iceCandidate', { to: toSocketId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return peer;
  };

  const callUser = async (userToCallSocketId, name) => {
    otherUserSocketId.current = userToCallSocketId;
    const stream = await getMedia();
    if (!stream) return;

    const peer = createPeer(stream, userToCallSocketId);
    peerRef.current = peer;

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socketRef.current.emit('callUser', {
      userToCall: userToCallSocketId,
      signalData: offer,
      from: socketRef.current.id,
      name: user.username
    });
  };

  const acceptCall = async () => {
    setIsCallAccepted(true);
    const stream = await getMedia();
    if (!stream) return;

    const peer = createPeer(stream, caller.socketId);
    peerRef.current = peer;

    await peer.setRemoteDescription(new RTCSessionDescription(caller.signal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socketRef.current.emit('answerCall', {
      to: caller.socketId,
      signal: answer
    });
  };

  const declineCall = () => {
    setIsReceivingCall(false);
    socketRef.current.emit('endCall', { to: caller.socketId });
    setCaller(null);
  };

  const endCallLocally = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setIsCallAccepted(false);
    setIsReceivingCall(false);
    setCaller(null);
  };

  const handleEndCall = () => {
    socketRef.current.emit('endCall', { to: otherUserSocketId.current });
    endCallLocally();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  if (!user) return null;

  return (
    <div className="chat-layout">
      <div className="chat-container main-chat-area">
        <div className="glass-panel chat-header">
          <div>
            <h2>{activeChat ? `Chat with ${activeChat.username}` : "Global Chat Room"}</h2>
            <p>Logged in as: <strong>{user.username}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              className="logout-btn" 
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              onClick={() => navigate('/feed')}
            >
              News Feed
            </button>
            {activeChat && (
              <button 
                className="logout-btn" 
                style={{ background: 'rgba(59, 130, 246, 0.5)' }}
                onClick={() => setActiveChat(null)}
              >
                Back to Global
              </button>
            )}
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        
        <div className="glass-panel messages-area">
          <MessageList messages={messages} currentUserId={user.id} isGlobalChat={!activeChat} />
        </div>

        <div className="glass-panel message-input-area">
          <MessageInput onSendMessage={handleSendMessage} />
        </div>
      </div>

      <div className="sidebar-area">
        <FriendsList 
          friends={friends}
          friendRequests={friendRequests}
          onlineUsers={onlineUsers} 
          currentUserId={user.id} 
          onCallUser={callUser}
          onStartChat={(chatUser) => setActiveChat(chatUser)}
          onSendRequest={handleSendRequest}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
        />
      </div>

      <VideoCallModal 
        localStream={localStream}
        remoteStream={remoteStream}
        isReceivingCall={isReceivingCall}
        callerName={caller?.name}
        isCallAccepted={isCallAccepted}
        onAcceptCall={acceptCall}
        onDeclineCall={declineCall}
        onEndCall={handleEndCall}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        toggleMute={toggleMute}
        toggleVideo={toggleVideo}
      />
    </div>
  );
}

export default Chat;
