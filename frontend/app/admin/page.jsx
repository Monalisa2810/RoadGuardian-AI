"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../../src/services/firebase';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../../src/components/Map'), { ssr: false });

const ReportLocation = ({ lat, lon }) => {
  const [address, setAddress] = useState("Resolving address...");
  
  useEffect(() => {
    if (!lat || !lon) {
      setAddress("Location coordinates missing");
      return;
    }
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      .then(res => res.json())
      .then(data => {
        if (data.display_name) setAddress(data.display_name);
        else setAddress(`${lat}, ${lon}`);
      })
      .catch(() => setAddress(`${lat}, ${lon}`));
  }, [lat, lon]);

  if (!lat || !lon) return null;

  return (
    <div style={{ marginTop: '15px', marginBottom: '15px' }}>
      <p style={{ color: 'var(--success)', marginBottom: '10px' }}><strong>📍 Location:</strong> {address}</p>
      <div style={{ height: '200px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
        <Map position={[lat, lon]} />
      </div>
    </div>
  );
};

export default function AdminPortal() {
  const [data, setData] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const router = useRouter();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  useEffect(() => {
    const fetchAnalytics = () => {
      fetch(`${API_URL}/analytics`)
        .then(res => res.json())
        .then(json => setData(json))
        .catch(err => console.error(err));
    };
    
    // Fetch immediately
    fetchAnalytics();
    
    const interval = setInterval(fetchAnalytics, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/report/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Optimistically update the UI
        setData(prev => {
          if (!prev) return prev;
          const updatedReports = prev.recent_reports.map(r => 
            r.report_id === reportId ? { ...r, status: newStatus } : r
          );
          return { ...prev, recent_reports: updatedReports };
        });
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (!data) return <div style={{ color: 'white', padding: '20px', display: 'flex', justifyContent: 'center' }}>Loading analytics...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--accent)', margin: 0 }}>Admin Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ textAlign: 'center' }}>
          <h2>Total Reports</h2>
          <p style={{ fontSize: '3rem', color: 'var(--primary)', textShadow: '0 0 10px var(--primary-glow)' }}>{data.total_reports}</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel" style={{ textAlign: 'center' }}>
          <h2>High Risk Incidents</h2>
          <p style={{ fontSize: '3rem', color: 'var(--danger)' }}>{data.high_risk_reports}</p>
        </motion.div>
      </div>

      <h2 style={{ color: 'white', marginBottom: '15px' }}>Recent AI Analysis</h2>
      
      {data.recent_reports?.length === 0 && <p>No reports found.</p>}
      
      {data.recent_reports?.map((report, i) => (
        <motion.div 
          key={report.report_id} 
          onClick={() => setExpandedId(expandedId === report.report_id ? null : report.report_id)}
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: i * 0.1 }}
          className="glass-panel" 
          style={{ marginBottom: '20px', cursor: 'pointer', borderLeft: report.reasoning?.risk === 'High' ? '4px solid var(--danger)' : '4px solid var(--primary)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ color: 'var(--primary)' }}>{report.vision?.damage}</h3>
            <span>Severity: {report.vision?.severity}/10</span>
          </div>
          
          <p>
            <strong>Status:</strong> 
            <select 
              value={report.status || "Pending"} 
              onChange={(e) => {
                e.stopPropagation();
                handleStatusChange(report.report_id, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ marginLeft: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--accent)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </p>
          <p><strong>Recommended Team:</strong> {report.planning?.recommended_team}</p>
          <p><strong>Repair Window:</strong> {report.planning?.repair_window}</p>
          
          <ReportLocation lat={report.location?.latitude} lon={report.location?.longitude} />
          
          <div style={{ marginTop: '15px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
            <p><em>"{report.report?.summary}"</em></p>
          </div>
          
          <AnimatePresence>
            {expandedId === report.report_id && report.media_url && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: '15px', overflow: 'hidden' }}
              >
                <h4 style={{ color: 'var(--accent)', marginBottom: '10px' }}>📸 Attached Evidence</h4>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
                  {report.media_url.endsWith('.mp4') || report.media_url.endsWith('.webm') ? (
                    <video src={report.media_url} controls autoPlay loop style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#000' }} />
                  ) : (
                    <img src={report.media_url} style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#000' }} />
                  )}
                  
                  {/* Floating Severity Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    backgroundColor: report.reasoning?.risk === 'High' ? 'var(--danger)' : 'var(--primary)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 10,
                    backdropFilter: 'blur(5px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    Severity: {report.vision?.severity}/10
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
