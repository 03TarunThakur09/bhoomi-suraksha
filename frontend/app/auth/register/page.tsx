"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import styles from "../auth.module.css";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ full_name: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.register(form.email, form.password, form.full_name);
            await api.login(form.email, form.password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authPage}>
            <div className={`glass-card ${styles.authCard}`}>
                <div className={styles.authLogo}>
                    <div style={{ fontSize: 40 }}>🛡️</div>
                    <h1 className="text-gradient">Bhoomi Suraksha</h1>
                    <p>Create your account</p>
                </div>
                <form className={styles.authForm} onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="Enter your full name"
                            required
                            value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            className="input-field"
                            type="email"
                            placeholder="you@example.com"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            className="input-field"
                            type="password"
                            placeholder="Min 8 characters"
                            required
                            minLength={8}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner" /> Creating...
                            </>
                        ) : (
                            "🚀 Create Account"
                        )}
                    </button>
                </form>
                <div className={styles.authSwitch}>
                    Already have an account? <Link href="/auth/login">Login</Link>
                </div>
            </div>
        </div>
    );
}
