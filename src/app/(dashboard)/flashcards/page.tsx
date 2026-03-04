'use client';
import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { generateAdvancedQuiz, AdvancedQuestion, QuestionType, DifficultyLevel, QuizConfig, categorizeContent } from '@/lib/ai';
import { XP_REWARDS } from '@/lib/gamification';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import VoiceDictationButton from '@/components/VoiceDictationButton';
import DeckEditor, { Flashcard, Deck } from '@/components/DeckEditor';
import { calculateNextReview, SRSGrade, SRSCard } from '@/lib/srs';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MermaidBlock from '@/components/MermaidBlock';
const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        if (!inline && match && match[1] === 'mermaid') {
            return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
        }
        return !inline ? (
            <div style={{ background: '#1e1e2e', padding: 12, borderRadius: 8, overflowX: 'auto', fontSize: 13, fontFamily: 'monospace', color: '#e2e8f0', margin: '12px 0', textAlign: 'left' }}>
                <code className={className} {...props}>{children}</code>
            </div>
        ) : (
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }} className={className} {...props}>{children}</code>
        );
    }
};
const LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
    'Russian', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese', 'Korean',
];
const QUESTION_TYPE_META: Record<QuestionType, { label: string; icon: string; color: string }> = {
    mcq: { label: 'Multiple Choice', icon: '🔘', color: 'var(--brand-violet)' },
    truefalse: { label: 'True / False', icon: '⚖️', color: '#0891b2' },
    numerical: { label: 'Numerical', icon: '🔢', color: '#059669' },
    descriptive: { label: 'Descriptive', icon: '📝', color: '#d97706' },
    fillintheblank: { label: 'Fill-in-the-Blank', icon: '✍️', color: '#ec4899' },
    matching: { label: 'Matching Pairs', icon: '🔗', color: '#8b5cf6' },
};
type InputTab = 'text' | 'image' | 'pdf' | 'docx' | 'audio' | 'youtube';
type ReviewMode = 'list' | 'create' | 'review' | 'ai-generate';
export default function FlashcardsPage() {
    const { user, addXP, gamification, updateStats } = useAuthStore();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
    const [mode, setMode] = useState<ReviewMode>('list');
    const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [inputTab, setInputTab] = useState<InputTab>('text');
    const [content, setContent] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState('English');
    const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
    const [counts, setCounts] = useState<Partial<Record<QuestionType, number>>>({ mcq: 3, truefalse: 2, numerical: 0, descriptive: 5 });
    const [aiLoading, setAiLoading] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [newQ, setNewQ] = useState('');
    const [newA, setNewA] = useState('');
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
    const [editingDeckTitle, setEditingDeckTitle] = useState(false);
    const [editTitleVal, setEditTitleVal] = useState('');
    const fetchDecks = useCallback(async () => {
        if (!user) return;
        try {
            const q = query(collection(db, 'flashcard_decks'), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            setDecks(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() } as Deck)));
        } catch { }
        setLoading(false);
    }, [user]);
    useEffect(() => { fetchDecks(); }, [fetchDecks]);
    async function createDeck() {
        if (!user || !newDeckName.trim()) return;
        try {
            const ref = await addDoc(collection(db, 'flashcard_decks'), {
                userId: user.uid, name: newDeckName, description: '', cards: [], createdAt: serverTimestamp(),
            });
            const deck: Deck = { id: ref.id, name: newDeckName, description: '', cards: [], createdAt: new Date() };
            setDecks(prev => [deck, ...prev]);
            setSelectedDeck(deck);
            setNewDeckName('');
            setMode('create');
            addXP(XP_REWARDS.CREATE_FLASHCARD_DECK);
            updateStats({ flashcardDecksCreated: (gamification.flashcardDecksCreated || 0) + 1 });
            toast.success('🃏 Deck created! +30 XP');
        } catch { toast.error('Failed to create deck'); }
    }
    async function addCard() {
        if (!selectedDeck || !newQ.trim() || !newA.trim()) return;
        const card: Flashcard = { id: Date.now().toString(), question: newQ, answer: newA, difficulty: 'medium', isMarkedForReview: true };
        const updatedCards = [...(selectedDeck.cards || []), card];
        try {
            await updateDoc(doc(db, 'flashcard_decks', selectedDeck.id), { cards: updatedCards });
            const updatedDeck = { ...selectedDeck, cards: updatedCards };
            setSelectedDeck(updatedDeck);
            setDecks(prev => prev.map(d => d.id === selectedDeck.id ? updatedDeck : d));
            setNewQ(''); setNewA('');
            toast.success('Card added!');
        } catch { toast.error('Failed to add card'); }
    }
    async function handleFileUpload(file: File, type: InputTab) {
        if (type === 'text') return;
        toast.loading('Extracting text...', { id: 'file-load' });
        try {
            if (type === 'image' || type === 'audio') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = (e.target?.result as string).split(',')[1];
                    const prompt = type === 'audio' ? 'Transcribe and summarize this audio lecture:' : 'Extract text from this image:';
                    const res = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages: [{ role: 'user', content: `${prompt}\n[${type.toUpperCase()} BASE64: data:${file.type};base64,${base64}]` }], max_tokens: 3000 })
                    });
                    const d = await res.json();
                    setContent(prev => prev + '\n\n' + (d.choices?.[0]?.message?.content || ''));
                    toast.success('Extracted!', { id: 'file-load' });
                };
                reader.readAsDataURL(file);
            } else if (type === 'pdf') {
                const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
                GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
                const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
                let text = '';
                for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) text += (await (await pdf.getPage(i)).getTextContent()).items.map((it: any) => it.str).join(' ') + '\n';
                setContent(text.trim());
                toast.success('Extracted!', { id: 'file-load' });
            } else if (type === 'docx') {
                const mammoth = await import('mammoth');
                setContent((await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value);
                toast.success('Extracted!', { id: 'file-load' });
            }
        } catch (e: any) { toast.error(e.message, { id: 'file-load' }); }
    }
    async function handleYoutubeExtract() {
        if (!youtubeUrl.trim()) return;
        toast.loading('Analyzing YouTube video summary...', { id: 'yt-load' });
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: `Please generate a highly detailed academic transcript summary for the following YouTube lecture URL to be used for flashcards:\n\n${youtubeUrl}` }], max_tokens: 3000 })
            });
            const d = await res.json();
            setContent(prev => prev + '\n\n' + (d.choices?.[0]?.message?.content || ''));
            toast.success('YouTube Video Analyzed!', { id: 'yt-load' });
            setYoutubeUrl('');
            setInputTab('text');
        } catch (e: any) {
            toast.error(e.message, { id: 'yt-load' });
        }
    }
    async function handleGenerateAdvanced() {
        if (!content.trim() && !topic.trim()) { toast.error('Add content or topic'); return; }
        const totalQ = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
        if (totalQ === 0) { toast.error('Select at least 1 card type'); return; }
        setAiLoading(true);
        try {
            const qs = await generateAdvancedQuiz(content || `Generate about: ${topic}`, { counts, language, difficulty, topic: topic || undefined });
            if (!qs.questions.length) throw new Error('No flashcards generated');
            const cards: Flashcard[] = qs.questions.map((q: AdvancedQuestion, i: number) => {
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
                }
                if (q.type !== 'descriptive' && q.explanation) ans += `\n\nExplanation: ${q.explanation}`;
                return { id: `${Date.now()}-${i}`, question: ques.trim(), answer: ans.trim(), difficulty: q.points > 10 ? 'hard' : 'medium', isMarkedForReview: true };
            });
            let targetDeckId = selectedDeck?.id;
            const subject = qs.broadSubject || topic || 'General Knowledge';
            if (targetDeckId && selectedDeck) {
                const updatedCards = [...(selectedDeck.cards || []), ...cards];
                await updateDoc(doc(db, 'flashcard_decks', targetDeckId), {
                    cards: updatedCards,
                    broadSubject: selectedDeck.broadSubject || subject
                });
                const updatedDeck: Deck = { ...selectedDeck, cards: updatedCards, broadSubject: selectedDeck.broadSubject || subject };
                setSelectedDeck(updatedDeck);
                setDecks(prev => prev.map(d => d.id === targetDeckId ? updatedDeck : d));
            } else {
                const deckName = topic ? `${topic} Flashcards` : 'AI Generated Flashcards';
                const ref = await addDoc(collection(db, 'flashcard_decks'), {
                    userId: user!.uid,
                    name: deckName,
                    description: 'Generated from Advanced AI Menu',
                    broadSubject: subject,
                    cards,
                    createdAt: serverTimestamp()
                });
                const newDeck: Deck = { id: ref.id, name: deckName, description: '', broadSubject: subject, cards, createdAt: new Date() };
                setDecks(prev => [newDeck, ...prev]);
                setSelectedDeck(newDeck);
            }
            addXP(XP_REWARDS.CREATE_FLASHCARD_DECK);
            updateStats({ flashcardDecksCreated: (gamification.flashcardDecksCreated || 0) + 1 });
            toast.success(`🎉 Generated ${cards.length} flashcards!`);
            setContent(''); setTopic(''); setMode('list');
        } catch (err: any) { toast.error(err.message || 'Generation failed'); }
        setAiLoading(false);
    }
    function startReview(deck: Deck) {
        const now = new Date();
        const due = deck.cards.filter(c => {
            if (c.nextReviewDate) {
                return new Date(c.nextReviewDate) <= now;
            }
            return c.isMarkedForReview !== false;
        });
        const toReview = (due.length > 0 ? due : deck.cards.slice(0, 20));
        setReviewCards(toReview);
        setCurrentIndex(0);
        setIsFlipped(false);
        setSessionStats({ reviewed: 0, correct: 0 });
        setSelectedDeck(deck);
        setMode('review');
    }
    async function toggleReviewStatus(grade: SRSGrade) {
        if (!selectedDeck || reviewCards.length === 0) return;
        const card = reviewCards[currentIndex];
        const srsBase: SRSCard = {
            id: card.id,
            easeFactor: card.easeFactor ?? 2.5,
            interval: card.interval ?? 0,
            repetitions: card.repetitions ?? 0,
            dueDate: card.nextReviewDate ? new Date(card.nextReviewDate) : new Date(),
        };
        const srsResult = calculateNextReview(srsBase, grade);
        const updatedCards = selectedDeck.cards.map(c =>
            c.id === card.id ? {
                ...c,
                easeFactor: srsResult.easeFactor,
                interval: srsResult.interval,
                repetitions: srsResult.repetitions,
                nextReviewDate: srsResult.dueDate.toISOString(),
                isMarkedForReview: grade < 3
            } : c
        );
        try {
            await updateDoc(doc(db, 'flashcard_decks', selectedDeck.id), { cards: updatedCards });
            const updatedDeck: Deck = { ...selectedDeck, cards: updatedCards };
            setSelectedDeck(updatedDeck);
            setDecks(prev => prev.map(d => d.id === selectedDeck.id ? updatedDeck : d));
            const subject = updatedDeck.broadSubject;
            if (user && subject) {
                const nodesRef = collection(db, 'knowledge_nodes');
                const qry = query(nodesRef, where('userId', '==', user.uid), where('topic', '==', subject));
                const snap = await getDocs(qry);
                const avgEase = updatedCards.reduce((sum, c) => sum + (c.easeFactor ?? 2.5), 0) / updatedCards.length;
                const avgInterval = updatedCards.reduce((sum, c) => sum + (c.interval ?? 0), 0) / updatedCards.length;
                if (!snap.empty) {
                    const nodeDoc = snap.docs[0];
                    await updateDoc(doc(db, 'knowledge_nodes', nodeDoc.id), {
                        easeFactor: avgEase,
                        interval: Math.max(1, Math.round(avgInterval)),
                        repetitions: (nodeDoc.data().repetitions || 0) + 1,
                        lastReviewed: serverTimestamp(),
                        totalFlashcardsReviewed: (nodeDoc.data().totalFlashcardsReviewed || 0) + 1
                    });
                } else {
                    await addDoc(nodesRef, {
                        userId: user.uid,
                        topic: subject,
                        easeFactor: avgEase,
                        interval: Math.max(1, Math.round(avgInterval)),
                        repetitions: 1,
                        lastReviewed: serverTimestamp(),
                        totalFlashcardsReviewed: 1
                    });
                }
            }
        } catch (err) { console.error("SRS Sync Sync Error:", err); }
        addXP(XP_REWARDS.REVIEW_FLASHCARD);
        updateStats({ flashcardsReviewed: gamification.flashcardsReviewed + 1 });
        setSessionStats(s => ({ reviewed: s.reviewed + 1, correct: grade >= 3 ? s.correct + 1 : s.correct }));
        if (currentIndex < reviewCards.length - 1) {
            setCurrentIndex(i => i + 1);
            setIsFlipped(false);
        } else {
            toast.success(`🎉 Session complete! ${sessionStats.reviewed + 1} cards reviewed`);
            setMode('list');
        }
    }
    async function autoCategorizeDeck(deck: Deck) {
        if (!deck.cards?.length) { toast.error('Deck is empty'); return; }
        toast.loading('AI is identifying topic...', { id: 'cat-load' });
        try {
            const contentSample = deck.cards.slice(0, 5).map(c => c.question).join('\n');
            const subject = await categorizeContent(contentSample);
            await updateDoc(doc(db, 'flashcard_decks', deck.id), { broadSubject: subject });
            const updatedDeck = { ...deck, broadSubject: subject };
            setSelectedDeck(updatedDeck);
            setDecks(prev => prev.map(d => d.id === deck.id ? updatedDeck : d));
            toast.success(`Topic identified: ${subject}`, { id: 'cat-load' });
        } catch { toast.error('Categorization failed', { id: 'cat-load' }); }
    }
    const currentCard = reviewCards[currentIndex];
    const dueCount = (deck: Deck) => {
        const now = new Date();
        return deck.cards.filter(c => {
            if (c.nextReviewDate) {
                return new Date(c.nextReviewDate) <= now;
            }
            return c.isMarkedForReview !== false;
        }).length;
    };
    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200 }}>
            <AnimatePresence mode="wait">
                { }
                {mode === 'list' && (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>🃏 Flashcard Decks</h1>
                                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Master your material with smart flashcards</p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <input className="input-field" placeholder="New deck name..." value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && createDeck()} style={{ width: 220, fontSize: 13 }} />
                                <button onClick={createDeck} disabled={!newDeckName.trim()} className="btn-primary">+ Create Deck</button>
                                <button onClick={() => { setSelectedDeck(null); setMode('ai-generate'); }} className="btn-secondary">🤖 AI Options</button>
                            </div>
                        </div>
                        {loading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 160, borderRadius: 16 }} />)}
                            </div>
                        ) : decks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 64, marginBottom: 16 }}>🃏</div>
                                <h2 style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 8 }}>No decks yet</h2>
                                <p>Create your first flashcard deck to start studying with spaced repetition</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                                {decks.map((deck, i) => {
                                    const due = dueCount(deck);
                                    return (
                                        <motion.div key={deck.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                            className="glass-card glass-card-hover" style={{ padding: 24 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div>
                                                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{deck.name}</h3>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{deck.cards?.length || 0} cards</span>
                                                </div>
                                                {due > 0 && <span className="badge badge-rose">{due} due</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => startReview(deck)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: 13 }}>
                                                    {due > 0 ? `📚 Review ${due}` : '📚 Study All'}
                                                </button>
                                                <button onClick={() => { setSelectedDeck(deck); setMode('create'); }} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>✏️</button>
                                                <button onClick={() => { setSelectedDeck(deck); setMode('ai-generate'); }} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>🤖</button>
                                                <button onClick={() => autoCategorizeDeck(deck)} title="Categorize with AI" style={{ padding: '8px 14px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🏷️</button>
                                                <button onClick={async () => { await deleteDoc(doc(db, 'flashcard_decks', deck.id)); setDecks(p => p.filter(d => d.id !== deck.id)); toast.success('Deleted'); }}
                                                    style={{ padding: '8px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🗑</button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
                { }
                {mode === 'create' && selectedDeck && (
                    <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: 'calc(100vh - 120px)' }}>
                        <DeckEditor
                            initialDeck={selectedDeck}
                            onSave={async (updatedDeck) => {
                                await updateDoc(doc(db, 'flashcard_decks', updatedDeck.id), {
                                    name: updatedDeck.name,
                                    cards: updatedDeck.cards
                                });
                                setSelectedDeck(updatedDeck);
                                setDecks(prev => prev.map(d => d.id === updatedDeck.id ? updatedDeck : d));
                                toast.success('Deck saved successfully!');
                            }}
                            onBack={() => setMode('list')}
                        />
                    </motion.div>
                )}
                { }
                {mode === 'ai-generate' && (
                    <motion.div key="ai-gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                            <button onClick={() => setMode('list')} className="btn-ghost">← Back</button>
                            <h1 style={{ fontSize: 24, fontWeight: 800 }} className="gradient-text">🤖 Advanced AI Flashcard Generator {selectedDeck ? `(${selectedDeck.name})` : ''}</h1>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                            { }
                            <div className="glass-card" style={{ padding: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Card Types</h3>
                                    <span style={{ fontSize: 11, color: 'var(--brand-violet-light)', fontWeight: 700 }}>{Object.values(counts).reduce((a, b) => a + (b || 0), 0)} total</span>
                                </div>
                                {(Object.keys(QUESTION_TYPE_META) as QuestionType[]).map(type => {
                                    const meta = QUESTION_TYPE_META[type];
                                    const count = counts[type] ?? 0;
                                    return (
                                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: 12, color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{meta.icon} {meta.label}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button onClick={() => setCounts(c => ({ ...c, [type]: Math.max(0, (c[type] ?? 0) - 1) }))} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none' }}>−</button>
                                                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{count}</span>
                                                <button onClick={() => setCounts(c => ({ ...c, [type]: (c[type] ?? 0) + 1 }))} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none' }}>+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            { }
                            <div className="glass-card" style={{ padding: 18 }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>LANGUAGE</h3>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field" style={{ fontSize: 13, width: '100%' }}>
                                    {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#1e1e2e', color: '#e2e8f0' }}>{l}</option>)}
                                </select>
                            </div>
                            { }
                            <div className="glass-card" style={{ padding: 18 }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>DIFFICULTY</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    {(['easy', 'medium', 'hard', 'adaptive'] as DifficultyLevel[]).map(d => (
                                        <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '7px 6px', borderRadius: 9, border: `1px solid ${difficulty === d ? '#10b98180' : 'var(--border-subtle)'}`, background: difficulty === d ? '#10b98118' : 'rgba(255,255,255,0.03)', color: difficulty === d ? '#10b981' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>{d}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        { }
                        <div className="glass-card" style={{ padding: 22 }}>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                                {(['text', 'image', 'pdf', 'docx', 'audio', 'youtube'] as InputTab[]).map(tab => (
                                    <button key={tab} onClick={() => setInputTab(tab)} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid', borderColor: inputTab === tab ? 'var(--brand-violet)' : 'var(--border-subtle)', background: inputTab === tab ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', color: inputTab === tab ? 'var(--brand-violet-light)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 5 }}>
                                        {tab === 'image' ? '🖼️ Image' : tab === 'pdf' ? '📄 PDF' : tab === 'docx' ? '📝 Word' : tab === 'audio' ? '🎵 Audio' : tab === 'youtube' ? '▶️ YouTube' : '✍️ Text'}
                                    </button>
                                ))}
                            </div>
                            {inputTab === 'text' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
                                    <input className="input-field" placeholder="Topic (e.g. 'Cell Biology')" value={topic} onChange={e => setTopic(e.target.value)} style={{ fontSize: 14, alignSelf: 'start' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <textarea className="input-field" placeholder="Paste study material or dictate..." value={content} onChange={e => setContent(e.target.value)} rows={8} style={{ resize: 'vertical' }} />
                                        <VoiceDictationButton onResult={(text) => setContent(prev => prev ? prev + ' ' + text : text)} />
                                    </div>
                                </div>
                            ) : inputTab === 'youtube' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 32, alignItems: 'center', border: '2px dashed var(--border-subtle)', borderRadius: 14 }}>
                                    <div style={{ fontSize: 36, marginBottom: 10 }}>▶️</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>Paste a YouTube Lecture URL</div>
                                    <div style={{ display: 'flex', width: '100%', maxWidth: 500, gap: 10 }}>
                                        <input className="input-field" placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} style={{ flex: 1 }} />
                                        <button onClick={handleYoutubeExtract} disabled={!youtubeUrl.trim()} className="btn-primary">Extract</button>
                                    </div>
                                </div>
                            ) : (
                                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-subtle)', borderRadius: 14, padding: '32px 24px', cursor: 'pointer', minHeight: 180 }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file, inputTab); }}>
                                    <input type="file" accept={inputTab === 'image' ? 'image/*' : inputTab === 'pdf' ? '.pdf' : '.docx'} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file, inputTab); }} style={{ display: 'none' }} />
                                    {/* ADDED MISSING CONTENT BELOW */}
                                    <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Click or Drag & Drop to Upload</div>
                                </label>
                            )}
                            <button onClick={handleGenerateAdvanced} disabled={aiLoading} className="btn-primary" style={{ width: '100%', marginTop: 24, padding: '14px', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                                {aiLoading ? '⏳ Generating Cards...' : '🚀 Generate AI Flashcards'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {mode === 'review' && currentCard && (
                    <motion.div key="review" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>
                        { }
                        <div style={{ width: '100%', maxWidth: 600, marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                <span>{currentIndex + 1} / {reviewCards.length}</span>
                                <span>✅ {sessionStats.correct} correct</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${((currentIndex + 1) / reviewCards.length) * 100}%` }} />
                            </div>
                        </div>
                        { }
                        <div className="flashcard-container" style={{ width: '100%', maxWidth: 600, height: 'auto', minHeight: 400, marginBottom: 32, cursor: 'pointer' }} onClick={() => { if (window.getSelection()?.toString()) return; setIsFlipped(f => !f); }}>
                            <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
                                <div className="flashcard-front glass-card" style={{
                                    background: currentCard.style?.background || 'var(--bg-card)',
                                    color: currentCard.style?.textColor || 'var(--text-primary)',
                                    fontFamily: currentCard.style?.fontFamily || 'Inter',
                                    textAlign: currentCard.style?.textAlign || 'center',
                                    border: currentCard.style?.borderStyle !== 'none' && currentCard.style?.borderStyle !== 'glowing' ? `4px ${currentCard.style?.borderStyle} ${currentCard.style?.borderColor}` : 'none',
                                    boxSizing: 'border-box',
                                    boxShadow: currentCard.style?.borderStyle === 'glowing' ? `0 0 20px ${currentCard.style?.borderColor}` : 'var(--shadow-elevated)',
                                    flexDirection: 'column',
                                    gap: 16, padding: '24px 32px', overflowY: 'auto'
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }}>QUESTION</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.5, whiteSpace: 'pre-wrap', paddingBottom: 16, flex: 1 }}>
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{currentCard.question}</ReactMarkdown>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'auto', flexShrink: 0, opacity: 0.6 }}>Click to reveal answer</div>
                                </div>
                                <div className="flashcard-back" style={{
                                    background: currentCard.style?.background || 'linear-gradient(135deg, rgba(var(--brand-violet-rgb),0.15) 0%, rgba(var(--brand-cyan-rgb, 6,182,212),0.15) 100%)',
                                    color: currentCard.style?.textColor || 'var(--text-primary)',
                                    fontFamily: currentCard.style?.fontFamily || 'Inter',
                                    textAlign: currentCard.style?.textAlign || 'center',
                                    border: currentCard.style?.borderStyle !== 'none' && currentCard.style?.borderStyle !== 'glowing' ? `4px ${currentCard.style?.borderStyle} ${currentCard.style?.borderColor}` : '1px solid rgba(var(--brand-violet-rgb),0.3)',
                                    boxSizing: 'border-box',
                                    boxShadow: currentCard.style?.borderStyle === 'glowing' ? `0 0 20px ${currentCard.style?.borderColor}` : 'var(--shadow-elevated)',
                                    flexDirection: 'column',
                                    gap: 16, borderRadius: 24, padding: '24px 32px', overflowY: 'auto'
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-violet-light)', flexShrink: 0, opacity: 0.8 }}>ANSWER</div>
                                    <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingBottom: 16, flex: 1 }}>
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{currentCard.answer}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                        { }
                        <AnimatePresence>
                            {isFlipped && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleReviewStatus(1)}
                                        style={{ padding: '12px 24px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: 12, color: '#f43f5e', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter' }}>
                                        Hard
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleReviewStatus(3)}
                                        style={{ padding: '12px 24px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 12, color: '#f59e0b', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter' }}>
                                        Medium
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleReviewStatus(4)}
                                        style={{ padding: '12px 24px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 12, color: '#10b981', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter' }}>
                                        Easy
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleReviewStatus(5)}
                                        style={{ padding: '12px 24px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: 12, color: '#38bdf8', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter' }}>
                                        Perfect
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button onClick={() => setMode('list')} className="btn-ghost" style={{ marginTop: 24 }}>End Session</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
