"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type User } from "@/lib/api";
import styles from "../../dashboard/dashboard.module.css";

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

const GEMINI_VOICES = [
  { name: "Kore",   desc: "Firm & Clear" },
  { name: "Puck",   desc: "Upbeat & Warm" },
  { name: "Charon", desc: "Deep & Warm" },
  { name: "Aoede",  desc: "Bright & Natural" },
  { name: "Leda",   desc: "Youthful" },
  { name: "Fenrir", desc: "Expressive" },
  { name: "Zephyr", desc: "Breezy & Light" },
  { name: "Orus",   desc: "Authoritative" },
];

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: documentId } = use(params);
  const router = useRouter();

  const [user, setUser]       = useState<User | null>(null);
  const [docInfo, setDocInfo] = useState<any>(null);
  const [entities, setEntities] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [narration, setNarration]           = useState("");
  const [generatingNarration, setGeneratingNarration] = useState(false);
  const [audioUrl, setAudioUrl]             = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [selectedVoice, setSelectedVoice]   = useState("Kore");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  useEffect(() => {
    if (!api.isAuthenticated()) { router.push("/auth/login"); return; }
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId, router]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await api.analyzeDocument(documentId);
      setEntities(result.entities);
      setDocInfo((prev: any) =>
        prev ? { ...prev, status: "completed", document_type: result.document_type } : prev
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNarration = async () => {
    setGeneratingNarration(true);
    setAudioUrl(null);
    setIsPlaying(false);
    try {
      const result = await api.getNarration(documentId);
      setNarration(result.narration);
      setGeneratingAudio(true);
      const url = await api.getTTS(documentId, selectedVoice);
      setAudioUrl(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Narration failed");
    } finally {
      setGeneratingNarration(false);
      setGeneratingAudio(false);
    }
  };

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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Audio failed");
    } finally {
      setGeneratingAudio(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else            { audioRef.current.play();  setIsPlaying(true);  }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const owners: OwnerInfo[]           = entities?.owners || [];
  const address: PropertyAddress      = entities?.property_address || {};
  const additional: Record<string, any> = entities?.additional_details || {};

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <span>Loading document…</span>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────── */
  if (error && !docInfo) {
    return (
      <div className={styles.errorScreen}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E8A09A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <p>{error}</p>
        <Link href="/dashboard" className={`${styles.actionBtn} ${styles.actionPrimary}`}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            <svg width="20" height="22" viewBox="0 0 22 24" fill="none">
              <path d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
                stroke="#2b1e05" strokeWidth="1.4" fill="url(#dv1)"/>
              <path d="m9 12 2 2 4-4" stroke="#2b1e05" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="dv1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#F0C94A"/>
                  <stop offset="1" stopColor="#A67C10"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>Bhoomi Suraksha</div>
            <div className={styles.brandHin}>भूमि सुरक्षा</div>
          </div>
        </Link>

        <div className={styles.navRight}>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
          <div className={styles.navUser}>
            <div className={styles.navUserAvatar}>
              {user?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            {user?.full_name}
          </div>
        </div>
      </nav>

      {/* ── Detail content ───────────────────────────────── */}
      <div className={styles.detailContent}>

        {/* Back + title */}
        <Link href="/dashboard" className={styles.backLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Dashboard
        </Link>

        <h1 className={styles.docTitle}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {docInfo?.original_filename}
        </h1>

        <div className={styles.docMeta}>
          <span>Uploaded {docInfo && new Date(docInfo.created_at).toLocaleDateString("en-IN")}</span>
          <span className={`${styles.pill} ${
            docInfo?.status === "completed" ? styles.pillCompleted :
            docInfo?.status === "failed"    ? styles.pillFailed    : styles.pillUploaded
          }`}>{docInfo?.status}</span>
          {entities?.document_type && (
            <span className={styles.docTypeBadge}>{entities.document_type}</span>
          )}
        </div>

        {/* Analyze CTA */}
        {!entities && (
          <div className={`${styles.detailCard} ${styles.analyzeCta}`} style={{ marginTop: 24 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 20px", display: "block" }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <h2>Document not yet analyzed</h2>
            <p>Click below to run AI analysis — extracts all property details from your document.</p>
            <button className={styles.generateBtn} onClick={handleAnalyze} style={{ marginTop: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              Analyze Document
            </button>
          </div>
        )}

        {entities && (
          <>
            {/* Confidence */}
            <div className={styles.confidenceBadge} style={{ marginTop: 24 }}>
              <div className={`${styles.confidenceRing} ${
                (entities.confidence ?? 0) >= 0.7 ? styles.confidenceHigh : styles.confidenceMed
              }`}>
                {Math.round((entities.confidence ?? 0) * 100)}%
              </div>
              <div>
                <div className={styles.confidenceLabel}>AI Extraction Confidence</div>
                <div className={styles.confidenceSub}>
                  {entities.document_type_hindi || entities.document_type || "Property Document"}
                </div>
              </div>
            </div>

            {/* Owners */}
            {owners.length > 0 && (
              <div className={styles.detailCard}>
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Owners / Khatedar
                </h3>
                {owners.map((owner, i) => (
                  <div key={i} className={styles.ownerRow}>
                    <div className={styles.grid2}>
                      <div className={styles.field}><label>Name (English)</label><div className={styles.val}>{owner.name || "—"}</div></div>
                      <div className={styles.field}><label>Name (Hindi)</label><div className={styles.val}>{owner.name_hindi || "—"}</div></div>
                      <div className={styles.field}><label>Father / Husband</label><div className={styles.val}>{owner.father_name || owner.father_husband_name || "—"}</div></div>
                      <div className={styles.field}><label>Relationship</label><div className={styles.val}>{owner.relationship || "—"}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Address */}
            {(address.village || address.district || address.tehsil) && (
              <div className={styles.detailCard}>
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Property Address
                </h3>
                <div className={styles.grid3}>
                  <div className={styles.field}><label>Village / Gram</label><div className={styles.val}>{address.village || address.village_hindi || "—"}</div></div>
                  <div className={styles.field}><label>Tehsil</label><div className={styles.val}>{address.tehsil || "—"}</div></div>
                  <div className={styles.field}><label>District / Jila</label><div className={styles.val}>{address.district || "—"}</div></div>
                  <div className={styles.field}><label>State</label><div className={styles.val}>{address.state || "—"}</div></div>
                  {address.pin_code && (
                    <div className={styles.field}><label>PIN Code</label><div className={styles.val}>{address.pin_code}</div></div>
                  )}
                </div>
              </div>
            )}

            {/* Land details */}
            <div className={styles.detailCard}>
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Land Details
              </h3>
              <div className={styles.grid3}>
                <div className={styles.field}><label>Khasra No.</label><div className={styles.val}>{entities.khasra_number || "—"}</div></div>
                <div className={styles.field}><label>Gata No.</label><div className={styles.val}>{entities.gata_number || "—"}</div></div>
                <div className={styles.field}><label>Khata No.</label><div className={styles.val}>{entities.khata_number || "—"}</div></div>
                <div className={styles.field}>
                  <label>Plot Area</label>
                  <div className={styles.val}>
                    {entities.plot_area ? `${entities.plot_area} ${entities.plot_area_unit || ""}` : "—"}
                  </div>
                </div>
                {additional.land_category && (
                  <div className={styles.field}><label>Land Category</label><div className={styles.val}>{additional.land_category}</div></div>
                )}
                {additional.fasli_year && (
                  <div className={styles.field}><label>Fasli Year</label><div className={styles.val}>{additional.fasli_year}</div></div>
                )}
              </div>
            </div>

            {/* Registration */}
            {(entities.registration_number || entities.registration_date || entities.stamp_duty) && (
              <div className={styles.detailCard}>
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Registration Details
                </h3>
                <div className={styles.grid3}>
                  {entities.registration_number && (
                    <div className={styles.field}><label>Registration No.</label><div className={styles.val}>{entities.registration_number}</div></div>
                  )}
                  {entities.registration_date && (
                    <div className={styles.field}><label>Registration Date</label><div className={styles.val}>{entities.registration_date}</div></div>
                  )}
                  {entities.stamp_duty && (
                    <div className={styles.field}><label>Stamp Duty</label><div className={styles.val}>{entities.stamp_duty}</div></div>
                  )}
                </div>
              </div>
            )}

            {/* Court orders */}
            {additional.court_orders?.length > 0 && (
              <div className={styles.detailCard}>
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3l-7 7a1 1 0 0 0 0 1.41l2.59 2.59a1 1 0 0 0 1.41 0L19 9a3 3 0 0 0 0-6zM6.12 15.88L4 22l6.12-2.12"/></svg>
                  Court Orders
                </h3>
                {additional.court_orders.map((order: any, i: number) => (
                  <div key={i} className={styles.subItem}>
                    {order.case_number && <div><strong>Case:</strong> {order.case_number}</div>}
                    {order.court_name  && <div><strong>Court:</strong> {order.court_name}</div>}
                    {order.order_date  && <div><strong>Date:</strong> {order.order_date}</div>}
                    {order.order_basis && <div><strong>Basis:</strong> {order.order_basis}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Mutations */}
            {additional.mutations?.length > 0 && (
              <div className={styles.detailCard}>
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Mutations / Naamantaran
                </h3>
                {additional.mutations.map((m: any, i: number) => (
                  <div key={i} className={styles.subItem}>
                    {m.type         && <div><strong>Type:</strong> {m.type}</div>}
                    {m.case_number  && <div><strong>Case:</strong> {m.case_number}</div>}
                    {m.basis        && <div><strong>Basis:</strong> {m.basis}</div>}
                    {m.added_party  && <div><strong>Added:</strong> {m.added_party}</div>}
                    {m.removed_party && <div><strong>Removed:</strong> {m.removed_party}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Mortgages */}
            {additional.mortgages?.length > 0 && (
              <div className={styles.detailCard}>
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 13h6M9 17h3"/></svg>
                  Mortgages / Bandhak
                </h3>
                {additional.mortgages.map((m: any, i: number) => (
                  <div key={i} className={styles.subItem}>
                    {m.status          && <div><strong>Status:</strong> {m.status}</div>}
                    {m.bank_name       && <div><strong>Bank:</strong> {m.bank_name}</div>}
                    {m.mortgage_amount && <div><strong>Amount:</strong> ₹{m.mortgage_amount}</div>}
                    {m.mortgage_date   && <div><strong>Date:</strong> {m.mortgage_date}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ── AI Narration ────────────────────────────── */}
            <div className={styles.narrationCard}>
              <h3>AI Audio Narration</h3>
              <p className={styles.sub}>
                Powered by <strong style={{ color: "var(--gold2)" }}>Gemini 2.5 Flash TTS</strong>
                {" "}— generate a detailed narration and listen with an AI voice.
              </p>

              {/* Voice selector */}
              <div className={styles.voiceGrid}>
                {GEMINI_VOICES.map((v) => (
                  <button
                    key={v.name}
                    className={`${styles.voiceBtn} ${selectedVoice === v.name ? styles.selected : ""}`}
                    onClick={() => setSelectedVoice(v.name)}
                  >
                    <div className={styles.voiceName}>{v.name}</div>
                    <div className={styles.voiceDesc}>{v.desc}</div>
                  </button>
                ))}
              </div>

              {/* Generate */}
              {!narration && (
                <button className={styles.generateBtn} onClick={handleGenerateNarration} disabled={generatingNarration}>
                  {generatingNarration ? (
                    <>
                      <div className={styles.spinner} style={{ width: 18, height: 18 }} />
                      {generatingAudio ? "Generating AI Voice…" : "Generating Narration…"}
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                      Generate AI Narration &amp; Voice
                    </>
                  )}
                </button>
              )}

              {/* Narration text + audio */}
              {narration && (
                <>
                  <div className={styles.narrationText}>{narration}</div>

                  <div className={styles.audioPlayer}>
                    {generatingAudio && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 16 }}>
                        <div className={styles.spinner} style={{ width: 24, height: 24 }} />
                        <span style={{ fontSize: 14, color: "var(--txtDim)" }}>Generating AI voice…</span>
                      </div>
                    )}

                    {audioUrl && !generatingAudio && (
                      <>
                        <audio
                          ref={audioRef}
                          src={audioUrl}
                          onEnded={() => setIsPlaying(false)}
                          onPause={() => setIsPlaying(false)}
                          onPlay={() => setIsPlaying(true)}
                        />

                        {/* Waveform */}
                        <div className={styles.waveform}>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <div
                              key={i}
                              className={`${styles.wavebar} ${isPlaying ? styles.active : ""}`}
                              style={{
                                height: isPlaying
                                  ? `${10 + Math.sin(i * 0.8) * 14 + Math.random() * 12}px`
                                  : "6px",
                              }}
                            />
                          ))}
                        </div>

                        <div className={styles.audioControls}>
                          <button className={styles.playBtn} onClick={handlePlayPause}>
                            {isPlaying ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                Pause
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                Play
                              </>
                            )}
                          </button>
                          {isPlaying && (
                            <button className={styles.secondaryBtn} onClick={handleStop}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                              Stop
                            </button>
                          )}
                          <button className={styles.secondaryBtn} onClick={handleRegenerateAudio} disabled={generatingAudio}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            New Voice
                          </button>
                        </div>

                        <div style={{ textAlign: "center", marginTop: 14 }}>
                          <a href={audioUrl} download={`narration_${documentId}.wav`} className={styles.downloadLink}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download Audio
                          </a>
                        </div>
                      </>
                    )}

                    {!audioUrl && !generatingAudio && (
                      <div style={{ textAlign: "center" }}>
                        <button className={styles.playBtn} onClick={handleRegenerateAudio}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                          Generate Voice
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "center", marginTop: 14 }}>
                    <button className={styles.secondaryBtn} onClick={handleGenerateNarration} disabled={generatingNarration}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      {generatingNarration ? "Regenerating…" : "Regenerate Narration & Voice"}
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
