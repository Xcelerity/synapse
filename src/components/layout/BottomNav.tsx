'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const MAIN_NAV = [
    { href: '/dashboard', icon: '🏠', label: 'Home' },
    { href: '/notes', icon: '📝', label: 'Notes' },
    { href: '/ai-tutor', icon: '🤖', label: 'Tutor' },
    { href: '/flashcards', icon: '🃏', label: 'Cards' },
    { href: '/quiz', icon: '✏️', label: 'Quiz' },
];

const MORE_NAV = [
    { href: '/tasks', icon: '📅', label: 'Tasks' },
    { href: '/pomodoro', icon: '🍅', label: 'Pomodoro' },
    { href: '/skill-tree', icon: '🌳', label: 'Skill Tree' },
    { href: '/study-buddy', icon: '💬', label: 'Study Group' },
    { href: '/oral-interview', icon: '🗣️', label: 'Oral Practice' },
    { href: '/research', icon: '🔬', label: 'Research' },
    { href: '/essay-grader', icon: '📄', label: 'Essay Grader' },
    { href: '/timetable', icon: '📋', label: 'Timetable' },
    { href: '/ocr', icon: '👁️', label: 'OCR' },
    { href: '/cheatsheets', icon: '📚', label: 'Cheatsheets' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { setUser } = useAuthStore();
    const [showMore, setShowMore] = useState(false);

    async function handleSignOut() {
        try {
            await signOut(auth);
            setUser(null);
            setShowMore(false);
            router.push('/login');
            toast.success('Signed out');
        } catch {
            toast.error('Sign out failed');
        }
    }

    const isMoreActive = MORE_NAV.some(item =>
        pathname === item.href || pathname.startsWith(item.href + '/')
    );

    return (
        <>
            <AnimatePresence>
                {showMore && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMore(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            zIndex: 190,
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                bottom: 64,
                                left: 0,
                                right: 0,
                                background: 'var(--bg-secondary)',
                                borderTop: '1px solid var(--border-subtle)',
                                borderRadius: '24px 24px 0 0',
                                padding: '20px 16px 16px',
                            }}
                        >
                            <div style={{
                                width: 40, height: 4, borderRadius: 99,
                                background: 'var(--border-subtle)',
                                margin: '0 auto 20px',
                            }} />

                            <p style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                marginBottom: 16, paddingLeft: 8,
                            }}>
                                More Pages
                            </p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: 8,
                            }}>
                                {MORE_NAV.map(item => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                    return (
                                        <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}
                                            onClick={() => setShowMore(false)}>
                                            <motion.div
                                                whileTap={{ scale: 0.88 }}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '14px 8px',
                                                    borderRadius: 16,
                                                    background: isActive ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${isActive ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle)'}`,
                                                }}
                                            >
                                                <span style={{ fontSize: 22 }}>{item.icon}</span>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 600,
                                                    color: isActive ? 'var(--brand-violet-light)' : 'var(--text-muted)',
                                                    textAlign: 'center',
                                                }}>
                                                    {item.label}
                                                </span>
                                            </motion.div>
                                        </Link>
                                    );
                                })}
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 64,
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                zIndex: 200,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}>
                {MAIN_NAV.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                    return (
                        <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
                            <motion.div
                                whileTap={{ scale: 0.82 }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 3,
                                    padding: '8px 4px',
                                    borderRadius: 12,
                                    position: 'relative',
                                }}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="bottom-nav-indicator"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(139, 92, 246, 0.12)',
                                            borderRadius: 12,
                                        }}
                                    />
                                )}
                                <span style={{ fontSize: 20, position: 'relative' }}>{item.icon}</span>
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? 'var(--brand-violet-light)' : 'var(--text-muted)',
                                    position: 'relative',
                                }}>
                                    {item.label}
                                </span>
                            </motion.div>
                        </Link>
                    );
                })}

                <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={() => setShowMore(prev => !prev)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        padding: '8px 4px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        borderRadius: 12,
                        position: 'relative',
                    }}
                >
                    {(isMoreActive || showMore) && (
                        <motion.div
                            layoutId="bottom-nav-indicator"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(139, 92, 246, 0.12)',
                                borderRadius: 12,
                            }}
                        />
                    )}
                    <motion.span
                        animate={{ rotate: showMore ? 45 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ fontSize: 20, position: 'relative', display: 'block' }}
                    >
                        {showMore ? '✕' : '⋯'}
                    </motion.span>
                    <span style={{
                        fontSize: 10,
                        fontWeight: isMoreActive || showMore ? 700 : 500,
                        color: isMoreActive || showMore ? 'var(--brand-violet-light)' : 'var(--text-muted)',
                        position: 'relative',
                    }}>
                        More
                    </span>
                </motion.button>
            </nav>
        </>
    );
}
