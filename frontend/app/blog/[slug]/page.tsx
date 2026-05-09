import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import type { Metadata } from "next";
import styles from "../blog.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Bhoomi Suraksha`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

function getCatBadge(tags: string[]) {
  const t = tags[0]?.toLowerCase() ?? "";
  if (t.includes("case") || t.includes("story")) return <span className={styles.badgeGreen}>CASE STUDY</span>;
  if (t.includes("news") || t.includes("policy") || t.includes("rule")) return <span className={styles.badgeNavy}>NEWS</span>;
  return <span className={styles.badgeSaffron}>EXPLAINER</span>;
}

function estimateReadTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const allPosts = getAllPosts();
  const related = allPosts.filter((p) => p.slug !== slug).slice(0, 3);
  const readTime = estimateReadTime(post.content);
  const authorInitial = (post.author ?? "B").charAt(0).toUpperCase();
  const formattedDate = new Date(post.date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className={styles.page}>

      {/* Tricolor */}
      <div className="tricolor"><div className="tc-s"/><div className="tc-w"/><div className="tc-g"/></div>

      {/* Nav */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <svg width="18" height="20" viewBox="0 0 22 24" fill="none">
            <path d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
              stroke="#2b1e05" strokeWidth="1.4" fill="url(#ab1)"/>
            <path d="m9 12 2 2 4-4" stroke="#2b1e05" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="ab1" x1="0" x2="0" y1="0" y2="1">
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

      {/* Article hero */}
      <div className={styles.articleHero}>

        {/* Breadcrumb */}
        <div className={styles.articleCrumb}>
          <Link href="/">Home</Link>
          <span>›</span>
          <Link href="/blog">Blog</Link>
          <span>›</span>
          <span style={{ color: "var(--ink-soft)" }}>{post.title.slice(0, 40)}{post.title.length > 40 ? "…" : ""}</span>
        </div>

        {/* Category + read time badges */}
        <div className={styles.articleHeroTop}>
          {getCatBadge(post.tags)}
          {post.tags.slice(1).map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          <span className={styles.articleMetaItem}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {readTime} min read
          </span>
        </div>

        {/* Title */}
        <h1 className={styles.articleHeroTitle}>{post.title}</h1>

        {/* Description */}
        {post.description && (
          <p className={styles.articleHeroDesc}>{post.description}</p>
        )}

        {/* Author + date */}
        <div className={styles.articleHeroMeta}>
          <div className={styles.articleAvatarWrap}>
            <div className={styles.articleAvatar}>{authorInitial}</div>
            <div>
              <div className={styles.articleAvatarName}>{post.author ?? "Bhoomi Suraksha"}</div>
              <div className={styles.articleAvatarRole}>Editorial Team</div>
            </div>
          </div>
          <span className={styles.metaDot}>·</span>
          <span className={styles.articleMetaItem}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Hero image placeholder */}
      <div className={styles.articleImgHero}>
        <span>[ Article Hero Image ]</span>
      </div>

      {/* Two-column layout */}
      <div className={styles.articleLayout}>

        {/* Main content */}
        <main className={styles.articleMain}>
          <Link href="/blog" className={styles.backToBlog}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Blog
          </Link>

          <div className={styles.mdx}>
            <MDXRemote source={post.content} />
          </div>

          {/* Tags */}
          <div className={styles.tags} style={{ marginTop: "2rem" }}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className={styles.articleBottomCta}>
            <div className={styles.articleBottomCtaText}>
              <h3>अपनी खतौनी AI से समझें</h3>
              <p>Upload करें और सेकंडों में पूरी जानकारी हिंदी में पाएं।</p>
            </div>
            <Link href="/dashboard" className={styles.articleBottomCtaBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              खतौनी अपलोड करें
            </Link>
          </div>
        </main>

        {/* Sidebar */}
        <aside className={styles.articleSidebar}>

          {/* Portal CTA widget */}
          <div className={styles.sideCtaWidget}>
            <div className={styles.sideCtaEmblem}>॥</div>
            <div className={styles.sideCtaTitle}>Verify Your Land</div>
            <span className={styles.sideCtaHin}>भूमि की जाँच करें</span>
            <p className={styles.sideCtaDesc}>
              Upload any land document — Khatauni, Patta, EC — and get an AI-powered plain-language summary in seconds.
            </p>
            <Link href="/dashboard" className={styles.sideCtaBtn}>Start Verification →</Link>
          </div>

          {/* Share widget */}
          <div className={styles.sideWidget}>
            <div className={styles.sideWidgetHead}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Article
            </div>
            <div className={styles.sideWidgetBody}>
              <div className={styles.shareRow}>
                <button className={styles.shareBtn}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
                  Twitter
                </button>
                <button className={styles.shareBtn}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                  LinkedIn
                </button>
              </div>
              <button className={styles.shareBtn} style={{ width: "100%", marginTop: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Copy Link
              </button>
            </div>
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <div className={styles.sideWidget}>
              <div className={styles.sideWidgetHead}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Related Articles
              </div>
              <div className={styles.sideWidgetBody} style={{ padding: "10px 14px" }}>
                {related.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className={styles.relatedPost}>
                    <div className={styles.relatedPostThumb}><span>img</span></div>
                    <div>
                      <div className={styles.relatedPostTitle}>{p.title}</div>
                      <div className={styles.relatedPostMeta}>
                        {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder related (when no posts) */}
          {related.length === 0 && (
            <div className={styles.sideWidget}>
              <div className={styles.sideWidgetHead}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Related Articles
              </div>
              <div className={styles.sideWidgetBody} style={{ padding: "10px 14px" }}>
                {[
                  { title: "Reading Devanagari Utaras", date: "8 Apr 2026" },
                  { title: "Khasra vs. Khatauni: Know the Difference", date: "15 Apr 2026" },
                  { title: "5 Red Flags in a Sale Deed", date: "2 Apr 2026" },
                ].map((p, i) => (
                  <div key={i} className={styles.relatedPost}>
                    <div className={styles.relatedPostThumb}><span>img</span></div>
                    <div>
                      <div className={styles.relatedPostTitle}>{p.title}</div>
                      <div className={styles.relatedPostMeta}>{p.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </aside>
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
