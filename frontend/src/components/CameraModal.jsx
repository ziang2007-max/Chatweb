import { useEffect, useRef } from 'react';
import { X, Camera } from 'lucide-react';

function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let isActive = true;
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isActive) {
            alert("Trình duyệt không hỗ trợ Camera (hoặc bạn đang không dùng localhost/HTTPS)!");
            onClose();
          }
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (!isActive) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Play error:", e));
        }
      } catch (err) {
        if (isActive) {
          console.error("Error accessing camera:", err);
          alert("Lỗi khi mở Camera: " + err.message);
          onClose();
        }
      }
    };
    startCamera();

    return () => {
      isActive = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // nén một chút (quality 0.8)
      onCapture(dataUrl);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content glass-panel" style={contentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>Capture Image</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}><X /></button>
        </div>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
        <button onClick={handleCapture} style={captureBtnStyle}>
          <Camera size={20} /> Capture & Send
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const contentStyle = {
  width: '400px',
  maxWidth: '90%',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column'
};

const captureBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.75rem',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer'
};

export default CameraModal;
