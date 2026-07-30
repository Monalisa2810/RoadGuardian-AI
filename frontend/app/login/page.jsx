"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../../src/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // HARDCODED DEMO ADMIN BYPASS
    if (email === 'admin@admin.com' && password === 'admin') {
      router.push('/admin');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === 'admin') router.push('/admin');
        else router.push('/citizen');
      } else {
        router.push('/citizen'); 
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === 'admin') router.push('/admin');
        else router.push('/citizen');
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: 'citizen',
          createdAt: new Date().toISOString()
        });
        router.push('/citizen');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ width: '400px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '1rem', textAlign: 'center' }}>Login</h2>
        {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="neon-btn" style={{ width: '100%' }}>Sign In</button>
        </form>
        
        <div style={{ margin: '15px 0', textAlign: 'center', color: 'gray' }}>OR</div>
        <button onClick={handleGoogleLogin} className="neon-btn" style={{ width: '100%', borderColor: '#db4437', color: '#db4437' }}>
          Sign In with Google
        </button>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
          No account? <a href="/register" style={{ color: 'var(--primary)' }}>Register</a>
        </p>
      </motion.div>
    </div>
  );
}
