'use client';

import { useState } from 'react';
import { ArrowRight, Shield, Users, BarChart3, Lock, Globe, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const categories = [
  'Technology',
  'Personal Finance',
  'Health & Wellness',
  'Travel',
  'Food & Cooking',
  'Business',
  'Science',
  'Education',
];

export default function CreatorApplyPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    fullName: '',
    email: '',
    country: '',
    website: '',
    // Step 2: Expertise
    bio: '',
    primaryCategory: '',
    secondaryCategories: [] as string[],
    qualifications: '',
    yearsExperience: '',
    // Step 3: Agreement
    agreedToTerms: false,
    agreedToLicensing: false,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleMultiSelect = (field: 'secondaryCategories', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter((v: string) => v !== value),
    }));
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!formData.fullName.trim()) { setError('Full name is required'); return false; }
      if (!formData.email.trim() || !formData.email.includes('@')) { setError('Valid email is required'); return false; }
      if (!formData.country.trim()) { setError('Country is required'); return false; }
    }
    if (step === 2) {
      if (!formData.bio.trim() || formData.bio.length < 100) { setError('Bio must be at least 100 characters'); return false; }
      if (!formData.primaryCategory) { setError('Primary category is required'); return false; }
      if (!formData.qualifications.trim()) { setError('Qualifications are required'); return false; }
    }
    if (step === 3) {
      if (!formData.agreedToTerms) { setError('You must agree to the Terms of Service'); return false; }
      if (!formData.agreedToLicensing) { setError('You must agree to the Licensing Agreement'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Application failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Application failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Application Submitted!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for applying to join VeraLM as a creator. Our team will review your application 
            and get back to you within 3-5 business days.
          </p>
          <Button onClick={() => window.location.href = '/'} size="lg">
            Return Home
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Shared Navbar — preserves logged-in user session */}
      <Navbar activePage="creators" />

      {/* Progress Indicator */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  s < step ? 'bg-primary text-primary-foreground' :
                  s === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-muted text-muted-foreground'
                )}>
                  {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                </div>
                <span className={cn('text-xs mt-2 font-medium', s <= step ? 'text-foreground' : 'text-muted-foreground')}>
                  {['Basic Info', 'Expertise', 'Agreement'][s - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">Join VeraLM as a Creator</h1>
            <p className="text-lg text-muted-foreground">
              Share your expertise, help people find answers, and earn recurring revenue from your knowledge.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              {error}
            </div>
          )}

          <form className="bg-card border border-border rounded-xl p-8 space-y-8">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium mb-2">Country *</label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      placeholder="United States"
                    />
                  </div>
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium mb-2">Website / Portfolio (Optional)</label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder="https://janesmith.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={handleNext} size="lg">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Expertise */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Your Expertise</h2>
                
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium mb-2">
                    Bio * (minimum 100 characters)
                  </label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Describe your background, expertise, and what topics you're qualified to write about..."
                    rows={5}
                    className="min-h-[120px]"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.bio.length}/100 minimum characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Primary Category *</label>
                  <select
                    value={formData.primaryCategory}
                    onChange={(e) => handleChange('primaryCategory', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select primary category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {categories
                      .filter(c => c !== formData.primaryCategory)
                      .map((cat) => (
                        <label key={cat} className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.secondaryCategories.includes(cat)}
                            onChange={(e) => handleMultiSelect('secondaryCategories', cat, e.target.checked)}
                            className="rounded border-input"
                          />
                          <span className="text-sm">{cat}</span>
                        </label>
                      ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="qualifications" className="block text-sm font-medium mb-2">
                    Qualifications & Experience *
                  </label>
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => handleChange('qualifications', e.target.value)}
                    placeholder="Degrees, certifications, years of professional experience, notable publications, etc."
                    rows={4}
                  />
                </div>

                <div>
                  <label htmlFor="yearsExperience" className="block text-sm font-medium mb-2">Years of Experience</label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => handleChange('yearsExperience', e.target.value)}
                    placeholder="10"
                    min="0"
                    max="60"
                  />
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={handleBack} size="lg">
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                    Back
                  </Button>
                  <Button type="button" onClick={handleNext} size="lg">
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Agreement */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Agreements</h2>
                
                <div className="space-y-6">
                  <div className="p-4 border border-border rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.agreedToTerms}
                        onChange={(e) => handleChange('agreedToTerms', e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                      <div>
                        <p className="font-medium">I agree to the <a href="/terms" target="_blank" rel="noopener" className="text-primary hover:underline">Terms of Service</a> *</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Including platform usage rules, content standards, and dispute resolution.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.agreedToLicensing}
                        onChange={(e) => handleChange('agreedToLicensing', e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                      <div>
                        <p className="font-medium">I agree to the <a href="/licensing" target="_blank" rel="noopener" className="text-primary hover:underline">Creator Licensing Agreement</a> *</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Granting VeraLM exclusive AI search retrieval rights for my approved articles. 
                          I retain all other rights including publication, syndication, and adaptation.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Key Terms Summary */}
                <div className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-4">Key Terms Summary</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Rights Granted</dt>
                      <dd className="font-medium">Exclusive AI search retrieval only</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">You Retain</dt>
                      <dd className="font-medium">All publication, syndication, adaptation rights</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="font-medium">6-24 months per article, renewable</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Withdrawal</dt>
                      <dd className="font-medium">30 days notice, earned revenue paid</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Royalty Share</dt>
                      <dd className="font-medium">Up to 90% net revenue (after AI/server costs)</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Minimum Payout</dt>
                      <dd className="font-medium">$50 via Stripe Connect (global)</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={handleBack} size="lg">
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                    Back
                  </Button>
                  <Button type="button" onClick={handleSubmit} size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 VeraLM. <a href="/privacy" className="hover:underline">Privacy</a> • <a href="/terms" className="hover:underline">Terms</a> • <a href="/licensing" className="hover:underline">Licensing</a></p>
        </div>
      </footer>
    </div>
  );
}