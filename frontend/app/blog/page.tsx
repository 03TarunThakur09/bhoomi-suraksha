import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Blog & Resources | Bhoomi Suraksha — भूमि सुरक्षा",
  description: "Explainers, policy updates, and real cases — to help you understand what your land paper says.",
};

const CATEGORIES = ["All", "Explainers", "News & Policy", "Case Studies", "State-wise"];

export default function BlogPage() {
  const posts = getAllPosts();

  const featuredPost = posts[0] ?? null;
  const sidebarPosts = posts.slice(1, 4);
  const latestPosts  = posts.slice(1);

  function getCatBadge(tags: string[]) {
    const t = tags[0]?.toLowerCase() ?? "";
    if (t.includes("case") || t.includes("story")) return <span className={styles.badgeGreen}>CASE STUDY</span>;
    if (t.includes("news") || t.includes("policy") || t.includes("rule")) return <span className={styles.badgeNavy}>NEWS</span>;
    return <span className={styles.badgeSaffron}>EXPLAINER</span>;
  }

  return (
    <div className={styles.page}>

      {/* Tricolor */}
      <div className="tricolor"><div className="tc-s"/><div className="tc-w"/><div className="tc-g"/></div>

      {/* Nav */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <svg width="18" height="20" viewBox="0 0 22 24" fill="none">
            <path d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
              stroke="#2b1e05" strokeWidth="1.4" fill="url(#b1)"/>
            <path d="m9 12 2 2 4-4" stroke="#2b1e05" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="b1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#F0C94A"/><stop offset="1" stopColor="#A67C10"/>
              </linearGradient>
            </defs>
          </svg>
          Bhoomi Suraksha
        </Link>
        <nav className={styles.navLinks}>
          <Link href="/">Home</Link>
          <Link href="/#how">How It Works</Link>
          <Link href="/blog" className={styles.active}>Blog</Link>
          <Link href="/auth/login">Login</Link>
          <Link href="/auth/register">Verify Now</Link>
        </nav>
      </nav>

      {/* Page title bar */}
      <div className={styles.titleBar}>
        <div className={styles.eyebrow}>CITIZEN LAND PORTAL · KNOWLEDGE</div>
        <h1>Blog &amp; Resources</h1>
        <p>Explainers, policy updates, and real cases — to help you understand what your land paper says.</p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <span className={styles.filterLabel}>Filter:</span>
        {CATEGORIES.map((c, i) => (
          <button key={c} className={`${styles.filterChip} ${i === 0 ? styles.active : ""}`}>{c}</button>
        ))}
        <div className={styles.filterSpacer}/>
        <div className={styles.searchBox}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search articles…" readOnly/>
        </div>
      </div>

      <div className={styles.content}>

        {/* Featured */}
        {posts.length > 0 ? (
          <>
            <span className={styles.featuredLabel}>⎯⎯ FEATURED ⎯⎯</span>
            <div className={styles.featuredGrid}>

              {/* Main feature */}
              {featuredPost && (
                <Link href={`/blog/${featuredPost.slug}`} className={styles.featuredMain}>
                  <div className={styles.featuredImgPlaceholder}>
                    <span>[ ARTICLE HERO IMAGE ]</span>
                  </div>
                  <div className={styles.featuredMainBody}>
                    <div className={styles.featuredMainBadges}>
                      {getCatBadge(featuredPost.tags)}
                      <span className={styles.badgeWhite}>12 MIN READ</span>
                    </div>
                    <div className={styles.featuredMainTitle}>{featuredPost.title}</div>
                    <div className={styles.featuredMainDesc}>{featuredPost.description}</div>
                    <div className={styles.featuredMainAuthor}>
                      <div className={styles.authorAvatar}/>
                      <span className={styles.authorName}>
                        {featuredPost.author ?? "Bhoomi Suraksha"} · {new Date(featuredPost.date).toLocaleDateString("en-IN", {day:"numeric", month:"short", year:"numeric"})}
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Sidebar */}
              <div className={styles.featuredSidebar}>
                {sidebarPosts.length > 0 ? sidebarPosts.map(p => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className={styles.sideCard}>
                    <div className={styles.sideThumb}><span>[ THUMB ]</span></div>
                    {getCatBadge(p.tags)}
                    <div className={styles.sideCardTitle}>{p.title}</div>
                    <div className={styles.sideCardMeta}>
                      {new Date(p.date).toLocaleDateString("en-IN", {day:"numeric", month:"short", year:"numeric"})} · 6 min read
                    </div>
                  </Link>
                )) : (
                  [
                    {cat:<span className={styles.badgeSaffron}>EXPLAINER</span>, title:"What's a mutation entry?", date:"22 Apr 2026"},
                    {cat:<span className={styles.badgeNavy}>NEWS</span>,         title:"MH issues new mutation rules", date:"20 Apr 2026"},
                    {cat:<span className={styles.badgeGreen}>CASE STUDY</span>,  title:"Hidden EC saved buyer ₹14L", date:"18 Apr 2026"},
                  ].map((p,i) => (
                    <div key={i} className={styles.sideCard}>
                      <div className={styles.sideThumb}><span>[ THUMB ]</span></div>
                      {p.cat}
                      <div className={styles.sideCardTitle}>{p.title}</div>
                      <div className={styles.sideCardMeta}>{p.date} · 6 min read</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Latest grid */}
            <span className={styles.latestLabel}>⎯⎯ LATEST ARTICLES ⎯⎯</span>
            <div className={styles.grid}>
              {latestPosts.length > 0 ? latestPosts.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className={styles.card}>
                  <div className={styles.cardCover}><span>[ COVER ]</span></div>
                  <div className={styles.cardBody}>
                    {getCatBadge(p.tags)}
                    <div className={styles.cardTitle}>{p.title}</div>
                    <div className={styles.cardDesc}>{p.description}</div>
                    <div className={styles.cardMeta}>
                      {new Date(p.date).toLocaleDateString("en-IN", {day:"numeric", month:"short"})} · 5 min
                    </div>
                  </div>
                </Link>
              )) : (
                [
                  {cat:<span className={styles.badgeSaffron}>EXPLAINER</span>,  title:"Khasra vs. Khatauni",              desc:"Knowing the difference", date:"15 Apr"},
                  {cat:<span className={styles.badgeNavy}>NEWS</span>,           title:"TN Patta records online",           desc:"Tamil Nadu integration",  date:"12 Apr"},
                  {cat:<span className={styles.badgeGreen}>CASE STUDY</span>,   title:"Settling a 30-yr dispute",          desc:"A farmer's story",        date:"10 Apr"},
                  {cat:<span className={styles.badgeSaffron}>EXPLAINER</span>,  title:"Reading Devanagari Utaras",         desc:"Old script, new tools",   date:"08 Apr"},
                  {cat:<span className={styles.badgeNavy}>POLICY</span>,        title:"Court ruling on EC",                desc:"SC update on disputes",   date:"04 Apr"},
                  {cat:<span className={styles.badgeSaffron}>EXPLAINER</span>,  title:"5 red flags in a sale deed",        desc:"What buyers miss",        date:"02 Apr"},
                ].map((p,i) => (
                  <div key={i} className={styles.card}>
                    <div className={styles.cardCover}><span>[ COVER ]</span></div>
                    <div className={styles.cardBody}>
                      {p.cat}
                      <div className={styles.cardTitle}>{p.title}</div>
                      <div className={styles.cardDesc}>{p.desc}</div>
                      <div className={styles.cardMeta}>{p.date} · 5 min</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              {["‹ PREV","1","2","3","…","12","NEXT ›"].map((p,i) => (
                <button key={i} className={`${styles.pageBtn} ${p==="1" ? styles.active : ""}`}>{p}</button>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.empty}>कोई पोस्ट नहीं मिली।</div>
        )}
      </div>

      {/* Newsletter */}
      <div className={styles.newsletter}>
        <h3>Get land-record explainers in your inbox</h3>
        <p>Once a fortnight. No spam. Unsubscribe anytime.</p>
        <div className={styles.newsletterForm}>
          <input className={styles.newsletterInput} type="email" placeholder="your@email.com"/>
          <button className={styles.newsletterBtn}>Subscribe</button>
        </div>
      </div>
    </div>
  );
}
