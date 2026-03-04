'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { callAI } from '@/lib/ai';
import InterviewWorkshop from '@/components/InterviewWorkshop';
import AIInterviewer from '@/components/AIInterviewer';
type InterviewPhase = 'setup' | 'interview' | 'report';
type InputTab = 'text' | 'pdf' | 'docx' | 'image';
type InterviewMode = 'professional' | 'casual';
export default function OralInterviewPage() {
    const { user, addXP } = useAuthStore();
    const [phase, setPhase] = useState<InterviewPhase>('setup');
    const [loading, setLoading] = useState(false);
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [difficulty, setDifficulty] = useState('Senior');
    const [duration, setDuration] = useState(15);
    const [inputTab, setInputTab] = useState<InputTab>('text');
    const [mode, setMode] = useState<InterviewMode>('professional');
    const [timeLeft, setTimeLeft] = useState(duration * 60);
    const [messages, setMessages] = useState<any[]>([]);
    const [code, setCode] = useState('');
    const [canvasData, setCanvasData] = useState<string | null>(null);
    const [scribeNotes, setScribeNotes] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [finalReport, setFinalReport] = useState<any>(null);
    useActivityTracker();
    useEffect(() => {
        let timer: any;
        if (phase === 'interview') {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            const handleKeydown = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'w' || e.key === 't')) {
                    e.preventDefault();
                    toast.error('Navigation is locked during the interview!');
                }
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            window.addEventListener('keydown', handleKeydown);
            setTimeLeft(duration * 60);
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        endInterview();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                window.removeEventListener('keydown', handleKeydown);
                if (timer) clearInterval(timer);
            };
        }
    }, [phase]);
    async function handleFileUpload(file: File, type: InputTab) {
        if (type === 'text') return;
        toast.loading('Processing file...', { id: 'file-load' });
        try {
            if (type === 'image') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = (e.target?.result as string).split(',')[1];
                    const res = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{
                                role: 'user',
                                content: `Extract all text from this image verbatim. Return only the raw text content, no commentary.\n\n[IMAGE BASE64: data:${file.type};base64,${base64}]`
                            }],
                            max_tokens: 3000
                        })
                    });
                    const d = await res.json();
                    const extracted = d.choices?.[0]?.message?.content || '';
                    setContent(extracted);
                    toast.success('Image text processed!', { id: 'file-load' });
                };
                reader.readAsDataURL(file);
            } else if (type === 'pdf') {
                const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
                GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
                const ab = await file.arrayBuffer();
                const pdf = await getDocument({ data: ab }).promise;
                let text = '';
                for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
                    const page = await pdf.getPage(i);
                    const tc = await page.getTextContent();
                    text += tc.items.map((it: any) => it.str).join(' ') + '\n';
                }
                setContent(text.trim());
                toast.success(`PDF processed (${pdf.numPages} pages)`, { id: 'file-load' });
            } else if (type === 'docx') {
                const mammoth = await import('mammoth');
                const ab = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: ab });
                setContent(result.value);
                toast.success('Word doc processed!', { id: 'file-load' });
            }
        } catch (e: any) {
            toast.error(`Error: ${e.message}`, { id: 'file-load' });
        }
    }
    async function startInterview() {
        if (!topic.trim() && !content.trim()) {
            toast.error('Provide a topic or content source first');
            return;
        }
        setLoading(true);
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
            setIsLocked(true);
            setPhase('interview');
        } catch (err) {
            toast.error('Failed to enter interview mode');
        }
        setLoading(false);
    }
    async function endInterview() {
        setLoading(true);
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            setIsLocked(false);
            setPhase('report');
            const formattedTranscript = messages
                .map(m => `${m.role === 'user' ? 'USER' : 'INTERVIEWER'}: ${m.content}`)
                .join('\n');
            const { generateFinalReport } = await import('@/lib/agents/interviewOrchestrator');
            const report = await generateFinalReport({
                topic,
                difficulty,
                content,
                transcript: formattedTranscript,
                currentCode: code,
                canvasSummary: canvasData ? 'User used whiteboard' : 'Whiteboard was empty',
                lastUserMessage: 'End of Interview',
                mode
            });
            setFinalReport(report);
            if (user) {
                const nodeRef = collection(db, 'knowledge_nodes');
                await addDoc(nodeRef, {
                    userId: user.uid,
                    topic: topic || 'Oral Interview',
                    easeFactor: 2.5,
                    interval: 1,
                    lastReviewed: serverTimestamp(),
                    repetitions: 1,
                    type: 'interview',
                    score: report.score
                });
                addXP(200);
            }
        } catch (err) {
            console.error("Report Generation Error", err);
            toast.error('Failed to generate report');
        }
        setLoading(false);
    }
    if (phase === 'report') {
        const r = finalReport;
        return (
            <div className="page-container" style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
                <div className="page-container" style={{ background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border-subtle)', padding: 40 }}>
                    {!r ? (
                        <div className="page-container" style={{ textAlign: 'center', padding: 60 }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} style={{ fontSize: 40, marginBottom: 20 }}>âŒ›</motion.div>
                            <h2>Analyzing your performance...</h2>
                            <p style={{ color: 'var(--text-muted)' }}>The AI Panel is reviewing your transcript, code, and drawings.</p>
                        </div>
                    ) : (
                        <div>
                            <header style={{ textAlign: 'center', marginBottom: 40 }}>
                                <div className="page-container" style={{ fontSize: 48, marginBottom: 16 }}>{r.score >= 80 ? '🏆' : r.score >= 60 ? '🎓' : '📚'}</div>
                                <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>Achievement: {r.achievementLevel}</h1>
                                <div className="page-container" style={{ display: 'inline-block', marginTop: 12, padding: '8px 24px', borderRadius: 40, background: 'rgba(139,92,246,0.1)', border: '1px solid var(--brand-violet)', color: 'var(--brand-violet-light)', fontWeight: 800 }}>
                                    Success Percentage: {r.score}%
                                </div>
                            </header>
                            <div className="page-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
                                {Object.entries(r.dimensions || {}).map(([key, val]) => (
                                    <div key={key} className="card" style={{ padding: 20, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="page-container" style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>{key}</div>
                                        <div className="page-container" style={{ fontSize: 24, fontWeight: 800 }}>{val as number}%</div>
                                    </div>
                                ))}
                            </div>
                            <div className="page-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#10b981' }}>âž• Strengths</h3>
                                    <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
                                        {r.strengths?.map((s: string, i: number) => <li key={i} style={{ marginBottom: 10 }}>{s}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#f43f5e' }}>âž– Growth Areas</h3>
                                    <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
                                        {r.growthAreas?.map((s: string, i: number) => <li key={i} style={{ marginBottom: 10 }}>{s}</li>)}
                                    </ul>
                                </div>
                            </div>
                            <div className="page-container" style={{ background: 'rgba(255,255,255,0.03)', padding: 32, borderRadius: 16, border: '1px solid var(--border-subtle)', marginBottom: 40 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Executive Summary</h3>
                                <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>{r.summary}</p>
                            </div>
                            <div className="page-container" style={{ textAlign: 'center' }}>
                                <button onClick={() => setPhase('setup')} className="btn-primary" style={{ padding: '12px 40px', borderRadius: 12 }}>
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    if (phase === 'setup') {
        return (
            <div className="page-container" style={{ maxWidth: 800, margin: '40px auto', padding: 32 }}>
                <header style={{ marginBottom: 40, textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: 32,
                        fontWeight: 900,
                        backgroundImage: 'linear-gradient(to right, var(--brand-violet), var(--brand-cyan))',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block',
                        marginBottom: 12
                    }}>
                        🎙️ Oral Interview Practice
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
                        Practice your interview skills with realistic scenarios and feedback.
                    </p>
                </header>
                <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border-subtle)' }}>
                    <section>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Interview Topic</h3>
                        <input
                            className="input-field"
                            placeholder="e.g. System Design for Twitter, React Senior Engineer..."
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            style={{ fontSize: 16, padding: '12px 16px' }}
                        />
                    </section>
                    <section>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Context Source (Resume/Notes/Docs)</h3>
                        <div className="page-container" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            {(['text', 'pdf', 'docx', 'image'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setInputTab(tab)}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                                        background: inputTab === tab ? 'var(--brand-violet)' : 'rgba(255,255,255,0.05)',
                                        color: inputTab === tab ? 'white' : 'var(--text-muted)',
                                        border: '1px solid ' + (inputTab === tab ? 'var(--brand-violet)' : 'transparent'),
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tab.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        {inputTab === 'text' ? (
                            <textarea
                                className="input-field"
                                placeholder="Paste text here for the AI to analyze..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                style={{ height: 120, fontSize: 14, padding: '12px 16px', resize: 'none' }}
                            />
                        ) : (
                            <div className="page-container" style={{
                                height: 120, border: '2px dashed var(--border-subtle)', borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                background: 'rgba(255,255,255,0.02)', position: 'relative'
                            }}>
                                <input
                                    type="file"
                                    accept={inputTab === 'image' ? 'image/*' : inputTab === 'pdf' ? '.pdf' : '.docx'} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, inputTab); }} style={{ display: 'none' }} />
                                <div className="page-container" style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>Click or drop file here</div>
                            </div>
                        )}
                    </section>

                    <section style={{ background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            3. Interview Settings
                        </h3>
                        <div className="page-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Difficulty</label>
                                <select
                                    className="input-field"
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                >
                                    <option value="Junior">Junior</option>
                                    <option value="Mid-Level">Mid-Level</option>
                                    <option value="Senior">Senior</option>
                                    <option value="Principal">Principal</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Duration (mins)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={duration}
                                    onChange={e => setDuration(Number(e.target.value))}
                                    min={2}
                                    max={60}
                                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Mode</label>
                                <select
                                    className="input-field"
                                    value={mode}
                                    onChange={e => setMode(e.target.value as InterviewMode)}
                                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                >
                                    <option value="professional">Professional</option>
                                    <option value="casual">Casual</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <button onClick={startInterview} disabled={loading} className="btn-primary" style={{ padding: '16px', justifyContent: 'center', fontSize: 16, marginTop: 8 }}>
                        {loading ? 'â³ Preparing...' : '🚀 Start Interview'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <div className="page-container" style={{ display: 'flex', width: '100%', height: '100%' }}>
                <div className="page-container" style={{ width: 400, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', background: '#050505' }}>
                    <div className="page-container" style={{ flex: 1, position: 'relative' }}>
                        <AIInterviewer
                            topic={topic}
                            content={content}
                            difficulty={difficulty}
                            mode={mode}
                            code={code}
                            canvasData={canvasData}
                            messages={messages}
                            onMessage={(m) => setMessages(prev => {
                                const newMessages = [...prev, m];
                                return newMessages.slice(-20);
                            })}
                            onScribeUpdate={setScribeNotes}
                        />
                    </div>
                    <div className="page-container" style={{ padding: 12, borderTop: '1px solid #333', background: '#0a0a0a', textAlign: 'center' }}>
                        <div className="page-container" style={{ fontSize: 12, fontWeight: 800, color: timeLeft < 60 ? '#f43f5e' : '#555' }}>
                            TIME REMAINING: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                    </div>
                    <div className="page-container" style={{ height: 300, borderTop: '1px solid #333', padding: 20, background: '#0a0a0a', overflowY: 'auto' }}>
                        <div className="page-container" style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 12, textTransform: 'uppercase' }}>Transcript</div>
                        {messages.map((m, i) => (
                            <div key={i} style={{ marginBottom: 12, fontSize: 13, color: m.role === 'user' ? '#06b6d4' : '#fff' }}>
                                <span style={{ fontWeight: 800 }}>{m.role === 'user' ? 'YOU: ' : 'INTERVIEWER: '}</span>
                                {m.content}
                            </div>
                        ))}
                    </div>
                    <div className="page-container" style={{ padding: 20, borderTop: '1px solid #333', display: 'flex', gap: 12 }}>
                        <button onClick={() => setIsMuted(!isMuted)} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>
                            {isMuted ? '🔇 Unmute' : '🎙️ Mic Active'}
                        </button>
                        <button onClick={() => { if (confirm('End interview and get report?')) endInterview(); }} className="btn-primary" style={{ flex: 1, background: '#f43f5e' }}>
                            Stop Interview
                        </button>
                    </div>
                </div>
                { }
                <div className="page-container" style={{ flex: 1, background: '#111', display: 'flex', flexDirection: 'column' }}>
                    <InterviewWorkshop
                        code={code}
                        onChangeCode={setCode}
                        canvasData={canvasData}
                        onChangeCanvas={setCanvasData}
                        scribeNotes={scribeNotes}
                    />
                </div>
            </div>
        </main>
    );
}

