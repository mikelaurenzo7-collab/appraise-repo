import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock, Tag, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getBlogPost } from "@/data/blogPosts";
import NotFound from "./NotFound";

interface BlogPostProps {
  id: string;
}

export default function BlogPost({ id }: BlogPostProps) {
  const post = getBlogPost(id);
  usePageMeta({
    title: post ? `${post.title}` : "Article Not Found",
    description: post?.excerpt,
    canonicalPath: post ? `/blog/${post.id}` : "/blog",
  });

  if (!post) return <NotFound />;

  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />
      <article className="container max-w-3xl pt-32 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#7C3AED] mb-6"
        >
          <ArrowLeft size={16} /> All articles
        </Link>

        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#7C3AED] mb-3">
          {post.category.replace("-", " ")}
        </span>
        <h1 className="font-display text-4xl lg:text-5xl font-bold text-[#0F172A] mb-4">
          {post.title}
        </h1>
        <p className="text-lg text-[#64748B] mb-6">{post.excerpt}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748B] pb-6 border-b border-[#E2E8F0] mb-8">
          <span className="inline-flex items-center gap-1.5">
            <User size={14} /> {post.author}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} /> {formattedDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} /> {post.readTime} min read
          </span>
        </div>

        <div className="prose prose-slate max-w-none text-[#0F172A] leading-relaxed">
          {post.content.split(/\n\n+/).map((para, i) => (
            <p key={i} className="mb-5">
              {para}
            </p>
          ))}
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-[#E2E8F0]">
            <Tag size={14} className="text-[#64748B]" />
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block text-xs px-2.5 py-1 rounded bg-white border border-[#E2E8F0] text-[#64748B]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 rounded-xl bg-white border border-[#E2E8F0]">
          <h2 className="font-display text-xl font-semibold text-[#0F172A] mb-2">
            Ready to appeal your property tax?
          </h2>
          <p className="text-[#64748B] mb-4">
            Get an instant AI appraisal and file your pro-se appeal with a
            60-day money-back guarantee.
          </p>
          <Link
            href="/get-started"
            className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded font-semibold"
          >
            Start my appeal
          </Link>
        </div>
      </article>
      <Footer />
    </div>
  );
}
