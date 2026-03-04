'use client';
import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
export default function OCRPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);
    async function processImage(file: File) {
        setLoading(true);
        setProgress(0);
        setExtractedText('');
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        try {
            const Tesseract = (await import('tesseract.js')).default;
            const result = await Tesseract.recognize(file, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                    }
                },
            });
            setExtractedText(result.data.text);
            toast.success('âœ… Text extracted successfully!');
        } catch (err) {
            console.error(err);
            toast.error('OCR failed. Please try a clearer image.');
        }
        setLoading(false);
    }
    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) processImage(file);
    }
    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) processImage(file);
    }
    return (
        <div className="page-container" style={{ padding: '32px 40px', maxWidth: 1000 }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>ðŸ“· OCR Scanner</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Snap a photo of textbook pages or handwritten notes â€” extract text instantly</p>
            </motion.div>
            <div className="page-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                { }
                <div>
                    <div
                        onDrop={handleDrop}
                        onDragOver={e => e.preventDefault()}
                        onClick={() => fileRef.current?.click()}
                        style={{ border: '2px dashed rgba(124,58,237,0.4)', borderRadius: 20, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(124,58,237,0.04)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.7)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.04)'; }}>
                        <div className="page-container" style={{ fontSize: 48, marginBottom: 16 }}>ðŸ“·</div>
                        <div className="page-container" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Drop image here or click to upload</div>
                        <div className="page-container" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Supports JPG, PNG, BMP, TIFF</div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                    </div>
                </div>
                <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="page-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Extracted Text</h2>
                        {extractedText && (
                            <div className="page-container" style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { navigator.clipboard.writeText(extractedText); toast.success('Copied!'); }} className="btn-ghost" style={{ fontSize: 12 }}>ðŸ“‹ Copy</button>
                                <button onClick={() => setExtractedText('')} className="btn-ghost" style={{ fontSize: 12 }}>ðŸ—‘ Clear</button>
                            </div>
                        )}
                    </div>
                    <textarea
                        value={extractedText}
                        onChange={e => setExtractedText(e.target.value)}
                        placeholder="Extracted text will appear here. You can also edit it manually..."
                        className="input-field"
                        style={{ flex: 1, resize: 'none', minHeight: 400, fontSize: 14, lineHeight: 1.7 }}
                    />
                    {extractedText && (
                        <div className="page-container" style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                                onClick={() => { window.open(`/notes?ocr=${encodeURIComponent(extractedText.slice(0, 2000))}`); toast.success('Opening in Notes...'); }}>
                                ðŸ“ Open in Notes
                            </button>
                        </div>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Powered by Tesseract.js â€” runs entirely in your browser, no data sent to servers.</p>
                </div>
            </div>
        </div>
    );
}

