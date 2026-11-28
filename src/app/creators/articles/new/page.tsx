'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Tag,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { calculateReadingTime, sanitizeHttpUrl } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export default function NewArticlePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Clean, focused state
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (!res.ok || !Array.isArray(data?.categories)) {
          throw new Error(data?.error || 'Could not load categories.');
        }
        if (!cancelled) {
          setCategoriesList(data.categories);
          setCategoryId((prev) => prev || data.categories[0]?.id || '');
        }
      } catch (err: any) {
        if (!cancelled) {
          setCategoriesError(err?.message || 'Unable to load categories.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Update live word count & reading time
  useEffect(() => {
    const count = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(count);
    setReadingTime(calculateReadingTime(content));
  }, [content]);

  const addImage = () => {
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    const safe = sanitizeHttpUrl(trimmed);
    if (!safe) {
      setError('Image URL must start with https:// or http://');
      return;
    }
    setError(null);
    setImages((prev) => (prev.includes(safe) ? prev : [...prev, safe]));
    setImageUrl('');
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      setError('Article title is required');
      return false;
    }
    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters');
      return false;
    }
    if (!categoryId) {
      setError('Please select a category');
      return false;
    }
    if (!content.trim() || content.trim().length < 100) {
      setError('Please write at least 100 characters for your article');
      return false;
    }
    return true;
  };

  const submitPost = async (status: 'draft' | 'pending_review') => {
    if (status === 'pending_review' && !validate()) return;
    if (status === 'draft') {
      if (!title.trim() || title.trim().length < 3) {
        setError('Title (at least 3 characters) is required to save draft');
        return;
      }
      if (!categoryId) {
        setError('Please wait for categories to load or select a category');
        return;
      }
      if (!content.trim() || content.trim().length < 20) {
        setError('Please write at least 20 characters to save a draft');
        return;
      }
    }

    if (status === 'draft') setIsSaving(true);
    else setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Auto-extract clean excerpt from the post content
      const autoExcerpt = content
        .replace(/^[#*`>\s\n]+/, '')
        .slice(0, 180)
        .trim();

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          category_id: categoryId,
          content: content.trim(),
          content_format: 'markdown',
          excerpt: autoExcerpt || title.trim(),
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          images: images.map((url) => ({ source_url: url, caption: title, rights_cleared: true })),
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit article');
      }

      setSuccess(true);
      router.push(`/creators/articles/${data.article_id}?submitted=true`);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit article');
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/creators/articles"
              className="p-2 rounded-xl border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create Knowledge Article</h1>
              <p className="text-xs text-muted-foreground">
                Publish verified intelligence to train and ground the VeraLM AI Model.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving || isSubmitting}
              onClick={() => submitPost('draft')}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              disabled={isSaving || isSubmitting}
              onClick={() => submitPost('pending_review')}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Publish to AI Model
            </Button>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-3">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>Article published &amp; verified! Redirecting to knowledge preview…</span>
          </div>
        )}

        {/* Clean, Net Form Layout */}
        <div className="space-y-6">
          {/* 1. Article Title */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Article Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Optimising PostgreSQL for Sub-Millisecond Vector Search"
              className="text-lg font-semibold h-12"
              maxLength={200}
            />
          </div>

          {/* 2. Category & Keywords Row */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Category Dropdown */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <label
                htmlFor="categoryId"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4 text-primary" />
                Category *
              </label>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={categoriesList.length === 0}
                className="w-full h-11 rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
              >
                {categoriesList.length === 0 ? (
                  <option value="">{categoriesError || 'Loading categories...'}</option>
                ) : (
                  categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Keywords */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <label
                htmlFor="tags"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"
              >
                <Tag className="h-4 w-4 text-primary" />
                Keywords / Tags
              </label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. PostgreSQL, HNSW, AI, pgvector"
                className="h-11"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Comma-separated keywords to help the AI model index your topic.
              </p>
            </div>
          </div>

          {/* 3. Attached Images */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <label
              htmlFor="imageUrl"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"
            >
              <ImageIcon className="h-4 w-4 text-primary" />
              Attached Images (Optional)
            </label>
            <div className="flex gap-2">
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addImage();
                  }
                }}
                placeholder="Paste an image URL (e.g. https://.../chart.png)"
                className="h-10"
              />
              <Button type="button" variant="outline" size="sm" onClick={addImage} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Image Preview List */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
                {images.map((url, idx) => (
                  <div key={url} className="relative group rounded-xl overflow-hidden border border-border bg-muted/40 w-24 h-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Attachment ${idx + 1}`}
                      onError={(e) => {
                        e.currentTarget.style.opacity = '0.25';
                      }}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      aria-label={`Remove attachment ${idx + 1}`}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-black/75 text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Article Post (Content) */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label
                htmlFor="content"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4 text-primary" />
                Article Post * (Markdown Supported)
              </label>
              <div className="text-xs font-medium text-muted-foreground">
                <span>{wordCount} words</span>
                <span className="mx-2">&bull;</span>
                <span>~{readingTime} min read</span>
              </div>
            </div>

            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write or paste your article content here in Markdown... Use ## headings, bullet points, and code blocks."
              rows={22}
              className="font-mono text-sm leading-relaxed p-4 bg-background resize-y"
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 flex-wrap gap-2">
              <span>Supports Markdown headings, lists, quotes, and code blocks.</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Auto-indexed into the VeraLM AI Model
              </span>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
            <p className="text-xs text-muted-foreground">
              By publishing, you agree to license this content for VeraLM AI model inference and royalty attribution.
            </p>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving || isSubmitting}
                onClick={() => submitPost('draft')}
              >
                Save Draft
              </Button>
              <Button
                size="sm"
                disabled={isSaving || isSubmitting}
                onClick={() => submitPost('pending_review')}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Publish to AI Model
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
