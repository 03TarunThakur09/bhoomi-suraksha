"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login(form.email, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authBody}>

        {/* ── Left branding panel ── */}
        <div className={styles.authLeft}>
          <Link href="/" className={styles.backLink}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            BACK TO HOME
          </Link>

          <div className={styles.leftEmblem}>॥</div>
          <div className={styles.leftBrand}>Bhoomi Suraksha</div>
          <div className={styles.leftHin}>भूमि सुरक्षा</div>
          <div className={styles.leftTagline}>अपनी ज़मीन, अपना हक़</div>

          <div className={styles.leftDivider} />

          <div className={styles.leftStats}>
            <div className={styles.leftStat}>
              <div className={styles.leftStatNum}>1.2M+</div>
              <div className={styles.leftStatLabel}>Documents Verified</div>
            </div>
            <div className={styles.leftStat}>
              <div className={styles.leftStatNum}>28</div>
              <div className={styles.leftStatLabel}>States Covered</div>
            </div>
            <div className={styles.leftStat}>
              <div className={styles.leftStatNum}>98%</div>
              <div className={styles.leftStatLabel}>OCR Accuracy</div>
            </div>
            <div className={styles.leftStat}>
              <div className={styles.leftStatNum}>₹0</div>
              <div className={styles.leftStatLabel}>Cost to Citizens</div>
            </div>
          </div>

          <div className={styles.leftBadges}>
            <div className={styles.leftBadge}>
              <div className={styles.leftBadgeIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--saffron)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              Recognised by MeitY, Govt. of India
            </div>
            <div className={styles.leftBadge}>
              <div className={styles.leftBadgeIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--saffron)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              256-bit SSL · Data never shared
            </div>
            <div className={styles.leftBadge}>
              <div className={styles.leftBadgeIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--saffron)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              ISO 27001 Certified Infrastructure
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className={styles.authRight}>
          <div className={styles.authCard}>

            <div className={styles.authLogo}>
              <div className={styles.brandMark} aria-hidden="true">
                <svg width="26" height="28" viewBox="0 0 22 24" fill="none">
                  <path d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
                    stroke="#2b1e05" strokeWidth="1.4" fill="url(#lg1)"/>
                  <path d="m9 12 2 2 4-4" stroke="#2b1e05" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="lg1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#F0C94A"/>
                      <stop offset="1" stopColor="#A67C10"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1>Welcome Back</h1>
              <span className={styles.hin}>पोर्टल में प्रवेश करें</span>
              <p>Sign in to access your land records</p>
            </div>

            <form className={styles.authForm} onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              {error && <p className={styles.errorText}>{error}</p>}

              <button className={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Signing in…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Sign In to Portal
                  </>
                )}
              </button>
            </form>

            <div className={styles.authSwitch}>
              Don&apos;t have an account?{" "}
              <Link href="/auth/register">Register here</Link>
            </div>

            <p className={styles.disclaimer}>
              By signing in you agree to our Terms of Service and Privacy Policy.<br />
              Your data is protected under the IT Act, 2000.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
