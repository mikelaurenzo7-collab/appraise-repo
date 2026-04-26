import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, Calendar, User, Tag, BookOpen, TrendingUp, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { blogPosts } from "@/data/blogPosts";

const categories = [
  { value: "all", label: "All Articles" },
  { value: "state-guide", label: "State Guides" },
  { value: "strategy", label: "Strategies" },
  { value: "case-study", label: "Case Studies" },
  { value: "tips", label: "Tips & Resources" },
];

export default function Blog() {
  usePageMeta({
    title: "Resources & Guides — Property Tax Appeal",
    description: "State-by-state guides, appeal strategies, case studies, and tips for reducing your property tax bill.",
    canonicalPath: "/blog",
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPost = blogPosts.find(p => p.featured);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0F172A] pt-28 pb-16 lg:pt-36 lg:pb-20">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-4">
              Resources & Guides
            </h1>
            <p className="text-white/70 text-lg">
              Expert strategies, state-specific guides, and real case studies to help you win your property tax appeal.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-12">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-semibold uppercase tracking-widest mb-4">
                  <TrendingUp size={12} />
                  Featured
                </div>
                <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-4">
                  {featuredPost.title}
                </h2>
                <p className="text-[#64748B] text-lg mb-6">
                  {featuredPost.excerpt}
                </p>
                <div className="flex flex-wrap gap-4 mb-6 text-sm text-[#64748B]">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(featuredPost.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {featuredPost.readTime} min read
                  </div>
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    {featuredPost.author}
                  </div>
                </div>
                <Link href={`/blog/${featuredPost.id}`} className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded font-semibold">
                  Read Article <ArrowRight size={16} />
                </Link>
              </div>
              <div className="bg-gradient-to-br from-[#7C3AED] to-[#0D9488] rounded-xl p-8 text-white">
                <BookOpen size={48} className="mb-4 opacity-80" />
                <p className="text-sm opacity-90">
                  {featuredPost.content.substring(0, 200)}...
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search & Filter */}
      <section className="py-12 border-t border-[#E2E8F0]">
        <div className="container">
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={20} />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? "bg-[#7C3AED] text-white"
                      : "bg-white text-[#0F172A] border border-[#E2E8F0] hover:border-[#7C3AED]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12">
        <div className="container">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="text-[#94A3B8] mx-auto mb-4" />
              <p className="text-[#64748B] text-lg">No articles found. Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => (
                <Link key={post.id} href={`/blog/${post.id}`}>
                  <div className="h-full p-6 rounded-xl bg-white border border-[#E2E8F0] hover:shadow-lg hover:border-[#7C3AED] transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={14} className="text-[#7C3AED]" />
                      <span className="text-xs font-semibold text-[#7C3AED] uppercase">
                        {categories.find(c => c.value === post.category)?.label}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#0F172A] mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-[#64748B] mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.readTime} min
                      </div>
                      <div>{new Date(post.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0F172A]">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Ready to Challenge Your Assessment?
          </h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Get your free AI appraisal and see how much you could save on property taxes.
          </p>
          <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded font-semibold">
            Get My Free Analysis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
