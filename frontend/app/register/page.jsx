"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../../src/services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: role,
        createdAt: new Date().toISOString()
      });

      if (role === 'admin') router.push('/admin');
      else router.push('/citizen');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: role,
          createdAt: new Date().toISOString()
        });
      }
      
      const finalRole = userDoc.exists() ? userDoc.data().role : role;
      
      if (finalRole === 'admin') router.push('/admin');
      else router.push('/citizen');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ width: '400px' }}>
        <h2 style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>Register</h2>
        {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleRegister}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="citizen">Citizen</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="neon-btn accent" style={{ width: '100%' }}>Sign Up</button>
        </form>

        <div style={{ margin: '15px 0', textAlign: 'center', color: 'gray' }}>OR</div>
        <button onClick={handleGoogleRegister} className="neon-btn" style={{ width: '100%', borderColor: '#db4437', color: '#db4437' }}>
          Continue with Google
        </button>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--accent)' }}>Login</a>
        </p>
      </motion.div>
    </div>
  );
}
