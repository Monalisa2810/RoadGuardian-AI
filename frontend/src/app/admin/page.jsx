"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function AdminPortal() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/analytics')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error(err));
  }, []);

  if (!data) return <div style={{ color: 'white', padding: '20px', display: 'flex', justifyContent: 'center' }}>Loading analytics...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--accent)', marginBottom: '20px' }}>Admin Dashboard</h1>
      
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
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: i * 0.1 }}
          className="glass-panel" 
          style={{ marginBottom: '20px', borderLeft: report.reasoning?.risk === 'High' ? '4px solid var(--danger)' : '4px solid var(--primary)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ color: 'var(--primary)' }}>{report.vision?.damage}</h3>
            <span>Severity: {report.vision?.severity}/10</span>
          </div>
          
          <p><strong>Status:</strong> {report.status}</p>
          <p><strong>Recommended Team:</strong> {report.planning?.recommended_team}</p>
          <p><strong>Repair Window:</strong> {report.planning?.repair_window}</p>
          
          <div style={{ marginTop: '15px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
            <p><em>"{report.report?.summary}"</em></p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
