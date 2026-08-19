import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Camera, X, MessageSquare, ArrowLeft, CornerDownRight } from 'lucide-react';
import CameraModal from '../components/CameraModal';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [replyingTo, setReplyingTo] = useState(null); // { postId, commentId }

  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchPosts();

    socketRef.current = io(backendUrl);

    socketRef.current.on('newPost', (post) => {
      setPosts((prev) => [post, ...prev]);
    });

    socketRef.current.on('newComment', (comment) => {
      setPosts((prev) => prev.map(post => {
        if (post.id === comment.postId) {
          const currentComments = post.comments || [];
          const exists = currentComments.some(c => c.id === comment.id);
          if (!exists) {
            return { ...post, comments: [...currentComments, comment] };
          }
        }
        return post;
      }));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, navigate, backendUrl]);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/posts`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const handleCapture = (dataUrl) => {
    setImage(dataUrl);
  };

  const handlePost = async () => {
    if (!caption.trim() && !image) return;

    try {
      const res = await fetch(`${backendUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: image,
          caption,
          authorId: user.id
        })
      });
      const data = await res.json();
      if (socketRef.current) {
        socketRef.current.emit('newPost', data);
      }
      setCaption('');
      setImage(null);
    } catch (err) {
      console.error('Error posting:', err);
    }
  };

  const handleCommentSubmit = async (postId, parentId = null) => {
    const inputKey = parentId ? `${postId}-${parentId}` : `${postId}-root`;
    const content = commentInputs[inputKey];
    
    if (!content || !content.trim()) return;

    try {
      const res = await fetch(`${backendUrl}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          authorId: user.id,
          parentId
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert("Lỗi từ server: " + (data.error || "Không thể bình luận"));
        return;
      }

      if (socketRef.current) {
        socketRef.current.emit('newComment', data);
      }
      
      // Clear input and reply state
      commentInputs[inputKey] = '';
      const el = document.getElementById(parentId ? `input-${postId}-${parentId}` : `input-root-${postId}`);
      if (el) el.value = '';
      
      if (parentId) {
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Error commenting:', err);
      alert("Lỗi khi kết nối tới server để bình luận!");
    }
  };

  // Helper to build comment tree
  const buildCommentTree = (comments = []) => {
    const commentMap = {};
    const rootComments = [];

    comments.forEach(c => {
      commentMap[c.id] = { ...c, children: [] };
    });

    comments.forEach(c => {
      if (c.parentId) {
        if (commentMap[c.parentId]) {
          commentMap[c.parentId].children.push(commentMap[c.id]);
        }
      } else {
        rootComments.push(commentMap[c.id]);
      }
    });

    return rootComments;
  };

  const renderCommentTree = (comments, postId, depth = 0) => {
    return comments.map(comment => (
      <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', marginTop: '0.75rem', marginLeft: depth > 0 ? '2rem' : '0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', borderLeft: depth > 0 ? '2px solid #3b82f6' : 'none', wordBreak: 'break-word' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#60a5fa' }}>{comment.author.username}</div>
          <div style={{ fontSize: '0.95rem', marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{comment.content}</div>
          
          <button 
            onClick={() => setReplyingTo({ postId, commentId: comment.id })}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
          >
            <CornerDownRight size={14} /> Reply
          </button>
        </div>

        {replyingTo?.postId === postId && replyingTo?.commentId === comment.id && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginLeft: '1rem', alignItems: 'flex-start', width: '100%' }}>
            <textarea
              id={`input-${postId}-${comment.id}`}
              defaultValue=""
              onChange={(e) => {
                commentInputs[`${postId}-${comment.id}`] = e.target.value;
              }}
              placeholder={`Replying to ${comment.author.username}...`}
              style={{ flex: 1, width: '100%', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #555', padding: '0.5rem 1rem', borderRadius: '12px', resize: 'vertical', minHeight: '40px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(postId, comment.id); } }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button 
                onClick={() => handleCommentSubmit(postId, comment.id)}
                style={{ background: 'transparent', color: '#3b82f6', border: 'none', fontWeight: 'bold', cursor: 'pointer', padding: '0.5rem' }}
              >
                Send
              </button>
              <button 
                onClick={() => setReplyingTo(null)}
                style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Render Children */}
        {comment.children && comment.children.length > 0 && renderCommentTree(comment.children, postId, depth + 1)}
      </div>
    ));
  };

  if (!user) return null;

  return (
    <div className="chat-layout" style={{ flexDirection: 'column', alignItems: 'center', padding: '1rem', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Header */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={20} /> Back to Chat
          </button>
          <h2 style={{ margin: 0 }}>News Feed</h2>
          <div style={{ width: '20px' }}></div>
        </div>

        {/* Create Post Area */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>
          
          {image && (
            <div style={{ position: 'relative', width: 'fit-content' }}>
              <img src={image} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px' }} />
              <button 
                onClick={() => setImage(null)}
                style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              onClick={() => setShowCamera(true)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <Camera size={18} /> Add Photo
            </button>
            <button 
              onClick={handlePost}
              disabled={!caption.trim() && !image}
              style={{ padding: '0.5rem 1.5rem', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: (!caption.trim() && !image) ? 'not-allowed' : 'pointer', opacity: (!caption.trim() && !image) ? 0.5 : 1 }}
            >
              Post
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map(post => (
            <div key={post.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Post Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                  {post.author.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{post.author.username}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{new Date(post.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Post Content */}
              {post.caption && <div style={{ fontSize: '1rem', lineHeight: '1.5' }}>{post.caption}</div>}
              {post.imageUrl && (
                <img src={post.imageUrl} alt="Post content" style={{ width: '100%', borderRadius: '12px', marginTop: '0.5rem' }} />
              )}

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

              {/* Comments Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  <MessageSquare size={16} /> Comments
                </div>
                
                {/* Render Comment Tree */}
                {renderCommentTree(buildCommentTree(post.comments || []), post.id)}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', alignItems: 'flex-start', width: '100%' }}>
                  <textarea
                    id={`input-root-${post.id}`}
                    defaultValue=""
                    onChange={(e) => {
                      commentInputs[`${post.id}-root`] = e.target.value;
                    }}
                    placeholder="Write a comment..."
                    style={{ flex: 1, width: '100%', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #555', padding: '0.5rem 1rem', borderRadius: '12px', resize: 'vertical', minHeight: '40px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(post.id, null); } }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button 
                      onClick={() => handleCommentSubmit(post.id, null)}
                      style={{ background: 'transparent', color: '#3b82f6', border: 'none', fontWeight: 'bold', cursor: 'pointer', padding: '0.5rem' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))}

          {posts.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '2rem' }}>
              No posts yet. Be the first to share something!
            </div>
          )}
        </div>

      </div>

      {showCamera && (
        <CameraModal 
          onCapture={handleCapture} 
          onClose={() => setShowCamera(false)} 
        />
      )}
    </div>
  );
}

export default Feed;
