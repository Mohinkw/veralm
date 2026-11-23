'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Loader2, Sparkles, FileText, Image, Tag, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn, calculateReadingTime, slugify } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const categories = [
  { id: '1', name: 'Technology' },
  { id: '2', name: 'Personal Finance' },
  { id: '3', name: 'Health & Wellness' },
  { id: '4', name: 'Travel' },
  { id: '5', name: 'Food & Cooking' },
  { id: '6', name: 'Business' },
  { id: '7', name: 'Science' },
  { id: '8', name: 'Education' },
];

export default function NewArticlePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    content_format: 'markdown' as 'markdown' | 'html' | 'richtext',
    excerpt: '',
    category_id: '',
    tags: '' as string,
    author_notes: '',
    target_audience: '',
    references: [] as Array<{title: string, url: string, publisher: string, accessed_date: string, is_primary: boolean}>,
    images: [] as Array<{caption: string, rights_cleared: boolean, source_url: string}>,
    source_links: [] as Array<{title: string, url: string}>,
    original_created_at: '',
  });

  // Update word count and reading time
  useEffect(() => {
    const count = formData.content.split(/\s+/).filter((w: string) => w.length > 0).length;
    setWordCount(count);
    setReadingTime(calculateReadingTime(formData.content));
  }, [formData.content]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleArrayChange = (field: 'references' | 'images' | 'source_links', index: number, itemField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).map((item: any, i: number) => 
        i === index ? { ...item, [itemField]: value } : item
      ),
    }));
  };

  const addArrayItem = (field: 'references' | 'images' | 'source_links', defaultItem: any) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], defaultItem] }));
  };

  const removeArrayItem = (field: 'references' | 'images' | 'source_links', index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      [field]: (prev[field] as any[]).filter((_: any, i: number) => i !== index) 
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) { setError('Title is required'); return false; }
    if (formData.title.length < 10) { setError('Title must be at least 10 characters'); return false; }
    if (formData.title.length > 200) { setError('Title must be less than 200 characters'); return false; }
    
    if (!formData.content.trim()) { setError('Content is required'); return false; }
    if (formData.content.length < 500) { setError('Content must be at least 500 words (current: ~' + wordCount + ')'); return false; }
    
    if (!formData.category_id) { setError('Category is required'); return false; }
    
    if (!formData.excerpt.trim()) { setError('Excerpt is required'); return false; }
    if (formData.excerpt.length > 200) { setError('Excerpt must be less than 200 characters'); return false; }

    if (!formData.tags.trim()) { setError('At least one tag is required'); return false; }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) { setError('Title is required to save draft'); return; }
    
    setIsSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          status: 'draft',
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save draft');
      }

      setSuccess(true);
      setTimeout(() => router.push(`/creators/articles/${data.article_id}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          status: 'pending_review',
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit article');
      }

      router.push(`/creators/articles/${data.article_id}?submitted=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/creators/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <a href="/creators/dashboard" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>VeraLM</span>
            </a>
            <span className="text-muted-foreground px-2">/</span>
            <span className="font-medium">New Article</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground">Search</a>
            <a href="/creators/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">Dashboard</a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Write New Article</h1>
            <p className="text-muted-foreground">
              Create an in-depth article for the VeraLM knowledge vault. 
              Articles go through quality verification before being approved for AI search.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-100 border border-green-200 text-green-800 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div>Draft saved successfully! Redirecting...</div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="mb-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{wordCount} words</span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span>{readingTime} min read</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>{formData.tags.split(',').filter(t => t.trim()).length} tags</span>
            </div>
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span>{formData.images.length} images</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{formData.references.length} references</span>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-8">
            {/* Title & Excerpt */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Title & Summary
              </h2>

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">Title *</label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter a clear, descriptive title (10-200 characters)"
                  maxLength={200}
                />
                <p className="text-sm text-muted-foreground mt-1">{formData.title.length}/200</p>
              </div>

              <div>
                <label htmlFor="excerpt" className="block text-sm font-medium mb-2">Excerpt * (max 200 characters)</label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleChange('excerpt', e.target.value)}
                  placeholder="A brief summary shown in search results. This is the only part of your article publicly visible."
                  rows={3}
                  maxLength={200}
                />
                <p className="text-sm text-muted-foreground mt-1">{formData.excerpt.length}/200</p>
              </div>
            </div>

            {/* Category & Tags */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Category & Tags
              </h2>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags * (comma-separated, at least one)</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="e.g., budget cameras, video, 2026, mirrorless, sony"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use specific, searchable tags. These help users find your article.
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Article Content
              </h2>

              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium">Content Format</label>
                <div className="flex gap-2">
                  {['markdown', 'html', 'richtext'].map((fmt) => (
                    <label key={fmt} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="content_format"
                        value={fmt}
                        checked={formData.content_format === fmt}
                        onChange={(e) => handleChange('content_format', e.target.value)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm capitalize">{fmt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Textarea
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Write your article here. Minimum 500 words. Use Markdown formatting for best results."
                rows={30}
                className="font-mono text-sm"
              />

              <div className="text-sm text-muted-foreground">
                <p><strong>Tip:</strong> Structure your content with clear headings (## Heading), bullet points, and short paragraphs for better AI retrieval.</p>
                <p className="mt-1"><strong>Minimum:</strong> 500 words | <strong>Recommended:</strong> 1,500-3,000 words for comprehensive coverage</p>
              </div>
            </div>

            {/* Additional Metadata */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Additional Details (Optional)
              </h2>

              <div>
                <label htmlFor="author_notes" className="block text-sm font-medium mb-2">Author Notes</label>
                <Textarea
                  id="author_notes"
                  value={formData.author_notes}
                  onChange={(e) => handleChange('author_notes', e.target.value)}
                  placeholder="Internal notes for reviewers (not published)"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="target_audience" className="block text-sm font-medium mb-2">Target Audience</label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={(e) => handleChange('target_audience', e.target.value)}
                  placeholder="e.g., Beginner photographers, Senior developers, General audience"
                />
              </div>

              <div>
                <label htmlFor="original_created_at" className="block text-sm font-medium mb-2">Original Publication Date (if previously published)</label>
                <Input
                  id="original_created_at"
                  type="date"
                  value={formData.original_created_at}
                  onChange={(e) => handleChange('original_created_at', e.target.value)}
                />
              </div>
            </div>

            {/* References */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  References & Sources
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('references', {
                  title: '', url: '', publisher: '', accessed_date: '', is_primary: false
                })}>
                  Add Reference
                </Button>
              </div>

              {formData.references.length === 0 ? (
                <p className="text-sm text-muted-foreground">No references added. Add credible sources to improve your article's quality score.</p>
              ) : (
                <div className="space-y-4">
                  {formData.references.map((ref, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Reference #{index + 1}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('references', index)}>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Title *</label>
                          <Input
                            value={ref.title}
                            onChange={(e) => handleArrayChange('references', index, 'title', e.target.value)}
                            placeholder="Source title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">URL *</label>
                          <Input
                            type="url"
                            value={ref.url}
                            onChange={(e) => handleArrayChange('references', index, 'url', e.target.value)}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Publisher</label>
                          <Input
                            value={ref.publisher}
                            onChange={(e) => handleArrayChange('references', index, 'publisher', e.target.value)}
                            placeholder="Publisher name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Accessed Date</label>
                          <Input
                            type="date"
                            value={ref.accessed_date}
                            onChange={(e) => handleArrayChange('references', index, 'accessed_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ref.is_primary}
                            onChange={(e) => handleArrayChange('references', index, 'is_primary', e.target.checked)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm">Primary source</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Images
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('images', {
                  caption: '', rights_cleared: false, source_url: ''
                })}>
                  Add Image
                </Button>
              </div>

              {formData.images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No images added. Images must have rights cleared for AI search use.</p>
              ) : (
                <div className="space-y-4">
                  {formData.images.map((img, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Image #{index + 1}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('images', index)}>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Caption *</label>
                          <Input
                            value={img.caption}
                            onChange={(e) => handleArrayChange('images', index, 'caption', e.target.value)}
                            placeholder="Descriptive caption"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Source URL</label>
                          <Input
                            type="url"
                            value={img.source_url}
                            onChange={(e) => handleArrayChange('images', index, 'source_url', e.target.value)}
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={img.rights_cleared}
                            onChange={(e) => handleArrayChange('images', index, 'rights_cleared', e.target.checked)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm">I have cleared rights for AI search use *</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Source Links */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Additional Source Links
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('source_links', {
                  title: '', url: ''
                })}>
                  Add Link
                </Button>
              </div>

              {formData.source_links.length > 0 && (
                <div className="space-y-3">
                  {formData.source_links.map((link, index) => (
                    <div key={index} className="flex gap-3">
                      <Input
                        value={link.title}
                        onChange={(e) => handleArrayChange('source_links', index, 'title', e.target.value)}
                        placeholder="Link title"
                        className="w-1/3"
                      />
                      <Input
                        type="url"
                        value={link.url}
                        onChange={(e) => handleArrayChange('source_links', index, 'url', e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem('source_links', index)}>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-card border border-border rounded-xl p-6 sticky bottom-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleSaveDraft}
                    disabled={isSaving || isSubmitting}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSaving || isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Submit for Review
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center sm:text-right">
                  By submitting, you confirm this content is original and you agree to the 
                  <a href="/licensing" target="_blank" rel="noopener" className="text-primary hover:underline">Licensing Agreement</a>.
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}