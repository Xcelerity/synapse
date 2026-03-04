'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateAdvancedQuiz, gradeAnswer, AdvancedQuestion, GradeResult, QuestionType, DifficultyLevel, QuizConfig } from '@/lib/ai';
import { useAuthStore } from '@/store/authStore';
import { XP_REWARDS } from '@/lib/gamification';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import VoiceDictationButton from '@/components/VoiceDictationButton';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useActivityTracker } from '@/hooks/useActivityTracker';
const LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
    'Russian', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese', 'Korean',
    'Arabic', 'Hindi', 'Bengali', 'Turkish', 'Polish', 'Swedish', 'Norwegian',
    'Danish', 'Finnish', 'Greek', 'Czech', 'Romanian', 'Ukrainian', 'Vietnamese',
];
const QUESTION_TYPE_META: Record<QuestionType, { label: string; icon: string; color: string }> = {
    mcq: { label: 'Multiple Choice', icon: '🔘', color: 'var(--brand-violet)' },
    truefalse: { label: 'True / False', icon: '⚖️', color: '#0891b2' },
    numerical: { label: 'Numerical', icon: '🔢', color: '#059669' },
    descriptive: { label: 'Descriptive', icon: '📝', color: '#d97706' },
    fillintheblank: { label: 'Fill-in-the-Blank', icon: '✍️', color: '#ec4899' },
    matching: { label: 'Matching Pairs', icon: '🔗', color: '#8b5cf6' },
};
type QuizPhase = 'setup' | 'quiz' | 'results';
type InputTab = 'text' | 'image' | 'pdf' | 'docx';
interface QuestionState {
    answered: boolean;
    userAnswer: string | number | boolean | Record<string, string> | null;
    gradeResult: GradeResult | null;
    grading: boolean;
    skipped: boolean;
    timeSpent: number;
}
export default function QuizPage() {
    const { addXP, gamification, updateStats } = useAuthStore();
    const [phase, setPhase] = useState<QuizPhase>('setup');
    const [inputTab, setInputTab] = useState<InputTab>('text');
    const [content, setContent] = useState('');
    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState('English');
    const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
    const [framework, setFramework] = useState<string>('None');
    const [counts, setCounts] = useState<Partial<Record<QuestionType, number>>>({ mcq: 5, truefalse: 2, numerical: 1, descriptive: 2, fillintheblank: 0, matching: 0 });
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(60);
    const [hintsEnabled, setHintsEnabled] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [broadSubject, setBroadSubject] = useState<string>('General Knowledge');
    const [questions, setQuestions] = useState<AdvancedQuestion[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [questionStates, setQuestionStates] = useState<QuestionState[]>([]);
    const [showHint, setShowHint] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeSpentRef = useRef(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [rawScore, setRawScore] = useState(0);
    useActivityTracker();
    const [mcqSelected, setMcqSelected] = useState<number | null>(null);
    const [tfSelected, setTfSelected] = useState<boolean | null>(null);
    const [numInput, setNumInput] = useState('');
    const [descInput, setDescInput] = useState('');
    const [fitbInput, setFitbInput] = useState('');
    const [matchPairs, setMatchPairs] = useState<Record<string, string>>({});
    const totalQ = Object.values(counts).reduce((a: number, b) => a + (b || 0), 0);
    const currentState = questionStates[currentQ];
    const currentQuestion = questions[currentQ];
    const clearTimer = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }, []);
    const startTimer = useCallback(() => {
        clearTimer();
        setTimeLeft(timerSeconds);
        timeSpentRef.current = 0;
        timerRef.current = setInterval(() => {
            timeSpentRef.current += 1;
            setTimeLeft(t => {
                if (t <= 1) {
                    clearTimer();
                    setQuestionStates(prev => {
                        const next = [...prev];
                        next[currentQ] = { ...next[currentQ], answered: true, skipped: true, grading: false, gradeResult: { score: 0, maxScore: questions[currentQ]?.points ?? 10, isCorrect: false, feedback: 'Time expired!' }, timeSpent: timerSeconds };
                        return next;
                    });
                    setTimeout(() => advanceQuestion(), 1500);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    }, [timerSeconds, currentQ, questions]);
    useEffect(() => {
        if (phase === 'quiz' && timerEnabled && questions.length > 0) {
            startTimer();
        }
        return clearTimer;
    }, [phase, currentQ, timerEnabled, questions.length]);
    async function handleFileUpload(file: File, type: InputTab) {
        if (type === 'text') return;
        toast.loading('Extracting text from file...', { id: 'file-load' });
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
                    toast.success('Image text extracted!', { id: 'file-load' });
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
                toast.success(`PDF extracted (${pdf.numPages} pages)`, { id: 'file-load' });
            } else if (type === 'docx') {
                const mammoth = await import('mammoth');
                const ab = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: ab });
                setContent(result.value);
                toast.success('Word document extracted!', { id: 'file-load' });
            }
        } catch (e: any) {
            toast.error(`File error: ${e.message}`, { id: 'file-load' });
        }
    }
    async function handleGenerate() {
        if (!content.trim() && !topic.trim()) {
            toast.error('Add some content or a topic to generate from');
            return;
        }
        if (totalQ === 0) {
            toast.error('Select at least one question type with count > 0');
            return;
        }
        setGenerating(true);
        try {
            const config: QuizConfig = { counts, language, difficulty, topic: topic || undefined, framework };
            const sourceText = content.trim() || `Generate questions about: ${topic}`;
            const { questions: qs, broadSubject: subject } = await generateAdvancedQuiz(sourceText, config);
            if (qs.length === 0) {
                toast.error('Could not generate questions. Try adding more content.');
                return;
            }
            setQuestions(qs);
            setBroadSubject(subject);
            setQuestionStates(qs.map(() => ({ answered: false, userAnswer: null, gradeResult: null, grading: false, skipped: false, timeSpent: 0 })));
            setCurrentQ(0);
            resetInputs();
            setPhase('quiz');
        } catch (err: any) {
            toast.error(err.message || 'Generation failed');
        } finally {
            setGenerating(false);
        }
    }
    function resetInputs() {
        setMcqSelected(null);
        setTfSelected(null);
        setNumInput('');
        setDescInput('');
        setFitbInput('');
        setMatchPairs({});
        setShowHint(false);
    }
    async function submitAnswer(answer: string | number | boolean | Record<string, string>) {
        if (!currentQuestion || currentState?.answered) return;
        clearTimer();
        const spent = timerEnabled ? timerSeconds - timeLeft : timeSpentRef.current;
        setQuestionStates(prev => {
            const next = [...prev];
            next[currentQ] = { ...next[currentQ], answered: true, userAnswer: answer, grading: true, timeSpent: spent };
            return next;
        });
        try {
            const result = await gradeAnswer(currentQuestion, answer, language);
            setQuestionStates(prev => {
                const next = [...prev];
                next[currentQ] = { ...next[currentQ], grading: false, gradeResult: result };
                return next;
            });
        } catch {
            setQuestionStates(prev => {
                const next = [...prev];
                next[currentQ] = { ...next[currentQ], grading: false, gradeResult: { score: 0, maxScore: currentQuestion.points, isCorrect: false, feedback: 'Grading failed.' } };
                return next;
            });
        }
    }
    async function exportToFlashcard(q: AdvancedQuestion) {
        toast.loading('Exporting to flashcards...', { id: q.id });
        const user = useAuthStore.getState().user;
        if (!user) { toast.error('You must be logged in', { id: q.id }); return; }
        let ques = q.question;
        let ans = '';
        if (q.type === 'mcq') {
            ques += `\n\n${q.options?.map((o: string, idx: number) => `${String.fromCharCode(65 + idx)}) ${o}`).join('\n')}`;
            ans = `Correct Option: ${String.fromCharCode(65 + (q.correct ?? 0))}`;
        } else if (q.type === 'truefalse') {
            ans = `Answer: ${q.answer ? 'True' : 'False'}`;
        } else if (q.type === 'numerical') {
            ans = `Answer: ${q.numericalAnswer} (±${q.tolerance})`;
        } else if (q.type === 'descriptive') {
            ans = `Model Answer:\n${q.idealAnswer || q.explanation}`;
        } else if (q.type === 'fillintheblank') {
            ans = `Answer: ${q.blankAnswer}`;
        } else if (q.type === 'matching') {
            ans = `Pairs:\n${q.pairs?.map((p: any) => `${p.left} -> ${p.right}`).join('\n')}`;
        }
        if (q.type !== 'descriptive' && q.explanation) ans += `\n\nExplanation: ${q.explanation}`;
        const card = { id: `${Date.now()}`, question: ques.trim(), answer: ans.trim(), difficulty: q.points > 10 ? 'hard' : 'medium', isMarkedForReview: true };
        try {
            const decksRef = collection(db, 'flashcard_decks');
            const qry = query(decksRef, where('userId', '==', user.uid), where('name', '==', 'Exported from Quizzes'));
            const snap = await getDocs(qry);
            if (!snap.empty) {
                const targetDeckId = snap.docs[0].id;
                const existingCards = snap.docs[0].data().cards || [];
                await updateDoc(doc(db, 'flashcard_decks', targetDeckId), { cards: [...existingCards, card] });
            } else {
                await addDoc(decksRef, {
                    userId: user.uid, name: 'Exported from Quizzes', description: 'Cards saved directly from Quiz results', cards: [card], createdAt: serverTimestamp()
                });
            }
            toast.success('Saved as Flashcard!', { id: q.id, icon: '🃏' });
        } catch (e: any) {
            toast.error('Failed to export', { id: q.id });
        }
    }
    function advanceQuestion() {
        if (currentQ < questions.length - 1) {
            setCurrentQ(q => q + 1);
            resetInputs();
        } else {
            finishQuiz();
        }
    }
    async function finishQuiz() {
        clearTimer();
        const totalEarned = questionStates.reduce((sum: number, s) => sum + (s.gradeResult?.score ?? 0), 0);
        const totalPossible = questions.reduce((sum: number, q) => sum + q.points, 0);
        const pct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
        if (pct >= 80) addXP(XP_REWARDS.PERFECT_QUIZ);
        else addXP(XP_REWARDS.COMPLETE_QUIZ);
        updateStats({ quizzesTaken: (gamification.quizzesTaken || 0) + 1 });
        const user = useAuthStore.getState().user;
        if (user && broadSubject && totalPossible > 0) {
            try {
                let simulatedGrade = 3;
                if (pct < 60) simulatedGrade = 1;
                else if (pct < 80) simulatedGrade = 3;
                else if (pct < 96) simulatedGrade = 4;
                else simulatedGrade = 5;
                const nodesRef = collection(db, 'knowledge_nodes');
                const qry = query(nodesRef, where('userId', '==', user.uid), where('topic', '==', broadSubject));
                const snap = await getDocs(qry);
                if (!snap.empty) {
                    const nodeDoc = snap.docs[0];
                    const data = nodeDoc.data();
                    let newEase = data.easeFactor || 2.5;
                    newEase = newEase + (0.1 - (5 - simulatedGrade) * (0.08 + (5 - simulatedGrade) * 0.02));
                    newEase = Math.max(1.3, newEase);
                    let newInterval = data.interval || 1;
                    if (simulatedGrade < 3) {
                        newInterval = 1;
                    } else if (data.repetitions === 0) {
                        newInterval = 1;
                    } else if (data.repetitions === 1) {
                        newInterval = 6;
                    } else {
                        newInterval = Math.round(data.interval * newEase);
                    }
                    const newScores = [...(data.recentQuizScores || []), pct].slice(-10);
                    await updateDoc(doc(db, 'knowledge_nodes', nodeDoc.id), {
                        easeFactor: newEase,
                        interval: newInterval,
                        repetitions: (data.repetitions || 0) + 1,
                        lastReviewed: serverTimestamp(),
                        recentQuizScores: newScores
                    });
                } else {
                    await addDoc(nodesRef, {
                        userId: user.uid,
                        topic: broadSubject,
                        easeFactor: 2.5,
                        interval: 1,
                        repetitions: 1,
                        lastReviewed: serverTimestamp(),
                        recentQuizScores: [pct]
                    });
                }
            } catch (err: any) {
                console.error("Failed to sync to Knowledge Graph", err);
            }
        }
        toast.success(`Quiz complete! ${pct}% score`);
        setPhase('results');
    }
    const totalEarned = questionStates.reduce((sum: number, s) => sum + (s.gradeResult?.score ?? 0), 0);
    const totalPossible = questions.reduce((sum: number, q) => sum + q.points, 0);
    const finalPct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    const answeredCount = questionStates.filter(s => s.answered && !s.skipped).length;
    const typeStats = (['mcq', 'truefalse', 'numerical', 'descriptive', 'fillintheblank', 'matching'] as QuestionType[]).map(type => {
        const qs = questions.filter(q => q.type === type);
        if (qs.length === 0) return null;
        const earned = qs.reduce((sum: number, q) => {
            const qi = questions.indexOf(q);
            return sum + (questionStates[qi]?.gradeResult?.score ?? 0);
        }, 0);
        const possible = qs.reduce((sum: number, q) => sum + q.points, 0);
        return { type, count: qs.length, earned, possible, pct: possible > 0 ? Math.round((earned / possible) * 100) : 0 };
    }).filter((s): s is { type: QuestionType; count: number; earned: number; possible: number; pct: number } => s !== null);
    const timerPct = timerEnabled && timerSeconds > 0 ? (timeLeft / timerSeconds) * 100 : 100;
    const timerColor = timerPct > 50 ? '#10b981' : timerPct > 25 ? '#f59e0b' : '#f43f5e';
    return (
        <div style={{ padding: '16px 24px', minHeight: '100vh' }}>
            <AnimatePresence mode="wait">
                { }
                {phase === 'setup' && (
                    <motion.div key="setup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div style={{ marginBottom: 20 }}>
                            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>✏️Quiz Generator</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Quiz yourself, learn and enjoy!</p>
                        </div>
                        { }
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                            { }
                            <div className="glass-card" style={{ padding: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Question Types</h3>
                                    <span style={{ fontSize: 11, color: 'var(--brand-violet-light)', fontWeight: 700 }}>{totalQ} total</span>
                                </div>
                                {(Object.keys(QUESTION_TYPE_META) as QuestionType[]).map((type: QuestionType) => {
                                    const meta = QUESTION_TYPE_META[type];
                                    const count = counts[type] ?? 0;
                                    return (
                                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: 12, color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {meta.icon} {meta.label}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button onClick={() => setCounts(c => ({ ...c, [type]: Math.max(0, (c[type] ?? 0) - 1) }))}
                                                    style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: count > 0 ? meta.color : 'var(--text-muted)', minWidth: 18, textAlign: 'center' }}>{count}</span>
                                                <button onClick={() => setCounts(c => ({ ...c, [type]: (c[type] ?? 0) + 1 }))}
                                                    style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            { }
                            <div className="glass-card" style={{ padding: 18 }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Language</h3>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field" style={{ fontSize: 13, width: '100%', color: 'var(--text-primary)', background: 'var(--bg-secondary, #1e1e2e)' }}>
                                    {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{l}</option>)}
                                </select>
                            </div>
                            { }
                            <div className="glass-card" style={{ padding: 18 }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    {(['easy', 'medium', 'hard', 'adaptive'] as DifficultyLevel[]).map((d: DifficultyLevel) => {
                                        const colors: Record<DifficultyLevel, string> = { easy: '#10b981', medium: '#f59e0b', hard: '#f43f5e', adaptive: 'var(--brand-violet)' };
                                        const icons: Record<DifficultyLevel, string> = { easy: '🌱', medium: '⚡', hard: '🔥', adaptive: '🧠' };
                                        return (
                                            <button key={d} onClick={() => setDifficulty(d)} style={{
                                                padding: '7px 6px', borderRadius: 9, border: `1px solid ${difficulty === d ? colors[d] + '80' : 'var(--border-subtle)'}`,
                                                background: difficulty === d ? colors[d] + '18' : 'rgba(255,255,255,0.03)',
                                                color: difficulty === d ? colors[d] : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter',
                                                textTransform: 'capitalize', textAlign: 'center'
                                            }}>
                                                {icons[d]} {d}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            { }
                            <div className="glass-card" style={{ padding: 18 }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Options</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>⏱️ Timer</span>
                                    <button onClick={() => setTimerEnabled(t => !t)} style={{ width: 36, height: 20, borderRadius: 99, border: 'none', cursor: 'pointer', background: timerEnabled ? 'var(--brand-violet)' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background 0.2s' }}>
                                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: timerEnabled ? 19 : 3, transition: 'left 0.2s' }} />
                                    </button>
                                </div>
                                {timerEnabled && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Secs/Q:</span>
                                        <input type="number" min={5} max={600} value={timerSeconds} onChange={e => setTimerSeconds(Math.max(5, Number(e.target.value)))}
                                            className="input-field" style={{ flex: 1, textAlign: 'center', fontSize: 13, padding: '5px 8px' }} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>💡 Hints</span>
                                    <button onClick={() => setHintsEnabled(h => !h)} style={{ width: 36, height: 20, borderRadius: 99, border: 'none', cursor: 'pointer', background: hintsEnabled ? 'var(--brand-violet)' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background 0.2s' }}>
                                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: hintsEnabled ? 19 : 3, transition: 'left 0.2s' }} />
                                    </button>
                                </div>
                                <div style={{ marginTop: 14 }}>
                                    <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pedagogy</h3>
                                    <select value={framework} onChange={e => setFramework(e.target.value)} className="input-field" style={{ fontSize: 12, width: '100%', color: 'var(--text-primary)', background: 'var(--bg-secondary, #1e1e2e)', padding: '6px 8px' }}>
                                        <option value="None">None</option>
                                        <option value="Bloom's Taxonomy">Bloom's Taxonomy</option>
                                        <option value="Gardner's Multiple Intelligences">Gardner's M.I.</option>
                                        <option value="Webb's Depth of Knowledge">Webb's DOK</option>
                                        <option value="Socratic Method">Socratic Method</option>
                                        <option value="Feynman Technique">Feynman Technique</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        { }
                        <div className="glass-card" style={{ padding: 22 }}>
                            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content Source</h3>
                            { }
                            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                                {(['text', 'image', 'pdf', 'docx'] as InputTab[]).map((tab: InputTab) => {
                                    const icons: Record<InputTab, string> = { text: '✍️', image: '🖼️', pdf: '📄', docx: '📝' };
                                    const labels: Record<InputTab, string> = { text: 'Text', image: 'Image', pdf: 'PDF', docx: 'Word' };
                                    return (
                                        <button key={tab} onClick={() => setInputTab(tab)} style={{
                                            padding: '7px 14px', borderRadius: 10, border: '1px solid',
                                            borderColor: inputTab === tab ? 'var(--brand-violet)' : 'var(--border-subtle)',
                                            background: inputTab === tab ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                                            color: inputTab === tab ? 'var(--brand-violet-light)' : 'var(--text-muted)',
                                            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 5
                                        }}>
                                            {icons[tab]} {labels[tab]}
                                        </button>
                                    );
                                })}
                            </div>
                            {inputTab === 'text' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
                                    <input className="input-field" placeholder="Topic (e.g. 'Photosynthesis')" value={topic} onChange={e => setTopic(e.target.value)} style={{ fontSize: 14, alignSelf: 'start' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <textarea className="input-field" placeholder="Paste your study material, lecture notes, or any text... (or use voice dictation)" value={content} onChange={e => setContent(e.target.value)} rows={10} style={{ resize: 'vertical', minHeight: 180 }} />
                                        <VoiceDictationButton onResult={(text: string) => setContent(prev => prev ? prev + ' ' + text : text)} />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <label style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        border: '2px dashed var(--border-subtle)', borderRadius: 14, padding: '32px 24px',
                                        cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(124,58,237,0.03)',
                                        minHeight: 220
                                    }} onDragOver={e => e.preventDefault()} onDrop={e => {
                                        e.preventDefault();
                                        const file = e.dataTransfer.files[0];
                                        if (file) handleFileUpload(file, inputTab);
                                    }}>
                                        <input type="file" accept={inputTab === 'image' ? 'image/*' : inputTab === 'pdf' ? '.pdf' : '.docx'} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, inputTab); }} style={{ display: 'none' }} />
                                        <div style={{ fontSize: 40, marginBottom: 12 }}>{inputTab === 'image' ? '🖼️' : inputTab === 'pdf' ? '📄' : '📝'}</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                            {inputTab === 'image' ? 'Upload Image' : inputTab === 'pdf' ? 'Upload PDF' : 'Upload Word Doc'}
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Drag and drop or click to browse</p>
                                    </label>
                                    <button onClick={handleGenerate} disabled={generating || totalQ === 0} className="btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, fontWeight: 700, marginTop: 14 }}>
                                        {generating ? '⏳ Synthesizing quiz...' : `🚀 Auto-Synthesize ${totalQ}-Question Quiz`}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
                { }
                {phase === 'quiz' && currentQuestion && (
                    <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                        { }
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Q {currentQ + 1} / {questions.length}</span>
                                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: QUESTION_TYPE_META[currentQuestion.type].color + '20', color: QUESTION_TYPE_META[currentQuestion.type].color, fontWeight: 700 }}>
                                        {QUESTION_TYPE_META[currentQuestion.type].icon} {QUESTION_TYPE_META[currentQuestion.type].label}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <span style={{ fontSize: 13, color: 'var(--brand-violet-light)', fontWeight: 600 }}>
                                        {totalEarned} / {totalPossible} pts
                                    </span>
                                    {timerEnabled && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: timerColor }}>
                                            ⏱️ {timeLeft}s
                                        </div>
                                    )}
                                </div>
                            </div>
                            { }
                            <div style={{ position: 'relative', height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                                <div style={{ position: 'absolute', height: '100%', borderRadius: 99, background: 'var(--brand-violet)', width: `${((currentQ) / questions.length) * 100}%`, transition: 'width 0.4s' }} />
                            </div>
                            { }
                            {timerEnabled && (
                                <div style={{ marginTop: 4, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                                    <div style={{ height: '100%', borderRadius: 99, background: timerColor, width: `${timerPct}%`, transition: 'width 1s linear, background 0.5s' }} />
                                </div>
                            )}
                        </div>
                        { }
                        <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>
                                    {currentQuestion.question}
                                </h2>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 16, flexShrink: 0, marginTop: 4 }}>{currentQuestion.points} pts</span>
                            </div>
                            {hintsEnabled && currentQuestion.hint && !currentState?.answered && (
                                <div style={{ marginTop: 8 }}>
                                    {!showHint ? (
                                        <button onClick={() => setShowHint(true)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter' }}>💡 Show hint</button>
                                    ) : (
                                        <div style={{ fontSize: 13, color: '#f59e0b', marginTop: 4, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, borderLeft: '3px solid #f59e0b' }}>
                                            Hint: {currentQuestion.hint}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        { }
                        {currentQuestion.type === 'mcq' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {currentQuestion.options?.map((opt: string, i: number) => {
                                    const answered = currentState?.answered;
                                    const isSelected = mcqSelected === i;
                                    const isCorrect = i === currentQuestion.correct;
                                    let bg = 'rgba(255,255,255,0.03)', border = 'var(--border-subtle)', color = 'var(--text-primary)';
                                    if (answered && isCorrect) { bg = 'rgba(16,185,129,0.12)'; border = 'rgba(16,185,129,0.5)'; color = '#10b981'; }
                                    else if (answered && isSelected && !isCorrect) { bg = 'rgba(244,63,94,0.12)'; border = 'rgba(244,63,94,0.5)'; color = '#f43f5e'; }
                                    return (
                                        <motion.div key={i} whileHover={!answered ? { scale: 1.01, x: 4 } : {}} whileTap={!answered ? { scale: 0.99 } : {}}>
                                            <button
                                                onClick={() => { if (!answered) { setMcqSelected(i); submitAnswer(i); } }}
                                                disabled={!!answered}
                                                style={{ width: '100%', textAlign: 'left', padding: '15px 20px', background: bg, border: `1px solid ${border}`, borderRadius: 14, color, fontSize: 15, fontFamily: 'Inter', cursor: answered ? 'default' : 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ width: 28, height: 28, borderRadius: '50%', background: answered && isCorrect ? '#10b981' : answered && isSelected ? '#f43f5e' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: answered ? 'white' : 'var(--text-secondary)', flexShrink: 0, transition: 'all 0.3s' }}>
                                                    {answered && isCorrect ? '✓' : answered && isSelected && !isCorrect ? '✗' : String.fromCharCode(65 + i)}
                                                </span>
                                                {opt}
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                        {currentQuestion.type === 'truefalse' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                {[true, false].map((val: boolean) => {
                                    const answered = currentState?.answered;
                                    const isSelected = tfSelected === val;
                                    const isCorrect = val === currentQuestion.answer;
                                    let bg = 'rgba(255,255,255,0.03)', border = 'var(--border-subtle)', color = 'var(--text-primary)';
                                    if (answered && isCorrect) { bg = 'rgba(16,185,129,0.12)'; border = 'rgba(16,185,129,0.5)'; color = '#10b981'; }
                                    else if (answered && isSelected && !isCorrect) { bg = 'rgba(244,63,94,0.12)'; border = 'rgba(244,63,94,0.5)'; color = '#f43f5e'; }
                                    return (
                                        <motion.div key={String(val)} whileHover={!answered ? { scale: 1.02 } : {}} whileTap={!answered ? { scale: 0.98 } : {}}>
                                            <button
                                                onClick={() => { if (!answered) { setTfSelected(val); submitAnswer(val); } }}
                                                disabled={!!answered}
                                                style={{ width: '100%', padding: '28px 20px', textAlign: 'center', background: bg, border: `1px solid ${border}`, borderRadius: 18, color, fontSize: 20, fontWeight: 900, cursor: answered ? 'default' : 'pointer', transition: 'all 0.3s', fontFamily: 'Inter' }}>
                                                {val ? '✅ TRUE' : '❌ FALSE'}
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                        {currentQuestion.type === 'numerical' && (
                            <div>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                    <input type="number" className="input-field" placeholder="Enter your numeric answer..." value={numInput} onChange={e => setNumInput(e.target.value)}
                                        disabled={currentState?.answered} onKeyDown={e => { if (e.key === 'Enter' && numInput.trim() && !currentState?.answered) submitAnswer(Number(numInput)); }}
                                        style={{ flex: 1, fontSize: 18, fontWeight: 700, textAlign: 'center' }} />
                                    <button onClick={() => { if (numInput.trim() && !currentState?.answered) submitAnswer(Number(numInput)); }}
                                        disabled={!numInput.trim() || currentState?.answered} className="btn-primary" style={{ padding: '10px 20px', flexShrink: 0 }}>
                                        Submit
                                    </button>
                                </div>
                                {currentQuestion.tolerance !== undefined && (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Tolerance: ±{currentQuestion.tolerance}</p>
                                )}
                            </div>
                        )}
                        {currentQuestion.type === 'descriptive' && (
                            <div>
                                <textarea className="input-field" placeholder="Write your detailed answer here..." value={descInput} onChange={e => setDescInput(e.target.value)}
                                    disabled={currentState?.answered} rows={6} style={{ resize: 'vertical', marginBottom: 10 }} />
                                <button onClick={() => { if (descInput.trim() && !currentState?.answered) submitAnswer(descInput); }}
                                    disabled={!descInput.trim() || currentState?.answered} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                                    📤 Submit Answer for AI Grading
                                </button>
                            </div>
                        )}
                        {currentQuestion.type === 'fillintheblank' && (
                            <div>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                    <input type="text" className="input-field" placeholder="Enter the missing word(s)..." value={fitbInput} onChange={e => setFitbInput(e.target.value)}
                                        disabled={currentState?.answered} onKeyDown={e => { if (e.key === 'Enter' && fitbInput.trim() && !currentState?.answered) submitAnswer(fitbInput.trim()); }}
                                        style={{ flex: 1, fontSize: 18, fontWeight: 700, textAlign: 'center' }} />
                                    <button onClick={() => { if (fitbInput.trim() && !currentState?.answered) submitAnswer(fitbInput.trim()); }}
                                        disabled={!fitbInput.trim() || currentState?.answered} className="btn-primary" style={{ padding: '10px 20px', flexShrink: 0 }}>
                                        Submit
                                    </button>
                                </div>
                            </div>
                        )}
                        {currentQuestion.type === 'matching' && (
                            <div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Match the items on the left to the correct items on the right by selecting from the dropdowns.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 16 }}>
                                    {currentQuestion.pairs?.map((p: any, i: number) => {
                                        const allRightItems = currentQuestion.pairs?.map((pair: any) => pair.right) || [];
                                        const shuffledRight = [...allRightItems].sort((a, b) => a.localeCompare(b));
                                        const answered = currentState?.answered;
                                        const isCorrectMatch = answered && matchPairs[p.left] === p.right;
                                        const isWrongMatch = answered && matchPairs[p.left] && matchPairs[p.left] !== p.right;
                                        let borderColor = 'var(--border-subtle)';
                                        if (isCorrectMatch) borderColor = '#10b981';
                                        if (isWrongMatch) borderColor = '#f43f5e';
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${borderColor}` }}>
                                                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                                                    {p.left}
                                                </div>
                                                <div style={{ flexShrink: 0, color: 'var(--text-muted)' }}>→</div>
                                                <select
                                                    value={matchPairs[p.left] || ''}
                                                    onChange={e => setMatchPairs(prev => ({ ...prev, [p.left]: e.target.value }))}
                                                    disabled={currentState?.answered}
                                                    className="input-field"
                                                    style={{ flex: 1, fontSize: 13, padding: '8px 12px', borderColor }}
                                                >
                                                    <option value="" disabled>Select match...</option>
                                                    {shuffledRight.map((rOption, j) => (
                                                        <option key={j} value={rOption}>{rOption}</option>
                                                    ))}
                                                </select>
                                                {answered && (
                                                    <div style={{ width: 24, textAlign: 'center', fontSize: 16 }}>
                                                        {isCorrectMatch ? '✅' : '❌'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={() => {
                                    const allMatched = currentQuestion.pairs?.every((p: any) => matchPairs[p.left]);
                                    if (allMatched && !currentState?.answered) submitAnswer(matchPairs);
                                }}
                                    disabled={!currentQuestion.pairs?.every((p: any) => matchPairs[p.left]) || currentState?.answered}
                                    className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                                    Submit Matching
                                </button>
                            </div>
                        )}
                        { }
                        <AnimatePresence>
                            {currentState?.grading && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card"
                                    style={{ padding: 20, marginTop: 16, borderColor: 'rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {[0, 1, 2].map((i: number) => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-violet)', animation: `float ${0.6 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />)}
                                    </div>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI is grading your answer...</span>
                                </motion.div>
                            )}
                            {currentState?.gradeResult && !currentState.grading && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card"
                                    style={{ padding: 20, marginTop: 16, borderLeft: `4px solid ${currentState.gradeResult.isCorrect ? '#10b981' : currentState.gradeResult.score > 0 ? '#f59e0b' : '#f43f5e'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: currentState.gradeResult.isCorrect ? '#10b981' : currentState.gradeResult.score > 0 ? '#f59e0b' : '#f43f5e' }}>
                                            {currentState.gradeResult.isCorrect ? '✅ Correct!' : currentState.gradeResult.score > 0 ? '🟡 Partial Credit' : '❌ Incorrect'}
                                        </span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-violet-light)' }}>
                                            +{currentState.gradeResult.score} / {currentState.gradeResult.maxScore} pts
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: currentState.gradeResult.keyPointsMissed?.length ? 8 : 0 }}>
                                        {currentState.gradeResult.feedback}
                                    </p>
                                    {currentState.gradeResult.keyPointsMissed && currentState.gradeResult.keyPointsMissed.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#f43f5e', marginBottom: 4 }}>Key points missed:</div>
                                            {currentState.gradeResult.keyPointsMissed.map((p: string, i: number) => (
                                                <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 8 }}>• {p}</div>
                                            ))}
                                        </div>
                                    )}
                                    {currentState.gradeResult.strongPoints && currentState.gradeResult.strongPoints.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>Strong points:</div>
                                            {currentState.gradeResult.strongPoints.map((p: string, i: number) => (
                                                <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 8 }}>• {p}</div>
                                            ))}
                                        </div>
                                    )}
                                    { }
                                    <button onClick={advanceQuestion} className="btn-primary" style={{ marginTop: 14, width: '100%', justifyContent: 'center', padding: '11px' }}>
                                        {currentQ < questions.length - 1 ? 'Next Question →' : '🏁 Finish Quiz'}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
                { }
                {phase === 'results' && (
                    <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        { }
                        <div style={{ textAlign: 'center', marginBottom: 32 }}>
                            <div style={{ fontSize: 80, fontWeight: 900, color: finalPct >= 80 ? '#10b981' : finalPct >= 60 ? '#f59e0b' : '#f43f5e', marginBottom: 4 }}>{finalPct}%</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{totalEarned} / {totalPossible} points</div>
                            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                                {finalPct >= 80 ? '🏆 Outstanding performance!' : finalPct >= 60 ? '📚 Good work, keep studying!' : '💪 Great effort, review the explanations!'}
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button onClick={() => { setPhase('quiz'); setCurrentQ(0); setQuestionStates(questions.map(() => ({ answered: false, userAnswer: null, gradeResult: null, grading: false, skipped: false, timeSpent: 0 }))); resetInputs(); }} className="btn-secondary">↺ Retry Quiz</button>
                                <button onClick={() => { setPhase('setup'); setQuestions([]); setContent(''); setTopic(''); }} className="btn-primary">+ New Quiz</button>
                            </div>
                        </div>
                        { }
                        {typeStats.length > 1 && (
                            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>📊 Score by Question Type</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                                    {typeStats.map((s: { type: QuestionType; count: number; earned: number; possible: number; pct: number }) => (
                                        <div key={s.type} style={{ padding: 14, borderRadius: 12, background: QUESTION_TYPE_META[s.type].color + '12', border: `1px solid ${QUESTION_TYPE_META[s.type].color}30`, textAlign: 'center' }}>
                                            <div style={{ fontSize: 20, marginBottom: 4 }}>{QUESTION_TYPE_META[s.type].icon}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: QUESTION_TYPE_META[s.type].color }}>{s.pct}%</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{QUESTION_TYPE_META[s.type].label}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.earned}/{s.possible} pts</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        { }
                        <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>📋 Full Review</h3>
                            {questions.map((q: AdvancedQuestion, i: number) => {
                                const st = questionStates[i];
                                const gr = st?.gradeResult;
                                const isCorrect = gr?.isCorrect;
                                return (
                                    <div key={i} className="glass-card" style={{ padding: 20, marginBottom: 12, borderLeft: `3px solid ${isCorrect ? '#10b981' : gr && gr.score > 0 ? '#f59e0b' : '#f43f5e'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{ fontSize: 18, flexShrink: 0 }}>{isCorrect ? '✅' : gr && gr.score > 0 ? '🟡' : '❌'}</span>
                                                <div>
                                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: QUESTION_TYPE_META[q.type].color + '20', color: QUESTION_TYPE_META[q.type].color, fontWeight: 700, marginRight: 6 }}>{QUESTION_TYPE_META[q.type].icon}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Q{i + 1}. {q.question}</span>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-violet-light)', flexShrink: 0, marginLeft: 12 }}>{gr?.score ?? 0}/{q.points} pts</span>
                                        </div>
                                        {q.type === 'descriptive' && q.idealAnswer && (
                                            <div style={{ fontSize: 13, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '12px 16px', borderRadius: 8, marginTop: 12, marginBottom: 12, marginLeft: 32, borderLeft: '3px solid #10b981' }}>
                                                <div style={{ fontWeight: 700, marginBottom: 4 }}>💡 Model Answer</div>
                                                <div style={{ lineHeight: 1.5 }}>{q.idealAnswer}</div>
                                            </div>
                                        )}
                                        {q.type === 'fillintheblank' && q.blankAnswer && (
                                            <div style={{ fontSize: 13, color: '#ec4899', background: 'rgba(236,72,153,0.08)', padding: '8px 12px', borderRadius: 8, marginTop: 8, marginBottom: 8, marginLeft: 32, borderLeft: '3px solid #ec4899', display: 'inline-block' }}>
                                                <span style={{ fontWeight: 700 }}>Correct word:</span> {q.blankAnswer}
                                            </div>
                                        )}
                                        {q.type === 'matching' && q.pairs && (
                                            <div style={{ fontSize: 13, color: '#8b5cf6', background: 'rgba(139,92,246,0.08)', padding: '12px 16px', borderRadius: 8, marginTop: 12, marginBottom: 12, marginLeft: 32, borderLeft: '3px solid #8b5cf6' }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>🔗 Correct Matches</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {q.pairs.map((p: any, j: number) => (
                                                        <div key={j} style={{ display: 'flex', gap: 8 }}>
                                                            <span style={{ fontWeight: 600 }}>{p.left}</span>
                                                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                            <span>{p.right}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {gr?.feedback && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginLeft: 32 }}>{gr.feedback}</div>}
                                        <button onClick={() => exportToFlashcard(q)} className="btn-secondary" style={{ marginTop: 12, marginLeft: 32, padding: '6px 12px', fontSize: 12 }}>
                                            + Turn into Flashcard
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
