"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type User } from "@/lib/api";

interface OwnerInfo {
    name?: string;
    name_hindi?: string;
    father_name?: string;
    father_husband_name?: string;
    relationship?: string;
}

interface PropertyAddress {
    village?: string;
    village_hindi?: string;
    tehsil?: string;
    district?: string;
    state?: string;
    pin_code?: string;
}

// Gemini TTS voice options
const GEMINI_VOICES = [
    { name: "Kore", desc: "Firm & Clear" },
    { name: "Puck", desc: "Upbeat & Warm" },
    { name: "Charon", desc: "Deep & Warm" },
    { name: "Aoede", desc: "Bright & Natural" },
    { name: "Leda", desc: "Youthful" },
    { name: "Fenrir", desc: "Expressive" },
    { name: "Zephyr", desc: "Breezy & Light" },
    { name: "Orus", desc: "Authoritative" },
];

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: documentId } = use(params);
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [docInfo, setDocInfo] = useState<any>(null);
    const [entities, setEntities] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Narration state
    const [narration, setNarration] = useState("");
    const [generatingNarration, setGeneratingNarration] = useState(false);

    // Gemini TTS Audio state
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState("Kore");
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Cleanup audio URL on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // Load document & entities
    useEffect(() => {
        if (!api.isAuthenticated()) {
            router.push("/auth/login");
            return;
        }
        (async () => {
            try {
                const [userData, doc, ent] = await Promise.all([
                    api.getMe(),
                    api.getDocument(documentId),
                    api.getEntities(documentId).catch(() => null),
                ]);
                setUser(userData);
                setDocInfo(doc);
                if (ent) setEntities(ent.entities);
            } catch (err: any) {
                setError(err.message || "Failed to load document");
            } finally {
                setLoading(false);
            }
        })();
    }, [documentId, router]);

    // Analyze if not already done
    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const result = await api.analyzeDocument(documentId);
            setEntities(result.entities);
            setDocInfo((prev: any) => prev ? { ...prev, status: "completed", document_type: result.document_type } : prev);
        } catch (err: any) {
            setError(err.message || "Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    // Generate narration text + Gemini TTS audio together
    const handleGenerateNarration = async () => {
        setGeneratingNarration(true);
        setAudioUrl(null);
        setIsPlaying(false);
        try {
            // Step 1: Generate narration text
            const result = await api.getNarration(documentId);
            setNarration(result.narration);

            // Step 2: Generate Gemini TTS audio
            setGeneratingAudio(true);
            const url = await api.getTTS(documentId, selectedVoice);
            setAudioUrl(url);
        } catch (err: any) {
            alert(err.message || "Narration generation failed");
        } finally {
            setGeneratingNarration(false);
            setGeneratingAudio(false);
        }
    };

    // Generate just the audio with a different voice
    const handleRegenerateAudio = async () => {
        if (!narration) return;
        setGeneratingAudio(true);
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        try {
            const url = await api.getTTS(documentId, selectedVoice);
            setAudioUrl(url);
        } catch (err: any) {
            alert(err.message || "Audio generation failed");
        } finally {
            setGeneratingAudio(false);
        }
    };

    // Audio play/pause
    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleStop = () => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
    };

    // Render helpers
    const owners: OwnerInfo[] = entities?.owners || [];
    const address: PropertyAddress = entities?.property_address || {};
    const additional: Record<string, any> = entities?.additional_details || {};

    const cardStyle: React.CSSProperties = {
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
    };

    const valStyle: React.CSSProperties = {
        fontSize: 15, color: "var(--text-primary)", fontWeight: 500,
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (error && !docInfo) {
        return (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", gap: 16 }}>
                <div style={{ fontSize: 48 }}>❌</div>
                <p style={{ color: "var(--danger)" }}>{error}</p>
                <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
            {/* Navbar */}
            <nav className="navbar">
                <Link href="/" className="navbar-brand">🛡️ <span>Bhoomi Suraksha</span></Link>
                <div className="navbar-links">
                    <Link href="/dashboard">Dashboard</Link>
                    <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>👤 {user?.full_name}</span>
                </div>
            </nav>

            <div className="container page-content" style={{ maxWidth: 900 }}>
                {/* Document Header */}
                <div style={{ marginBottom: 32 }}>
                    <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 14 }}>
                        ← Back to Dashboard
                    </Link>
                    <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, marginTop: 12 }}>
                        📄 {docInfo?.original_filename}
                    </h1>
                    <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 14, color: "var(--text-secondary)" }}>
                        <span>Uploaded: {docInfo && new Date(docInfo.created_at).toLocaleDateString()}</span>
                        <span className={`status-pill ${docInfo?.status}`}>{docInfo?.status}</span>
                        {entities?.document_type && (
                            <span style={{
                                padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                                background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)",
                            }}>
                                {entities.document_type}
                            </span>
                        )}
                    </div>
                </div>

                {/* Analyze Button if not yet analyzed */}
                {!entities && (
                    <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🧠</div>
                        <h2 style={{ marginBottom: 8 }}>Document not yet analyzed</h2>
                        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
                            Click below to run AI analysis — it will extract all property details from your document.
                        </p>
                        <button className="btn btn-primary btn-lg" onClick={handleAnalyze}>
                            🧠 Analyze Document
                        </button>
                    </div>
                )}

                {/* Extracted Entities */}
                {entities && (
                    <>
                        {/* Confidence Score */}
                        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 20 }}>
                            <div style={{
                                width: 60, height: 60, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 20, fontWeight: 800, fontFamily: "var(--font-heading)",
                                background: entities.confidence >= 0.7 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                                color: entities.confidence >= 0.7 ? "var(--success)" : "var(--warning)",
                                border: `2px solid ${entities.confidence >= 0.7 ? "var(--success)" : "var(--warning)"}`,
                            }}>
                                {Math.round((entities.confidence || 0) * 100)}%
                            </div>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>AI Extraction Confidence</div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                    {entities.document_type_hindi || entities.document_type || "Property Document"}
                                </div>
                            </div>
                        </div>

                        {/* Owners */}
                        {owners.length > 0 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>👤 Owners / Khatedar</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {owners.map((owner, i) => (
                                        <div key={i} style={{
                                            padding: 16, background: "rgba(255,255,255,0.03)",
                                            borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
                                        }}>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                                <div>
                                                    <div style={labelStyle}>Name (English)</div>
                                                    <div style={valStyle}>{owner.name || "—"}</div>
                                                </div>
                                                <div>
                                                    <div style={labelStyle}>Name (Hindi)</div>
                                                    <div style={valStyle}>{owner.name_hindi || "—"}</div>
                                                </div>
                                                <div>
                                                    <div style={labelStyle}>Father / Husband Name</div>
                                                    <div style={valStyle}>{owner.father_name || owner.father_husband_name || "—"}</div>
                                                </div>
                                                <div>
                                                    <div style={labelStyle}>Relationship</div>
                                                    <div style={valStyle}>{owner.relationship || "—"}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Property Address */}
                        {(address.village || address.district || address.tehsil) && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📍 Property Address</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                                    <div>
                                        <div style={labelStyle}>Village / Gram</div>
                                        <div style={valStyle}>{address.village || address.village_hindi || "—"}</div>
                                    </div>
                                    <div>
                                        <div style={labelStyle}>Tehsil</div>
                                        <div style={valStyle}>{address.tehsil || "—"}</div>
                                    </div>
                                    <div>
                                        <div style={labelStyle}>District / Jila</div>
                                        <div style={valStyle}>{address.district || "—"}</div>
                                    </div>
                                    <div>
                                        <div style={labelStyle}>State</div>
                                        <div style={valStyle}>{address.state || "—"}</div>
                                    </div>
                                    {address.pin_code && (
                                        <div>
                                            <div style={labelStyle}>PIN Code</div>
                                            <div style={valStyle}>{address.pin_code}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Land Details */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🏗️ Land Details</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                                <div>
                                    <div style={labelStyle}>Khasra Number</div>
                                    <div style={valStyle}>{entities.khasra_number || "—"}</div>
                                </div>
                                <div>
                                    <div style={labelStyle}>Gata Number</div>
                                    <div style={valStyle}>{entities.gata_number || "—"}</div>
                                </div>
                                <div>
                                    <div style={labelStyle}>Khata Number</div>
                                    <div style={valStyle}>{entities.khata_number || "—"}</div>
                                </div>
                                <div>
                                    <div style={labelStyle}>Plot Area</div>
                                    <div style={valStyle}>
                                        {entities.plot_area ? `${entities.plot_area} ${entities.plot_area_unit || ""}` : "—"}
                                    </div>
                                </div>
                                {additional.land_category && (
                                    <div>
                                        <div style={labelStyle}>Land Category</div>
                                        <div style={valStyle}>{additional.land_category}</div>
                                    </div>
                                )}
                                {additional.fasli_year && (
                                    <div>
                                        <div style={labelStyle}>Fasli Year</div>
                                        <div style={valStyle}>{additional.fasli_year}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Registration Info */}
                        {(entities.registration_number || entities.registration_date || entities.stamp_duty) && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📝 Registration Details</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                                    {entities.registration_number && (
                                        <div>
                                            <div style={labelStyle}>Registration No.</div>
                                            <div style={valStyle}>{entities.registration_number}</div>
                                        </div>
                                    )}
                                    {entities.registration_date && (
                                        <div>
                                            <div style={labelStyle}>Registration Date</div>
                                            <div style={valStyle}>{entities.registration_date}</div>
                                        </div>
                                    )}
                                    {entities.stamp_duty && (
                                        <div>
                                            <div style={labelStyle}>Stamp Duty</div>
                                            <div style={valStyle}>{entities.stamp_duty}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Court Orders */}
                        {additional.court_orders?.length > 0 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>⚖️ Court Orders</h3>
                                {additional.court_orders.map((order: any, i: number) => (
                                    <div key={i} style={{
                                        padding: 12, background: "rgba(255,255,255,0.03)",
                                        borderRadius: 10, marginBottom: 8, fontSize: 14,
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}>
                                        <div><strong>Case:</strong> {order.case_number || "—"}</div>
                                        <div><strong>Court:</strong> {order.court_name || "—"}</div>
                                        <div><strong>Date:</strong> {order.order_date || "—"}</div>
                                        {order.order_basis && <div><strong>Basis:</strong> {order.order_basis}</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Mutations */}
                        {additional.mutations?.length > 0 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🔄 Mutations / Naamantaran</h3>
                                {additional.mutations.map((m: any, i: number) => (
                                    <div key={i} style={{
                                        padding: 12, background: "rgba(255,255,255,0.03)",
                                        borderRadius: 10, marginBottom: 8, fontSize: 14,
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}>
                                        <div><strong>Type:</strong> {m.type || "—"}</div>
                                        <div><strong>Case:</strong> {m.case_number || "—"}</div>
                                        {m.basis && <div><strong>Basis:</strong> {m.basis}</div>}
                                        {m.added_party && <div><strong>Added:</strong> {m.added_party}</div>}
                                        {m.removed_party && <div><strong>Removed:</strong> {m.removed_party}</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Mortgages */}
                        {additional.mortgages?.length > 0 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🏦 Mortgages / Bandhak</h3>
                                {additional.mortgages.map((m: any, i: number) => (
                                    <div key={i} style={{
                                        padding: 12, background: "rgba(255,255,255,0.03)",
                                        borderRadius: 10, marginBottom: 8, fontSize: 14,
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}>
                                        <div><strong>Status:</strong> {m.status || "—"}</div>
                                        <div><strong>Bank:</strong> {m.bank_name || "—"}</div>
                                        {m.mortgage_amount && <div><strong>Amount:</strong> ₹{m.mortgage_amount}</div>}
                                        {m.mortgage_date && <div><strong>Date:</strong> {m.mortgage_date}</div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── AI Narration + Gemini TTS Section ──────────────────── */}
                        <div style={{
                            ...cardStyle,
                            background: "rgba(99,102,241,0.05)",
                            border: "1px solid rgba(99,102,241,0.2)",
                        }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                                🔊 AI Audio Narration
                            </h3>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
                                Powered by <strong>Gemini 2.5 Flash TTS</strong> — studio-quality AI voice generation
                            </p>
                            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
                                Generate a detailed AI narration and listen with high-quality Gemini voice.
                            </p>

                            {/* Voice Selection — show before generating */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                                    Select AI Voice
                                </label>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                                    {GEMINI_VOICES.map((v) => (
                                        <button
                                            key={v.name}
                                            onClick={() => setSelectedVoice(v.name)}
                                            style={{
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: selectedVoice === v.name
                                                    ? "2px solid var(--accent-primary)"
                                                    : "1px solid rgba(255,255,255,0.08)",
                                                background: selectedVoice === v.name
                                                    ? "rgba(99,102,241,0.15)"
                                                    : "rgba(255,255,255,0.03)",
                                                cursor: "pointer",
                                                textAlign: "center",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                                {v.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                                {v.desc}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Generate Button */}
                            {!narration && (
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleGenerateNarration}
                                    disabled={generatingNarration}
                                    style={{ width: "100%" }}
                                >
                                    {generatingNarration ? (
                                        <>
                                            <span className="spinner" style={{ width: 18, height: 18, marginRight: 8 }} />
                                            {generatingAudio ? "Generating AI Voice..." : "Generating Narration..."}
                                        </>
                                    ) : (
                                        "🤖 Generate AI Narration & Voice"
                                    )}
                                </button>
                            )}

                            {/* Narration Text + Audio Player */}
                            {narration && (
                                <>
                                    {/* Narration Text Box */}
                                    <div style={{
                                        padding: 20, background: "rgba(255,255,255,0.03)",
                                        borderRadius: 12, marginBottom: 20,
                                        fontSize: 15, lineHeight: 1.8,
                                        color: "var(--text-secondary)",
                                        maxHeight: 250, overflowY: "auto",
                                        whiteSpace: "pre-wrap",
                                    }}>
                                        {narration}
                                    </div>

                                    {/* Audio Player Section */}
                                    <div style={{
                                        padding: 20, background: "rgba(255,255,255,0.03)",
                                        borderRadius: 12,
                                    }}>
                                        {/* Loading state */}
                                        {generatingAudio && (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
                                                <span className="spinner" style={{ width: 24, height: 24 }} />
                                                <span style={{ fontSize: 15, color: "var(--text-secondary)" }}>
                                                    Generating AI voice with Gemini TTS...
                                                </span>
                                            </div>
                                        )}

                                        {/* Audio Player */}
                                        {audioUrl && !generatingAudio && (
                                            <>
                                                {/* Hidden audio element */}
                                                <audio
                                                    ref={audioRef}
                                                    src={audioUrl}
                                                    onEnded={() => setIsPlaying(false)}
                                                    onPause={() => setIsPlaying(false)}
                                                    onPlay={() => setIsPlaying(true)}
                                                />

                                                {/* Custom Audio Controls */}
                                                <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                                                    {/* Waveform animation placeholder */}
                                                    <div style={{
                                                        display: "flex", alignItems: "center", gap: 3,
                                                        height: 40, padding: "0 20px",
                                                    }}>
                                                        {Array.from({ length: 20 }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                style={{
                                                                    width: 3,
                                                                    height: isPlaying ? `${12 + Math.random() * 28}px` : "8px",
                                                                    background: isPlaying
                                                                        ? "var(--accent-primary)"
                                                                        : "rgba(255,255,255,0.15)",
                                                                    borderRadius: 2,
                                                                    transition: "height 0.15s ease",
                                                                }}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Play / Pause / Stop */}
                                                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={handlePlayPause}
                                                            style={{ minWidth: 120, fontSize: 15 }}
                                                        >
                                                            {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                                                        </button>
                                                        {isPlaying && (
                                                            <button className="btn btn-secondary" onClick={handleStop}>
                                                                ⏹️ Stop
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={handleRegenerateAudio}
                                                            disabled={generatingAudio}
                                                        >
                                                            🔄 New Voice
                                                        </button>
                                                    </div>

                                                    {/* Download link */}
                                                    <a
                                                        href={audioUrl}
                                                        download={`narration_${documentId}.wav`}
                                                        style={{
                                                            fontSize: 13, color: "var(--accent-primary)",
                                                            textDecoration: "none",
                                                        }}
                                                    >
                                                        📥 Download Audio File
                                                    </a>
                                                </div>
                                            </>
                                        )}

                                        {/* No audio yet (narration exists but audio not generated) */}
                                        {!audioUrl && !generatingAudio && (
                                            <div style={{ textAlign: "center" }}>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleRegenerateAudio}
                                                    style={{ minWidth: 200 }}
                                                >
                                                    🔊 Generate AI Voice
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Regenerate narration text button */}
                                    <div style={{ textAlign: "center", marginTop: 12 }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleGenerateNarration}
                                            disabled={generatingNarration}
                                            style={{ fontSize: 13 }}
                                        >
                                            {generatingNarration ? "Regenerating..." : "🔄 Regenerate Narration & Voice"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
