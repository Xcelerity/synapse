'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import toast from 'react-hot-toast';
import ThreeBackground from '@/components/ThreeBackground';

function FeatureCard({ item, index }: { item: any; index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (index % 4) * 0.05 }}
            whileHover={{
                y: -12,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
            style={{ position: 'relative', transformStyle: 'preserve-3d' }}
            className="group"
        >
            {/* Glow Layer */}
            <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                style={{
                    position: 'absolute',
                    inset: -2,
                    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                    borderRadius: 34,
                    zIndex: -1,
                    filter: 'blur(12px)',
                }}
            />

            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 32,
                padding: 32,
                height: '100%',
                display: 'flex',
                gap: 24,
                alignItems: 'center',
                transition: 'border-color 0.3s ease',
                transformStyle: 'preserve-3d',
                cursor: 'pointer'
            }} className="group-hover:border-cyan-500/30">
                <div style={{
                    width: 64,
                    height: 64,
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    flexShrink: 0,
                    transform: 'translateZ(20px)'
                }}>{item.icon}</div>

                <div style={{ transform: 'translateZ(10px)' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{item.title}</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                </div>
            </div>
        </motion.div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', gradeLevel: 'undergrad' });

    async function ensureProfile(uid: string, name: string, email: string) {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                displayName: name,
                email,
                gradeLevel: form.gradeLevel,
                studyGoals: [],
                createdAt: serverTimestamp(),
            });
        }
    }

    const handleGoogleAuth = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await ensureProfile(result.user.uid, result.user.displayName || 'Student', result.user.email || '');
            toast.success(mode === 'login' ? 'Welcome back!' : 'Welcome to Synapse!');
            router.push('/dashboard');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Authentication failed');
        } finally { setLoading(false); }
    };

    async function handleEmailAuth(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'register') {
                const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
                await updateProfile(result.user, { displayName: form.name });
                await ensureProfile(result.user.uid, form.name, form.email);
                toast.success('Account created! Welcome to Synapse 🎉');
            } else {
                await signInWithEmailAndPassword(auth, form.email, form.password);
                toast.success('Welcome back!');
            }
            router.push('/dashboard');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Authentication failed';
            toast.error(msg.replace('Firebase: ', '').replace(' (auth/wrong-password).', ''));
        } finally { setLoading(false); }
    }

    const FEATURES = [
        { icon: '🎓', title: 'Socratic Tutor', desc: 'Personalized guidance that helps you discover answers through deep reasoning.' },
        { icon: '🧬', title: 'Research Agent', desc: 'Navigate complex topics with agents that synthesize insights from any source.' },
        { icon: '📝', title: 'Grade Essays', desc: 'Get professional feedback and suggested improvements for your writing.' },
        { icon: '🔍', title: 'Detect AI Content', desc: 'Analyze text to verify authenticity and originality with high precision.' },
        { icon: '✨', title: 'Humanize AI Text', desc: 'Refine synthetic text to sound more natural and engaging while keeping intent.' },
        { icon: '🗣️', title: 'Oral Mastery', desc: 'Real-time interactive practice to perfect your verbal knowledge and delivery.' },
        { icon: '🧩', title: 'Interactive Quizzes', desc: 'Neuro-adaptive tests that evolve as you master each subject area.' },
        { icon: '🎴', title: 'Smart Recall', desc: 'Adaptive spaced repetition that builds rock-solid memory foundations.' },
        { icon: '🌳', title: 'Dynamic Skill Tree', desc: 'Visualize your progress through an organic, growing graph of mastery.' },
        { icon: '⏱️', title: 'Pomodoro Focus', desc: 'Intelligent focus sessions with ambient sounds and distraction guards.' },
        { icon: '📋', title: 'Smart Timetable', desc: 'Automated scheduling that optimizes your study hours for maximum efficiency.' },
        { icon: '📚', title: 'Instant Cheatsheets', desc: 'Summarize entire modules into high-impact, visual study guides.' },
        { icon: '👁️', title: 'OCR Vision', desc: 'Instantly digitize handwritten notes and textbook diagrams for analysis.' },
        { icon: '📊', title: 'Mastery Analytics', desc: 'Deep insights into your learning curves and predictive performance metrics.' },
    ];

    return (
        <div className="login-split" style={{
            minHeight: '100vh',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            background: 'rgba(5, 5, 20, 0.7)',
            fontFamily: '"Outfit", "Inter", sans-serif'
        }}>
            <ThreeBackground />

            {/* Ambient Background Orbs */}
            <div style={{
                position: 'fixed', width: 1000, height: 1000, top: '-10%', left: '-10%',
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
                zIndex: 1, pointerEvents: 'none'
            }} />
            <div style={{
                position: 'fixed', width: 800, height: 800, bottom: '-5%', right: '-5%',
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
                zIndex: 1, pointerEvents: 'none'
            }} />

            <div className="login-features" style={{
                flex: 1.2,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflowY: 'auto',
                padding: '80px',
                position: 'relative',
                zIndex: 10,
                scrollbarWidth: 'none',
            }}>
                <style dangerouslySetInnerHTML={{ __html: `div::-webkit-scrollbar { display: none; }` }} />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                >
                    <motion.div
                        whileHover={{ z: 50, scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40, cursor: 'default', transformStyle: 'preserve-3d' }}
                    >
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                background: '#0a0a0a',
                                borderRadius: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            <img src="/icon.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', transform: 'translateZ(20px)' }} />
                        </div>
                        <div style={{ transformStyle: 'preserve-3d' }}>
                            <h2 style={{
                                fontSize: 36,
                                fontWeight: 950,
                                margin: 0,
                                letterSpacing: '-0.03em',
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                transform: 'translateZ(10px)'
                            }}>Synapse</h2>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: -2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your Best Friend</p>
                        </div>
                    </motion.div>

                    <h1 style={{
                        fontSize: 72,
                        fontWeight: 900,
                        lineHeight: 1.1,
                        marginBottom: 32,
                        letterSpacing: '-0.05em',
                        color: '#fff'
                    }}>
                        Master your crafts <br />
                        <span style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'inline-block'
                        }}>without limits.</span>
                    </h1>

                    <p style={{
                        fontSize: 20,
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.6,
                        marginBottom: 64,
                        maxWidth: 580,
                        fontWeight: 400
                    }}>
                        Intelligent systems designed to support you as your best friend. From essay grading to real-time oral mastery, we equip you with everything needed for academic excellence.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingBottom: 120 }}>
                        {FEATURES.map((item, i) => (
                            <FeatureCard key={i} item={item} index={i} />
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Right Section: Auth Form */}
            <div className="login-auth-panel" style={{
                flex: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                position: 'relative',
                zIndex: 10,
                borderLeft: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <motion.div
                    initial={{ opacity: 0, x: 50, rotateY: 20 }}
                    animate={{ opacity: 1, x: 0, rotateY: 0 }}
                    whileHover={{ rotateY: -5, rotateX: 2, z: 20 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                        width: '100%',
                        maxWidth: 440,
                        background: 'rgba(10, 10, 20, 0.75)',
                        backdropFilter: 'blur(50px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 40,
                        padding: '56px 48px',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 80px rgba(139, 92, 246, 0.1)',
                        position: 'relative',
                        overflow: 'hidden',
                        transformStyle: 'preserve-3d',
                        perspective: '1500px'
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 32, transform: 'translateZ(30px)' }}>
                        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 12 }}>
                            {mode === 'login' ? 'Welcome Back' : 'Get Started'}
                        </h2>
                        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                            {mode === 'login' ? 'Continue your journey with your best friend.' : 'Join the elite circle of learners today.'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 32, transform: 'translateZ(20px)' }}>
                        <button
                            onClick={handleGoogleAuth}
                            disabled={loading}
                            style={{
                                flex: 1,
                                height: 56,
                                borderRadius: 18,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                opacity: loading ? 0.6 : 1
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            <span style={{ marginLeft: 12, fontWeight: 700, color: '#fff', fontSize: 14 }}>Google</span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, transform: 'translateZ(10px)' }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Email Access</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    </div>

                    <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16, transform: 'translateZ(20px)' }}>
                        {mode === 'register' && (
                            <input
                                placeholder="Full Name"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                required
                                style={{ height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0 20px', fontSize: 15 }}
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email address"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                            style={{ height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0 20px', fontSize: 15 }}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                            minLength={6}
                            style={{ height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0 20px', fontSize: 15 }}
                        />

                        {mode === 'register' && (
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={form.gradeLevel}
                                    onChange={e => setForm(f => ({ ...f, gradeLevel: e.target.value as any }))}
                                    style={{ width: '100%', height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0 20px', fontSize: 15, appearance: 'none', cursor: 'pointer' }}
                                >
                                    <option value="k-3">Grade K–3 (Ages 5–8)</option>
                                    <option value="k-6">Grade 4–6 (Ages 9–11)</option>
                                    <option value="middle">Middle School (Ages 12–14)</option>
                                    <option value="high">High School (Ages 15–18)</option>
                                    <option value="undergrad">Undergraduate</option>
                                    <option value="grad">Graduate / Master's</option>
                                    <option value="phd">PhD / Researcher</option>
                                </select>
                            </div>
                        )}

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ y: -4, scale: 1.02, boxShadow: '0 20px 60px rgba(139, 92, 246, 0.4)' }}
                            whileTap={{ y: 0, scale: 0.98 }}
                            style={{
                                height: 56,
                                borderRadius: 18,
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                                border: 'none',
                                color: '#fff',
                                fontSize: 16,
                                fontWeight: 900,
                                cursor: 'pointer',
                                marginTop: 8,
                                transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                                boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
                                opacity: loading ? 0.7 : 1,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            {loading ? 'Thinking...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                        </motion.button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 32, transform: 'translateZ(10px)' }}>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
                            {mode === 'login' ? "New to Synapse?" : "Already member?"}
                            <button
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#06b6d4',
                                    fontWeight: 800,
                                    marginLeft: 8,
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    textUnderlineOffset: '4px'
                                }}
                            >
                                {mode === 'login' ? 'Create Account' : 'Log In'}
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
