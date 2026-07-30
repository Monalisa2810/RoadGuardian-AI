"use client";

import { useEffect, useState } from 'react';
import { auth, db } from '@/services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function CitizenPortal() {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("Locating...");
  const [notifications, setNotifications] = useState([]);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Auto Location & Live Tracking
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setPosition([lat, lon]);
        
        // Reverse Geocoding via Nominatim
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

    // Realtime Notifications for Region
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

    return () => {
      navigator.geolocation.clearWatch(watchId);
      unsubscribe();
    };
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !position) return alert("Please allow location and select an image.");
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", auth.currentUser?.uid || "anonymous");
      formData.append("latitude", position[0]);
      formData.append("longitude", position[1]);

      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        alert("Report submitted successfully! The AI is analyzing it.");
        setFile(null);
      }
    } catch (err) {
      console.error(err);
      alert("Submission failed.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '20px' }}>Citizen Dashboard</h1>
      
      {/* Notifications */}
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

      <div className="glass-panel">
        <h3>Report Road Damage</h3>
        <form onSubmit={handleUpload}>
          <input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files[0])} />
          <button type="submit" className="neon-btn" disabled={submitting}>
            {submitting ? "Analyzing..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
