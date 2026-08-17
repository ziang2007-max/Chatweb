import React, { useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

function VideoCallModal({
  localStream,
  remoteStream,
  isReceivingCall,
  callerName,
  isCallAccepted,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
  isMuted,
  isVideoOff,
  toggleMute,
  toggleVideo
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (isReceivingCall && !isCallAccepted) {
    return (
      <div className="video-modal-overlay">
        <div className="glass-panel incoming-call-modal">
          <h3>Incoming Video Call</h3>
          <p>{callerName} is calling you...</p>
          <div className="call-actions">
            <button className="accept-btn" onClick={onAcceptCall}>Accept</button>
            <button className="decline-btn" onClick={onDeclineCall}>Decline</button>
          </div>
        </div>
      </div>
    );
  }

  if (localStream || remoteStream) {
    return (
      <div className="video-modal-overlay active-call">
        <div className="video-container">
          {/* Remote Video (Large) */}
          <div className="remote-video-wrapper">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
              />
            ) : (
              <div className="waiting-text">Waiting for connection...</div>
            )}
          </div>
          
          {/* Local Video (Small, floating) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />

          {/* Controls */}
          <div className="video-controls">
            <button className="control-btn" onClick={toggleMute}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button className="control-btn" onClick={toggleVideo}>
              {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
            <button className="control-btn end-call-btn" onClick={onEndCall}>
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default VideoCallModal;
