"use client";
import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* Navbar */}
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          🛡️ <span>Bhoomi Suraksha</span>
        </Link>
        <div className="navbar-links">
          <Link href="/auth/login">Login</Link>
          <Link href="/auth/register" className="btn btn-primary">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg}></div>
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.heroTag}>🛡️ Aapki Zameen, Aapki Suraksha</div>
          <h1 className={styles.heroTitle}>
            Upload Property Documents, Get{" "}
            <span className="text-gradient">AI-Powered Insights</span> & Audio Narration
          </h1>
          <p className={styles.heroSubtitle}>
            Upload your Khatauni, Sale Deed, or any property document.
            Our AI extracts every detail — owners, khasra, area, mutations —
            and reads it all aloud to you in simple Hinglish.
          </p>
          <div className={styles.heroCta}>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Start Free Analysis
            </Link>
            <Link href="#how-it-works" className="btn btn-secondary btn-lg">
              How It Works
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>🤖</div>
              <div className={styles.statLabel}>Gemini AI Powered</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>📄</div>
              <div className={styles.statLabel}>Hindi + English OCR</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>🔊</div>
              <div className={styles.statLabel}>Audio Narration</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>⚡</div>
              <div className={styles.statLabel}>Results in Seconds</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.howSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>
            How <span className="text-gradient">Bhoomi Suraksha</span> Works
          </h2>
          <div className={styles.steps}>
            {[
              {
                icon: "📤",
                title: "Upload Document",
                desc: "Upload your Sale Deed, Khasra, Khatauni, Registry, or any property document (PDF, JPEG, PNG)",
              },
              {
                icon: "🧠",
                title: "AI Extracts Everything",
                desc: "Gemini AI reads your document — extracts owners, khasra numbers, plot area, mutations, court orders, and more",
              },
              {
                icon: "📋",
                title: "View Structured Details",
                desc: "See all extracted information beautifully organized — owners table, property address, land details, registration info",
              },
              {
                icon: "🔊",
                title: "Listen to AI Narration",
                desc: "AI generates a detailed narration explaining your document in simple Hinglish — play it with text-to-speech",
              },
            ].map((step, i) => (
              <div
                key={i}
                className={`glass-card ${styles.stepCard}`}
              >
                <div className={styles.stepIcon}>{step.icon}</div>
                <div className={styles.stepNum}>Step {i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className={styles.whySection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>
            Why <span className="text-gradient">Bhoomi Suraksha</span>?
          </h2>
          <div className={styles.whyGrid}>
            <div className={`glass-card ${styles.whyCard}`}>
              <div className={styles.whyIcon}>🏠</div>
              <h3>Understand Your Documents</h3>
              <p>
                Property documents in Hindi are hard to read and understand.
                Our AI breaks down every detail into simple, organized information
                that anyone can understand.
              </p>
            </div>
            <div className={`glass-card ${styles.whyCard}`}>
              <div className={styles.whyIcon}>🔊</div>
              <h3>Listen, Don&apos;t Read</h3>
              <p>
                Our AI generates a conversational narration about your document
                in Hinglish and reads it aloud. Perfect for people who prefer
                audio over reading dense legal text.
              </p>
            </div>
            <div className={`glass-card ${styles.whyCard}`}>
              <div className={styles.whyIcon}>⚡</div>
              <h3>Instant AI Analysis</h3>
              <p>
                No more waiting weeks for manual verification. Upload your document
                and get AI-powered entity extraction and audio narration in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Document Types */}
      <section className={styles.docSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>
            Documents We <span className="text-gradient">Analyze</span>
          </h2>
          <div className={styles.docGrid}>
            {[
              { name: "Sale Deed", hindi: "बैनामा / विक्रय पत्र" },
              { name: "Khasra / Khatauni", hindi: "खसरा / खतौनी" },
              { name: "Registry", hindi: "रजिस्ट्री" },
              { name: "Encumbrance Certificate", hindi: "भारमुक्त प्रमाण पत्र" },
              { name: "Power of Attorney", hindi: "मुख्तारनामा" },
              { name: "Mutation Records", hindi: "दाखिल खारिज" },
            ].map((doc, i) => (
              <div key={i} className={`glass-card ${styles.docCard}`}>
                <div className={styles.docName}>{doc.name}</div>
                <div className={styles.docHindi}>{doc.hindi}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div>
              <div className="navbar-brand" style={{ fontSize: 18 }}>
                🛡️ <span>Bhoomi Suraksha</span>
              </div>
              <p>Aapki Zameen, Aapki Suraksha</p>
            </div>
            <div className={styles.footerLinks}>
              <span>Delhi NCR &bull; Uttar Pradesh</span>
              <span>&copy; 2026 Bhoomi Suraksha</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
