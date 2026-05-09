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
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <svg width="20" height="22" viewBox="0 0 22 24" fill="none">
            <path d="M11 1.5L20 4.2V11c0 6-4 10.2-9 11.3C6 21.2 2 17 2 11V4.2L11 1.5z"
              stroke="#2b1e05" strokeWidth="1.4" fill="url(#b2)"/>
            <path d="m9 12 2 2 4-4" stroke="#2b1e05" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="b2" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#F0C94A"/>
                <stop offset="1" stopColor="#A67C10"/>
              </linearGradient>
            </defs>
          </svg>
          <span>Bhoomi Suraksha</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/blog">← Blog</Link>
          <Link href="/auth/login">Login</Link>
        </div>
      </nav>

      <article className={styles.article}>
        <header className={styles.articleHeader}>
          <div className={styles.articleMeta}>
            <time>{new Date(post.date).toLocaleDateString("hi-IN", { year: "numeric", month: "long", day: "numeric" })}</time>
            <span className={styles.author}>{post.author}</span>
          </div>
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        </header>

        <div className={styles.mdx}>
          <MDXRemote source={post.content} />
        </div>

        <div className={styles.ctaBanner}>
          <div className={styles.ctaText}>
            <h3>अपनी खतौनी AI से समझें</h3>
            <p>Upload करें और सेकंडों में पूरी जानकारी हिंदी में पाएं।</p>
          </div>
          <Link href="/dashboard" className={styles.ctaBtn}>
            खतौनी अपलोड करें →
          </Link>
        </div>
      </article>
    </div>
  );
}
