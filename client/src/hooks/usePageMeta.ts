import { useEffect } from "react";

interface PageMeta {
  title: string;
  description?: string;
  /** Absolute path, e.g. "/pricing". Origin is filled in automatically. */
  canonicalPath?: string;
  /** Block search engines from indexing this page (e.g. dashboard/admin). */
  noindex?: boolean;
}

const BASE_TITLE = "AppraiseAI";

function upsertMeta(selector: string, attr: string, attrValue: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Tiny per-page SEO hook. No external dependency — just nudges
 * document.head on mount. SPAs default to sharing one title/description
 * across every route, which gives duplicate-content signals to crawlers;
 * this restores per-page targeting (state guides, pricing, deadlines, etc.)
 * without pulling in react-helmet.
 *
 * Call from page components: `usePageMeta({ title: "...", description: "..." })`.
 */
export function usePageMeta({ title, description, canonicalPath, noindex }: PageMeta) {
  useEffect(() => {
    const fullTitle = title.includes(BASE_TITLE) ? title : `${title} | ${BASE_TITLE}`;
    const prevTitle = document.title;
    document.title = fullTitle;

    if (description) {
      upsertMeta('meta[name="description"]', "name", "description", description);
      upsertMeta('meta[property="og:description"]', "property", "og:description", description);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    }

    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);

    if (canonicalPath) {
      const href = `${window.location.origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
      upsertLink("canonical", href);
      upsertMeta('meta[property="og:url"]', "property", "og:url", href);
    }

    // robots: noindex pages are user-specific (dashboard, admin) — don't
    // leak them into search. We only toggle the tag on; we never force
    // "index" because the site-wide default (robots.txt) already allows it.
    if (noindex) {
      upsertMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow");
    }

    return () => {
      document.title = prevTitle;
      if (noindex) {
        const el = document.head.querySelector('meta[name="robots"]');
        el?.parentElement?.removeChild(el);
      }
    };
  }, [title, description, canonicalPath, noindex]);
}
