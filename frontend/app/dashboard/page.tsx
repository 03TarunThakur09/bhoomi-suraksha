"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Document, type User } from "@/lib/api";
import styles from "./dashboard.module.css";

const ENGINE_OPTIONS = [
  { id: "gemini", label: "Gemini Vision",  desc: "Google AI · Free tier" },
  { id: "paddle", label: "PaddleOCR",      desc: "Open source · Hindi model" },
  { id: "indic",  label: "IndicOCR",       desc: "AI4Bharat · Hindi + English" },
] as const;

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "completed"  ? styles.pillCompleted  :
    status === "processing" ? styles.pillProcessing :
    status === "failed"     ? styles.pillFailed     :
                              styles.pillUploaded;
  return <span className={`${styles.pill} ${cls}`}>{status}</span>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]           = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [ocrEngine, setOcrEngine] = useState("gemini");

  const loadData = useCallback(async () => {
    try {
      const [userData, docData] = await Promise.all([api.getMe(), api.listDocuments()]);
      setUser(userData);
      setDocuments(docData.documents);
    } catch {
      api.logout();
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!api.isAuthenticated()) { router.push("/auth/login"); return; }
    loadData();
  }, [router, loadData]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await api.uploadDocument(file);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleAnalyze = async (docId: string) => {
    setAnalyzing(docId);
    try {
      await api.analyzeDocument(docId, ocrEngine);
      await loadData();
      router.push(`/document/${docId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.deleteDocument(docId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleLogout = () => { api.logout(); router.push("/"); };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <span>Loading your documents…</span>
      </div>
    );
  }

  const completed = documents.filter(d => d.status === "completed").length;
  const pending   = documents.filter(d => d.status === "uploaded").length;

  return (
    <div className={styles.page}>
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            <svg width="20" height="22" viewBox="0 0 22 24" fill="none">
              <path d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
                stroke="#2b1e05" strokeWidth="1.4" fill="url(#db1)"/>
              <path d="m9 12 2 2 4-4" stroke="#2b1e05" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="db1" x1="0" x2="0" y1="0" y2="1">
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
          <div className={styles.navUser}>
            <div className={styles.navUserAvatar}>
              {user?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            {user?.full_name}
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────── */}
      <div className={styles.content}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <h1>Dashboard</h1>
          <p>Upload property documents, extract details with AI, and listen to audio narration</p>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          {[
            {
              label: "Total Documents", value: documents.length,
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
            },
            {
              label: "Analyzed", value: completed,
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
            },
            {
              label: "Pending Analysis", value: pending,
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
            },
          ].map(({ label, value, icon }) => (
            <div key={label} className={styles.statCard}>
              <div className={styles.statIconWrap}>{icon}</div>
              <div>
                <div className={styles.statValue}>{value}</div>
                <div className={styles.statLabel}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Document
          </div>
          <input id="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={handleFileSelect} hidden />
          <div
            className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <svg className={styles.svgBorder} viewBox="0 0 100 100" preserveAspectRatio="none">
              <rect className={styles.svgBorderRect} x="0.5" y="0.5" width="99" height="99" rx="8" ry="8"/>
            </svg>
            {uploading ? (
              <>
                <div className={styles.uploadSpinner} />
                <h3>Uploading…</h3>
                <p>Please wait while your document is being uploaded</p>
              </>
            ) : (
              <>
                <div className={styles.uploadIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h3>Drag &amp; drop your property document</h3>
                <p>or click to browse · PDF, JPEG, PNG, TIFF (max 20 MB)</p>
                <p className={styles.uploadHint}>बैनामा · खसरा / खतौनी · रजिस्ट्री · भारमुक्त प्रमाण पत्र</p>
                <div className={styles.fileTypeBadges}>
                  {["PDF", "JPG", "PNG", "TIFF"].map(t => (
                    <span key={t} className={styles.fileTypeBadge}>{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* OCR Engine */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            OCR Engine
          </div>
          <div className={styles.engineGrid}>
            {ENGINE_OPTIONS.map((e) => (
              <button
                key={e.id}
                className={`${styles.engineBtn} ${ocrEngine === e.id ? styles.selected : ""}`}
                onClick={() => setOcrEngine(e.id)}
              >
                <span className={styles.engineLabel}>{e.label}</span>
                <span className={styles.engineDesc}>{e.desc}</span>
              </button>
            ))}
          </div>
          <p className={styles.engineNote}>
            Selected: <strong>{ENGINE_OPTIONS.find(e => e.id === ocrEngine)?.label}</strong> — used when you click Analyze
          </p>
        </div>

        {/* Documents */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Your Documents
          </div>

          {documents.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <h3>No documents yet</h3>
              <p>Upload your first property document to get started</p>
            </div>
          ) : (
            <div className={styles.card}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td><span className={styles.docFilename}>{doc.original_filename}</span></td>
                      <td><span className={styles.docType}>{doc.document_type || "—"}</span></td>
                      <td>{formatSize(doc.file_size)}</td>
                      <td><StatusPill status={doc.status} /></td>
                      <td>{new Date(doc.created_at).toLocaleDateString("en-IN")}</td>
                      <td>
                        <div className={styles.actions}>
                          {doc.status === "uploaded" && (
                            <button
                              className={`${styles.actionBtn} ${styles.actionPrimary}`}
                              onClick={() => handleAnalyze(doc.id)}
                              disabled={analyzing === doc.id}
                            >
                              {analyzing === doc.id ? (
                                <>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 0.7s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                  Analyzing…
                                </>
                              ) : "Analyze"}
                            </button>
                          )}
                          {doc.status === "completed" && (
                            <button
                              className={`${styles.actionBtn} ${styles.actionPrimary}`}
                              onClick={() => router.push(`/document/${doc.id}`)}
                            >
                              View Details
                            </button>
                          )}
                          {doc.status === "failed" && (
                            <button
                              className={`${styles.actionBtn} ${styles.actionPrimary}`}
                              onClick={() => handleAnalyze(doc.id)}
                              disabled={analyzing === doc.id}
                            >
                              Retry
                            </button>
                          )}
                          <button
                            className={`${styles.actionBtn} ${styles.actionDelete}`}
                            onClick={() => handleDelete(doc.id)}
                            title="Delete"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
