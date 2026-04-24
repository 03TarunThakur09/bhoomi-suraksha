"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [dragover, setDragover] = useState(false);
  const router = useRouter();

  /* Nav shrink on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Reveal elements on scroll */
  useEffect(() => {
    const reveals = document.querySelectorAll(`.${styles.reveal}`);
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.in);
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Count-up animation for stats */
  useEffect(() => {
    const nums = document.querySelectorAll(
      `.${styles.statNum}`
    ) as NodeListOf<HTMLElement>;
    const countIo = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = parseFloat(el.dataset.target ?? "0");
          const suffix = el.dataset.suffix ?? "";
          const dec = parseInt(el.dataset.decimals ?? "0", 10);
          const dur = 1800;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / dur);
            const ease = 1 - Math.pow(1 - p, 3);
            const v = target * ease;
            const str = dec
              ? v.toFixed(dec)
              : Math.round(v).toLocaleString("en-IN");
            el.innerHTML = `${str}<span class="${styles.statSuffix}">${suffix}</span>`;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          countIo.unobserve(el);
        }),
      { threshold: 0.4 }
    );
    nums.forEach((el) => countIo.observe(el));
    return () => countIo.disconnect();
  }, []);

  const goRegister = () => router.push("/auth/register");

  return (
    <div className={styles.landing}>
      {/* ═══ NAV ═══════════════════════════════════════ */}
      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
              <path
                d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
                stroke="#2b1e05"
                strokeWidth="1.4"
                fill="url(#ng1)"
              />
              <defs>
                <linearGradient id="ng1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#F0C94A" />
                  <stop offset="1" stopColor="#A67C10" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>Bhoomi Suraksha</div>
            <div className={`${styles.brandHin} ${styles.devanagari}`}>
              भूमि सुरक्षा
            </div>
          </div>
        </div>

        <nav className={styles.navLinks}>
          <a href="#home">Home</a>
          <a href="#upload">Verify Land</a>
          <a href="#how">How It Works</a>
          <a href="#features">Features</a>
          <Link href="/auth/login">Login</Link>
        </nav>

        <Link
          href="/auth/register"
          className={`${styles.btn} ${styles.btnGold}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Verify Now
        </Link>
      </nav>

      {/* ═══ HERO ════════════════════════════════════════ */}
      <section className={styles.hero} id="home">
        <div className={styles.heroBg} />
        <div className={styles.heroVignette} />

        <div className={styles.heroInner}>
          {/* Left copy */}
          <div>
            <div className={`${styles.eyebrow} ${styles.reveal}`}>
              <span className={styles.eyebrowDot} />
              Land Security Platform · India
            </div>

            <h1 className={`${styles.heroTitle} ${styles.reveal}`}>
              Protect what&apos;s <em>yours.</em>
            </h1>

            <p className={`${styles.heroSub} ${styles.reveal}`}>
              Upload your land documents — get verified, structured legal data
              in seconds. Built for every khasra, every Utara, every acre of
              Indian soil.
            </p>
            <p
              className={`${styles.heroHin} ${styles.devanagari} ${styles.reveal}`}
            >
              अपनी जमीन की सुरक्षा अब आपके हाथ में
            </p>

            <div className={`${styles.heroCtas} ${styles.reveal}`}>
              <Link
                href="/auth/register"
                className={`${styles.btn} ${styles.btnGold}`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Document
              </Link>
              <a href="#how" className={`${styles.btn} ${styles.btnGhost}`}>
                See How It Works
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            <div className={`${styles.statChips} ${styles.reveal}`}>
              {(
                [
                  { val: "50K+", label: "Verified" },
                  { val: "98.7%", label: "Accurate" },
                  { val: "3 Sec", label: "Processing" },
                ] as const
              ).map(({ val, label }) => (
                <div key={label} className={styles.chip}>
                  <svg
                    className={styles.chipTick}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <b>{val}</b>&nbsp;{label}
                </div>
              ))}
            </div>
          </div>

          {/* Upload card */}
          <div
            className={`${styles.uploadCard} ${styles.reveal}`}
            id="upload"
          >
            <div className={styles.uploadCardHead}>
              <span className={styles.uploadCardTag}>Secure Upload</span>
              <div className={styles.uploadDots}>
                <span />
                <span />
                <span />
              </div>
            </div>

            <div
              className={`${styles.dropZone} ${dragover ? styles.dragover : ""}`}
              onClick={goRegister}
              onDragOver={(e) => {
                e.preventDefault();
                setDragover(true);
              }}
              onDragLeave={() => setDragover(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragover(false);
                goRegister();
              }}
            >
              {/* animated dashed border */}
              <svg
                className={styles.svgBorder}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <rect
                  className={styles.svgBorderRect}
                  x="0.5"
                  y="0.5"
                  width="99"
                  height="99"
                  rx="8"
                  ry="8"
                />
              </svg>

              <div className={styles.dropIcon}>
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#D4A017"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              </div>

              <div className={styles.dropTitle}>
                Drag &amp; Drop your Land Document
              </div>
              <div className={styles.dropSub}>
                Aadhaar-linked land records, 7/12 Utara, Khasra, Jamabandi,
                Sale Deeds — all supported.
              </div>

              <button
                className={styles.browseBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  goRegister();
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Sign Up to Verify
              </button>

              <div className={styles.fileTypes}>
                {["PDF", "JPG", "PNG", "TIFF"].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.scrollInd} aria-hidden="true">
          <span>Scroll</span>
          <span className={styles.scrollIndLine} />
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════ */}
      <section className={styles.how} id="how">
        <div className={styles.container}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <span className={styles.kicker}>Process</span>
            <h2>
              Three steps. <em>Three seconds.</em>
            </h2>
            <p>
              From a photograph of a paper Utara to a structured, shareable
              legal record — the heavy lifting is ours.
            </p>
          </div>

          <div className={styles.howGrid}>
            {(
              [
                {
                  num: "STEP 01",
                  title: "Upload your land paper",
                  desc: "PDF, scan, or a phone photograph of the original document — including handwritten and regional-script Utaras.",
                  icon: (
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D4A017"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  ),
                },
                {
                  num: "STEP 02",
                  title: "AI extracts & cross-verifies",
                  desc: "Our model reads the document, matches records against state registries, and flags encumbrances or mutation gaps.",
                  icon: (
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D4A017"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                  ),
                },
                {
                  num: "STEP 03",
                  title: "Structured legal report",
                  desc: "A clean, downloadable report with every field, stamped status, and auditable provenance for every claim.",
                  icon: (
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D4A017"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  ),
                },
              ] as const
            ).map(({ num, title, desc, icon }) => (
              <div key={num} className={`${styles.step} ${styles.reveal}`}>
                <span className={styles.stepNum}>{num}</span>
                <div className={styles.stepIcon}>{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ════════════════════════════════════ */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <span className={styles.kicker}>Capabilities</span>
            <h2>
              Every safeguard, <em>in one platform.</em>
            </h2>
            <p>
              Built with legal researchers and land-records officers to cover
              the edge cases that matter to Indian landowners.
            </p>
          </div>

          <div className={styles.featGrid}>
            {(
              [
                {
                  title: "AI Document Reading",
                  desc: "OCR tuned for Devanagari, handwritten revenue records, and faded government paper.",
                  icon: (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <path d="M7 14h3M7 17h6" />
                    </svg>
                  ),
                },
                {
                  title: "Encumbrance & Mutation",
                  desc: "Surfaces hidden loans, ownership disputes, and lapsed mutation entries before you transact.",
                  icon: (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  ),
                },
                {
                  title: "Instant Legal Report",
                  desc: "A signed, downloadable PDF — ready for banks, buyers, or district court filings in seconds.",
                  icon: (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="15" y2="17" />
                    </svg>
                  ),
                },
                {
                  title: "Bank-Grade Encryption",
                  desc: "256-bit AES at rest, TLS 1.3 in transit. Your documents are discarded after the verification window.",
                  icon: (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      <circle cx="12" cy="16" r="1" />
                    </svg>
                  ),
                },
              ] as const
            ).map(({ title, desc, icon }) => (
              <div key={title} className={`${styles.feat} ${styles.reveal}`}>
                <div className={styles.featIcon}>{icon}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST STATS ══════════════════════════════════ */}
      <section className={styles.stats}>
        <div className={styles.statsBg} />
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {(
              [
                {
                  target: 50000,
                  suffix: "+",
                  label: "Documents Verified",
                },
                {
                  target: 98.7,
                  suffix: "%",
                  decimals: 1,
                  label: "Accuracy",
                },
                { target: 3, suffix: "s", label: "Avg Processing" },
                { target: 28, suffix: "", label: "States Covered" },
              ] as const
            ).map(({ target, suffix, label, ...rest }) => (
              <div
                key={label}
                className={`${styles.statItem} ${styles.reveal}`}
              >
                <span
                  className={styles.statNum}
                  data-target={String(target)}
                  data-suffix={suffix}
                  {...("decimals" in rest
                    ? { "data-decimals": String(rest.decimals) }
                    : {})}
                >
                  0
                </span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ════════════════════════════════ */}
      <section className={styles.testimonials}>
        <div className={styles.container}>
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <span className={styles.kicker}>Voices from the ground</span>
            <h2>
              Trusted by farmers, <em>buyers and builders.</em>
            </h2>
          </div>

          <div className={styles.testiGrid}>
            {(
              [
                {
                  av: "R",
                  quote:
                    "I found a disputed mutation on my father's ancestral land within minutes. We settled the paperwork before the monsoon — something that took my uncle three years in the tehsil office.",
                  name: "Ramesh Patil",
                  role: "Farmer · Ratnagiri, Maharashtra",
                },
                {
                  av: "P",
                  quote:
                    "Before buying a 1-acre plot in Anantapur, I ran the seller's 7/12 through Bhoomi Suraksha. It flagged a bank encumbrance the agent had quietly left out. Saved me ₹14 lakh.",
                  name: "Priya Venkataraman",
                  role: "Home Buyer · Bengaluru",
                },
                {
                  av: "A",
                  quote:
                    "We run diligence on 40–60 parcels a week. The structured report replaces three junior associates doing the same thing by hand. It's the fastest tool in our stack.",
                  name: "Arjun Mehta",
                  role: "Partner · Mehta & Iyer Legal",
                },
              ] as const
            ).map(({ av, quote, name, role }) => (
              <div key={name} className={`${styles.testi} ${styles.reveal}`}>
                <div className={styles.quoteMark}>&ldquo;</div>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.testiQuote}>{quote}</p>
                <div className={styles.testiPerson}>
                  <div className={styles.avatar}>{av}</div>
                  <div>
                    <div className={styles.testiName}>{name}</div>
                    <div className={styles.testiRole}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA BAND ════════════════════════════════════ */}
      <section className={styles.ctaBand}>
        <div className={`${styles.container} ${styles.reveal}`}>
          <span className={styles.kicker}>Begin in 10 seconds</span>
          <h2>
            Your zameen. Your haq. <em>Your proof.</em>
          </h2>
          <p>
            Upload one document. Walk away with a verified legal report. No
            tehsil queues.
          </p>
          <Link
            href="/auth/register"
            className={`${styles.btn} ${styles.btnGold}`}
            style={{ fontSize: 15, padding: "14px 28px" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Verify My Land
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════ */}
      <footer className={styles.footer} id="contact">
        <div className={styles.container}>
          <div className={styles.footTop}>
            <div>
              <div className={styles.brand}>
                <div className={styles.brandMark} aria-hidden="true">
                  <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                    <path
                      d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
                      stroke="#2b1e05"
                      strokeWidth="1.4"
                      fill="url(#fg1)"
                    />
                    <defs>
                      <linearGradient id="fg1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#F0C94A" />
                        <stop offset="1" stopColor="#A67C10" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div>
                  <div className={styles.brandName}>Bhoomi Suraksha</div>
                  <div className={`${styles.brandHin} ${styles.devanagari}`}>
                    भूमि सुरक्षा
                  </div>
                </div>
              </div>
              <p className={styles.footBrandDesc}>
                Apni Zameen, Apna Haq. A modern, AI-assisted land verification
                platform built for every Indian landowner.
              </p>
            </div>

            <div className={styles.footCol}>
              <h5>Product</h5>
              <ul>
                <li>
                  <a href="#upload">Verify Land</a>
                </li>
                <li>
                  <a href="#how">How It Works</a>
                </li>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <Link href="/auth/register">Get Started</Link>
                </li>
              </ul>
            </div>

            <div className={styles.footCol}>
              <h5>Account</h5>
              <ul>
                <li>
                  <Link href="/auth/login">Login</Link>
                </li>
                <li>
                  <Link href="/auth/register">Register</Link>
                </li>
                <li>
                  <Link href="/dashboard">Dashboard</Link>
                </li>
              </ul>
            </div>

            <div className={styles.footCol}>
              <h5>Legal</h5>
              <ul>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
                <li>
                  <a href="#">Terms of Service</a>
                </li>
                <li>
                  <a href="#">Data Handling</a>
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.footBottom}>
            <div>© 2025 Bhoomi Suraksha — Securing India&apos;s Land Rights.</div>
            <div className={styles.footDisclaimer}>
              Not affiliated with any government body. For verification
              assistance only. All records displayed are illustrative.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
