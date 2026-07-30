"use client";

import { useEffect, useState, useRef } from 'react';
import { auth, db } from '../../src/services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../../src/components/Map'), { ssr: false });

export default function CitizenPortal() {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("Locating...");
  const [notifications, setNotifications] = useState([]);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const router = useRouter();

  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFrameTime = useRef(0);
  const processingFrame = useRef(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setPosition([lat, lon]);
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const data = await res.json();
          if (data.display_name) setAddress(data.display_name);
        } catch (e) {
          console.error("Geocoding failed", e);
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    const q = query(collection(db, "reports"), where("reasoning.risk", "==", "High"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          setNotifications(prev => [...prev, `ALERT: High severity damage reported near you!`]);
          setTimeout(() => {
            setNotifications(prev => prev.slice(1));
          }, 5000);
        }
      });
    });

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      const uid = user ? user.uid : "anonymous";
      fetchUserReports(uid);
      // Also poll every 10s to keep status updated
      const interval = setInterval(() => fetchUserReports(uid), 10000);
      
      // Cleanup for this specific auth state
      return () => clearInterval(interval);
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
      unsubscribe();
      unsubscribeAuth();
    };
  }, []);

  const fetchUserReports = async (uid) => {
    try {
      const res = await fetch(`${API_URL}/user/reports?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setMyReports(data.reports);
      }
    } catch (e) {
      console.error("Failed to fetch user reports", e);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setAnalysisResult(null);
      setIsVideo(selected.type.startsWith('video'));
      setPreviewUrl(URL.createObjectURL(selected));
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const drawOverlay = (result, origWidth, origHeight, mediaElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !mediaElement) return;
    
    // Position the canvas exactly over the rendered media
    const rect = mediaElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    const scaleX = canvas.width / origWidth;
    const scaleY = canvas.height / origHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Weather Badge if present
    if (result.weather) {
      const weatherText = `🌤️ Weather: ${result.weather.condition} (${Math.round(result.weather.confidence * 100)}%)`;
      ctx.font = 'bold 18px sans-serif';
      const textWidth = ctx.measureText(weatherText).width;
      
      // Floating glass-like badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(10, 10, textWidth + 30, 40, 8);
      ctx.fill();
      
      ctx.fillStyle = '#4da6ff'; // Soft blue
      ctx.fillText(weatherText, 25, 37);
    }
    
    // Draw Pothole Detections
    if (result.detections) {
      result.detections.forEach(d => {
        const box = d.bounding_box;
        if (!box || box.length !== 4) return;
        
        const x = box[0] * scaleX;
        const y = box[1] * scaleY;
        const width = (box[2] - box[0]) * scaleX;
        const height = (box[3] - box[1]) * scaleY;
        
        ctx.strokeStyle = '#00ffcc'; // Neon Cyan
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
        
        ctx.fillStyle = '#00ffcc';
        const text = `${d.damage} (Sev: ${d.severity}/10)`;
        ctx.font = 'bold 16px sans-serif';
        
        // Background for text
        ctx.fillRect(x, y - 25, ctx.measureText(text).width + 10, 25);
        
        ctx.fillStyle = '#000';
        ctx.fillText(text, x + 5, y - 7);
      });
    }
  };

  const processFrame = async (blob, origWidth, origHeight, mediaElement) => {
    if (!blob) return;
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');
    
    try {
      const res = await fetch(`${API_URL}/predict/frame`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        drawOverlay(result, origWidth, origHeight, mediaElement);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth;
    offCanvas.height = img.naturalHeight;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    offCanvas.toBlob((blob) => {
      processFrame(blob, img.naturalWidth, img.naturalHeight, img);
    }, 'image/jpeg', 1.0);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || processingFrame.current) return;
    
    // Instead of throttling to 1 FPS, we run as fast as the local backend can handle!
    // As long as the previous frame is done processing, we instantly send the next one.
    processingFrame.current = true;
    
    const video = videoRef.current;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = video.videoWidth;
    offCanvas.height = video.videoHeight;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
    
    offCanvas.toBlob(async (blob) => {
      await processFrame(blob, video.videoWidth, video.videoHeight, video);
      processingFrame.current = false;
    }, 'image/jpeg', 1.0);
  };

  const togglePlay = (e) => {
    e.preventDefault();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const skipTime = (e, seconds) => {
    e.preventDefault();
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
      // Force a frame update when skipping even if paused
      handleTimeUpdate();
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !position) return alert("Please allow location and select an image/video.");
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", auth.currentUser?.uid || "anonymous");
      formData.append("latitude", position[0]);
      formData.append("longitude", position[1]);

      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        setAnalysisResult(result);
        const uid = auth.currentUser ? auth.currentUser.uid : "anonymous";
        fetchUserReports(uid); // Refresh list
        alert("Report submitted successfully to the Admin Dashboard!");
      }
    } catch (err) {
      console.error(err);
      alert("Submission failed.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--primary)', margin: 0 }}>Citizen Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
      </div>
      
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
        <AnimatePresence>
          {notifications.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="glass-panel" style={{ marginBottom: '10px', borderLeft: '4px solid var(--danger)' }}>
              {msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3>Live GPS Tracking</h3>
        <p style={{ color: 'var(--success)' }}>{address}</p>
        <div style={{ marginTop: '15px' }}>
          <Map position={position} />
        </div>
      </div>

      {previewUrl && (
        <div style={{ marginBottom: '20px' }}>
          <div className="glass-panel" style={{ position: 'relative', display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: 0 }}>
            {isVideo ? (
              <video 
                ref={videoRef}
                src={previewUrl} 
                autoPlay 
                loop 
                muted 
                playsInline
                style={{ maxHeight: '500px', maxWidth: '100%', borderRadius: '8px' }} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => { e.target.playbackRate = 0.4; }}
              />
            ) : (
              <img 
                ref={imgRef}
                src={previewUrl} 
                style={{ maxHeight: '500px', maxWidth: '100%', borderRadius: '8px' }} 
                onLoad={handleImageLoad}
              />
            )}
            <canvas 
              ref={canvasRef} 
              style={{ position: 'absolute', pointerEvents: 'none', top: 0 }}
            />
          </div>
          
          {isVideo && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
              <button className="neon-btn" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={(e) => skipTime(e, -10)}>-10s</button>
              <button className="neon-btn" style={{ padding: '8px 24px', fontSize: '14px' }} onClick={togglePlay}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="neon-btn" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={(e) => skipTime(e, 10)}>+10s</button>
            </div>
          )}
        </div>
      )}

      <div className="glass-panel">
        <h3>Report Road Damage</h3>
        <form onSubmit={handleUpload}>
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
          <button type="submit" className="neon-btn" disabled={submitting}>
            {submitting ? "Analyzing with AI..." : "Submit Official Report"}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {analysisResult && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel" 
            style={{ marginTop: '20px', borderLeft: analysisResult.reasoning?.risk === 'High' ? '4px solid var(--danger)' : '4px solid var(--primary)' }}
          >
            <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>Final AI Assessment Sent to City</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><strong>Detected Damage:</strong> {analysisResult.vision?.damage}</div>
              <div><strong>Severity:</strong> {analysisResult.vision?.severity}/10</div>
              <div><strong>Risk Level:</strong> <span style={{ color: analysisResult.reasoning?.risk === 'High' ? 'var(--danger)' : 'var(--success)' }}>{analysisResult.reasoning?.risk}</span></div>
              <div><strong>Recommended Team:</strong> {analysisResult.planning?.recommended_team}</div>
            </div>
            <div style={{ marginTop: '15px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
              <p><em>"{analysisResult.report?.summary}"</em></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Reports Section */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>My Past Reports</h2>
        {myReports.length === 0 && <p>No reports submitted yet.</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {myReports.map((report, i) => (
            <motion.div 
              key={report.report_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel"
              style={{ padding: '15px', position: 'relative' }}
            >
              {/* Dynamic Status Badge */}
              <div style={{ 
                position: 'absolute', top: '15px', right: '15px', 
                backgroundColor: report.status === 'Completed' ? 'var(--success)' : report.status === 'In Progress' ? 'var(--accent)' : 'var(--primary)',
                color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
              }}>
                {report.status || "Pending"}
              </div>
              
              <h4 style={{ margin: 0, color: 'white' }}>{report.vision?.damage}</h4>
              <p style={{ margin: '5px 0', fontSize: '14px', color: '#ccc' }}>Severity: {report.vision?.severity}/10</p>
              
              {report.media_url && (
                <div style={{ marginTop: '10px', height: '120px', overflow: 'hidden', borderRadius: '4px' }}>
                  {report.media_url.endsWith('.mp4') || report.media_url.endsWith('.webm') ? (
                    <video src={report.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={report.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
