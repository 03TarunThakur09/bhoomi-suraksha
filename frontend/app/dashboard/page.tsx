"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Document, type User } from "@/lib/api";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [userData, docData] = await Promise.all([
                api.getMe(),
                api.listDocuments(),
            ]);
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
        if (!api.isAuthenticated()) {
            router.push("/auth/login");
            return;
        }
        loadData();
    }, [router, loadData]);

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            await api.uploadDocument(file);
            await loadData();
        } catch (err: any) {
            alert(err.message || "Upload failed");
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
            await api.analyzeDocument(docId);
            await loadData();
            router.push(`/document/${docId}`);
        } catch (err: any) {
            alert(err.message || "Analysis failed");
        } finally {
            setAnalyzing(null);
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("Delete this document?")) return;
        try {
            await api.deleteDocument(docId);
            await loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleLogout = () => {
        api.logout();
        router.push("/");
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    return (
        <div className={styles.dashPage}>
            {/* Navbar */}
            <nav className="navbar">
                <Link href="/" className="navbar-brand">🛡️ <span>Bhoomi Suraksha</span></Link>
                <div className="navbar-links">
                    <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>👤 {user?.full_name}</span>
                    <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="container page-content">
                {/* Header */}
                <div className={styles.dashHeader}>
                    <div>
                        <h1>Dashboard</h1>
                        <p>Upload property documents, extract details with AI, and listen to audio narration</p>
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={`glass-card ${styles.statCard}`}>
                        <div className={styles.icon}>📄</div>
                        <div className={styles.value}>{documents.length}</div>
                        <div className={styles.label}>Documents</div>
                    </div>
                    <div className={`glass-card ${styles.statCard}`}>
                        <div className={styles.icon}>✅</div>
                        <div className={styles.value}>{documents.filter(d => d.status === "completed").length}</div>
                        <div className={styles.label}>Analyzed</div>
                    </div>
                    <div className={`glass-card ${styles.statCard}`}>
                        <div className={styles.icon}>⏳</div>
                        <div className={styles.value}>{documents.filter(d => d.status === "uploaded").length}</div>
                        <div className={styles.label}>Pending</div>
                    </div>
                </div>

                {/* Upload Area */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>📤 Upload Document</h2>
                    </div>
                    <div
                        className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("fileInput")?.click()}
                    >
                        <input id="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff" onChange={handleFileSelect} hidden />
                        {uploading ? (
                            <>
                                <div className="spinner" style={{ width: 40, height: 40, margin: "0 auto 16px" }} />
                                <h3>Uploading...</h3>
                            </>
                        ) : (
                            <>
                                <div className={styles.icon}>📁</div>
                                <h3>Drag & drop your property document here</h3>
                                <p>or click to browse &bull; PDF, JPEG, PNG, TIFF (max 20MB)</p>
                                <p style={{ marginTop: 8, fontSize: 13 }}>
                                    Supports: बैनामा, खसरा/खतौनी, रजिस्ट्री, भारमुक्त प्रमाण पत्र
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Documents Table */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>📋 Your Documents</h2>
                    </div>
                    {documents.length === 0 ? (
                        <div className={`glass-card ${styles.emptyState}`}>
                            <div className={styles.icon}>📄</div>
                            <h3>No documents yet</h3>
                            <p>Upload your first property document to get started</p>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            <table className={styles.docTable}>
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
                                            <td>
                                                <div className={styles.docName}>{doc.original_filename}</div>
                                            </td>
                                            <td>
                                                <span className={styles.docType}>{doc.document_type || "—"}</span>
                                            </td>
                                            <td>{formatSize(doc.file_size)}</td>
                                            <td>
                                                <span className={`status-pill ${doc.status}`}>{doc.status}</span>
                                            </td>
                                            <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className={styles.docActions}>
                                                    {doc.status === "uploaded" && (
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.verify}`}
                                                            onClick={() => handleAnalyze(doc.id)}
                                                            disabled={analyzing === doc.id}
                                                        >
                                                            {analyzing === doc.id ? "⏳ Analyzing..." : "🧠 Analyze"}
                                                        </button>
                                                    )}
                                                    {doc.status === "completed" && (
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.verify}`}
                                                            onClick={() => router.push(`/document/${doc.id}`)}
                                                        >
                                                            📋 View Details
                                                        </button>
                                                    )}
                                                    {doc.status === "failed" && (
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.verify}`}
                                                            onClick={() => handleAnalyze(doc.id)}
                                                            disabled={analyzing === doc.id}
                                                        >
                                                            🔄 Retry
                                                        </button>
                                                    )}
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.delete}`}
                                                        onClick={() => handleDelete(doc.id)}
                                                    >
                                                        🗑️
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
