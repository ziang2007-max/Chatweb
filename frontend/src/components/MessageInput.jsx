import { useState, useRef } from 'react';
import { Camera, Mic, Square } from 'lucide-react';
import CameraModal from './CameraModal';

function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage({ content: message, type: 'TEXT' });
      setMessage('');
    }
  };

  const handleCapture = (dataUrl) => {
    onSendMessage({ content: dataUrl, type: 'IMAGE' });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Let the browser choose its preferred default codec
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          onSendMessage({ content: reader.result, type: 'AUDIO' });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Cannot access microphone!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%', gap: '0.5rem', alignItems: 'center' }}>
        <button 
          type="button" 
          onClick={() => setShowCamera(true)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.5rem' }}
          title="Take a photo"
        >
          <Camera size={24} />
        </button>

        {isRecording ? (
          <button 
            type="button" 
            onClick={stopRecording}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            title="Stop recording"
          >
            <Square size={24} fill="#ef4444" />
            <span style={{ fontSize: '0.875rem' }}>Recording...</span>
          </button>
        ) : (
          <button 
            type="button" 
            onClick={startRecording}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.5rem' }}
            title="Record audio message"
          >
            <Mic size={24} />
          </button>
        )}

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isRecording ? "Recording audio..." : "Type a message..."}
          disabled={isRecording}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={isRecording}>Send</button>
      </form>

      {showCamera && (
        <CameraModal 
          onCapture={handleCapture} 
          onClose={() => setShowCamera(false)} 
        />
      )}
    </>
  );
}

export default MessageInput;
