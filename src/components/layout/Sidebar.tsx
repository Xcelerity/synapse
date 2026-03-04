'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { getXPProgress, getLevelTitle } from '@/lib/gamification';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const NAV_SECTIONS = [
    {
        label: 'Core',
        items: [
            { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
            { href: '/notes', icon: '📝', label: 'Notes' },
            { href: '/tasks', icon: '📅', label: 'Tasks & Calendar' },
            { href: '/timetable', icon: '⏳', label: 'Timetable Builder' },
            { href: '/quiz', icon: '✏️', label: 'Quizzes' },
            { href: '/flashcards', icon: '🃏', label: 'Flashcards' },
            { href: '/cheatsheets', icon: '🎨', label: 'Cheatsheets' },
        ],
    },
    {
        label: 'AI Agents',
        items: [
            { href: '/ai-tutor', icon: '🤖', label: 'Study Companion' },
            { href: '/study-buddy', icon: '💬', label: 'Study Group' },
            { href: '/oral-interview', icon: '🎙️', label: 'Oral Interview' },
            { href: '/research', icon: '🔬', label: 'Research Agent' },
            { href: '/essay-grader', icon: '📄', label: 'Essay Grader' },
        ],
    },
    {
        label: 'Tools',
        items: [
            { href: '/skill-tree', icon: '🌳', label: 'Skill Tree' },
            { href: '/pomodoro', icon: '🍅', label: 'Pomodoro' },
            { href: '/ocr', icon: '📷', label: 'OCR Scanner' },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, gamification, reset } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const { level, xpInLevel, xpForNext, percent } = getXPProgress(gamification.xp);
    const levelInfo = getLevelTitle(level);

    async function handleSignOut() {
        setSigningOut(true);
        try {
            await signOut(auth);
            reset();
            router.push('/login');
            toast.success('Signed out successfully');
        } catch {
            toast.error('Sign out failed');
        } finally { setSigningOut(false); }
    }

    return (
        <motion.aside
            animate={{ width: collapsed ? 72 : 260 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
                flexShrink: 0, height: '100vh', background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', position: 'sticky', top: 0, zIndex: 100,
            }}
        >
            {/* Logo */}
            <div style={{ padding: collapsed ? '20px 0' : '20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
                <AnimatePresence mode="wait">
                    {!collapsed && (
                        <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src="/icon.png" alt="Synapse Logo" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', boxShadow: '0 4px 16px rgba(168,85,247,0.4)' }} />
                            <div>
                                <div className="gradient-text" style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.3px', margin: 0, padding: 0, display: 'inline-block' }}>Synapse</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Your Best Friend</div>
                            </div>
                        </motion.div>
                    )}
                    {collapsed && (
                        <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <img src="/icon.png" alt="Synapse" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain' }} />
                        </motion.div>
                    )}
                </AnimatePresence>
                <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4, flexShrink: 0 }}>
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* XP Bar (collapsed: just level badge) */}
            <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                {!collapsed ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: levelInfo.color }}>Lv.{level} {levelInfo.title}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{xpInLevel}/{xpForNext} XP</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔥 {gamification.streak} day streak</span>
                            <span style={{ fontSize: 11, color: 'var(--brand-amber)' }}>⚡ {gamification.xp} XP</span>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${levelInfo.color}22`, border: `1px solid ${levelInfo.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: levelInfo.color }}>
                            {level}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 0' : '8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {NAV_SECTIONS.map((section) => (
                    <div key={section.label}>
                        {!collapsed && <div className="section-header">{section.label}</div>}
                        {section.items.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}
                                    title={collapsed ? item.label : undefined}>
                                    <div className="nav-item-icon" style={{ background: isActive && collapsed ? 'var(--gradient-brand)' : undefined }}>
                                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                                    </div>
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* User profile & sign out */}
            <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                {!collapsed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="avatar" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.4)' }} />
                        ) : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                                {user?.displayName?.[0] || '?'}
                            </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.displayName || 'Student'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                        </div>
                    </div>
                ) : null}
                <button onClick={handleSignOut} disabled={signingOut}
                    className="btn-ghost" style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', fontSize: 13 }}>
                    <span>🚪</span>
                    {!collapsed && <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>}
                </button>
            </div>
        </motion.aside>
    );
}
