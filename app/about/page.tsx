'use client';

import {
  Brain,
  Search,
  FileText,
  ShieldCheck,
  ArrowUpRight,
  Check,
  Bot,
  X,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { GithubLogo, XLogo } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import {
  ProAccordion,
  ProAccordionItem,
  ProAccordionTrigger,
  ProAccordionContent,
} from '@/components/ui/pro-accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGitHubStars } from '@/hooks/use-github-stars';
import { models } from '@/ai/providers';
import { VercelLogo } from '@/components/logos/vercel-logo';
import { ExaLogo } from '@/components/logos/exa-logo';
import { ElevenLabsLogo } from '@/components/logos/elevenlabs-logo';
import { motion } from 'motion/react';
import { TextLoop } from '@/components/core/text-loop';
import { TextShimmer } from '@/components/core/text-shimmer';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { PRICING } from '@/lib/constants';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AboutPage() {
  const router = useRouter();
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showCryptoAlert, setShowCryptoAlert] = useState(true);
  const { data: githubStars, isLoading: isLoadingStars } = useGitHubStars();

  // Motion variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem('hasAcceptedTerms');
    if (!hasAcceptedTerms) {
      setShowTermsDialog(true);
    }

    const hasDismissedCryptoAlert = localStorage.getItem('hasDismissedCryptoAlert');
    if (hasDismissedCryptoAlert) {
      setShowCryptoAlert(false);
    }
  }, []);

  const handleAcceptTerms = () => {
    if (acceptedTerms) {
      setShowTermsDialog(false);
      localStorage.setItem('hasAcceptedTerms', 'true');
    }
  };

  const handleDismissCryptoAlert = () => {
    setShowCryptoAlert(false);
    localStorage.setItem('hasDismissedCryptoAlert', 'true');
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('query')?.toString();
    if (query) {
      router.push(`/?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Crypto Disclaimer Alert */}
      {showCryptoAlert && (
        <div className="sticky top-0 z-50 border-b border-border bg-amber-50 dark:bg-amber-950/20">
          <Alert className="border-0 rounded-none bg-transparent">
            <AlertDescription className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Ola is not connected to any cryptocurrency tokens or coins. We are purely an AI search engine.
                </span>
              </div>
              <button
                onClick={handleDismissCryptoAlert}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Terms Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-background border border-border">
          <div className="p-6 border-b border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <FileText className="size-5" />
                Terms and Privacy
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2">
                Please review our Terms of Service and Privacy Policy before continuing.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[300px] overflow-y-auto">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Terms of Service
              </h3>
              <p className="text-xs text-muted-foreground">
                By using Ola, you agree to our Terms of Service which outline the rules for using our platform. This
                includes guidelines on acceptable use, intellectual property rights, and limitations of liability.
              </p>
              <Link href="/terms" className="text-xs text-primary hover:underline inline-flex items-center">
                Read full Terms of Service
                <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Privacy Policy
              </h3>
              <p className="text-xs text-muted-foreground">
                Our Privacy Policy describes how we collect, use, and protect your personal information.
              </p>
              <Link href="/privacy-policy" className="text-xs text-primary hover:underline inline-flex items-center">
                Read full Privacy Policy
                <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </div>
          </div>

          <div className="px-6 pt-1 pb-4">
            <div className="flex items-start space-x-3 p-3 rounded-md bg-accent/50 border border-border">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={() => setAcceptedTerms(!acceptedTerms)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2">
            <Button onClick={handleAcceptTerms} disabled={!acceptedTerms} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="container max-w-screen-xl mx-auto py-4 px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/ola.chat-logo-invert.png"
              alt="Ola"
              width={80}
              height={20}
              className="w-20 h-5 object-contain"
              quality={100}
            />
          </Link>

          <nav className="flex items-center gap-8">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Terms
            </Link>
            <Link
              href="/privacy-policy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Privacy
            </Link>
            <Link
              href="https://git.new/ola"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubLogo className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-40">
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div className="space-y-20 text-center" variants={container} initial="hidden" animate="show">
            {/* Logo & Brand */}
            <motion.div variants={item} className="space-y-8">
              <Link href="/" className="inline-flex items-center group">
                <div className="relative">
                  <Image
                    src="/ola.chat-logo-invert.png"
                    alt="Ola"
                    width={160}
                    height={40}
                    className="w-40 h-10 object-contain transition-all duration-300 group-hover:scale-110"
                    quality={100}
                  />
                </div>
              </Link>

              <h2 className="text-2xl md:text-3xl font-semibold text-foreground max-w-3xl mx-auto">
                Open Source AI-Powered Search Engine
              </h2>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                A clean, minimalistic search engine with RAG and search grounding capabilities. Get accurate, up-to-date
                answers from reliable sources.
              </p>
            </motion.div>

          {/* Search Interface */}
          <motion.div variants={item} className="space-y-8">
            <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  name="query"
                  placeholder="Ask anything..."
                  className="w-full h-14 px-6 pr-20 text-base rounded-lg bg-background border-2 border-border focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 h-10 px-5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
          </motion.div>

            {/* Social Proof */}
            <motion.div variants={item} className="space-y-12">
              {/* OpenAlternative Badge */}
              <div className="flex justify-center">
                <a
                  href="https://openalternative.co/scira?utm_source=openalternative&utm_medium=badge&utm_campaign=embed&utm_content=tool-scira"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-transform duration-300 hover:scale-110"
                >
                  <img
                    src="https://openalternative.co/scira/badge.svg?theme=dark&width=200&height=50"
                    width="200"
                    height="50"
                    alt="Scira badge"
                    loading="lazy"
                  />
                </a>
              </div>

              {/* Awards */}
              <div className="flex flex-wrap items-center justify-center gap-24">
                <div className="flex flex-col items-center space-y-4 group">
                  <div className="transition-transform duration-300 group-hover:scale-110">
                    <img
                      src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4d679063da73487739e0_No1prgold-caps-removebg-preview.png"
                      alt="Tiny Startups #1 Product"
                      className="size-24 object-contain"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <div className="font-medium text-sm">#1 Product of the Week</div>
                    <div className="text-xs text-muted-foreground">Tiny Startups</div>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-4 group">
                  <div className="transition-transform duration-300 group-hover:scale-110">
                    <img src="/Winner-Medal-Weekly.svg" alt="Peerlist #1 Project" className="size-24 object-contain" />
                  </div>
                  <div className="text-center space-y-1">
                    <div className="font-medium text-sm">#1 Project of the Week</div>
                    <div className="text-xs text-muted-foreground">Peerlist</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Search Simulation */}
      <section className="py-24 px-4 border-y border-border bg-accent/20">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">RAG & Search Grounding</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Ola combines RAG and search grounding to deliver accurate, up-to-date answers from reliable sources.
              </p>
            </div>

            <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-xs text-muted-foreground">Search Demo</div>
              </div>
              <div className="p-6 space-y-6">
                {/* Query */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent shrink-0"></div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Query</p>
                    <p className="font-medium">Explain quantum computing and its real-world applications</p>
                  </div>
                </div>

                {/* Processing */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Processing</p>
                      <TextLoop interval={1.5}>
                        <p className="text-sm font-medium">🔍 Retrieving relevant information...</p>
                        <p className="text-sm font-medium">📚 Processing search results...</p>
                        <p className="text-sm font-medium">🤖 Generating response...</p>
                        <p className="text-sm font-medium">✨ Enhancing with context...</p>
                      </TextLoop>
                    </div>
                    <div className="space-y-1.5">
                      <TextShimmer className="text-sm leading-relaxed font-medium">
                        Combining insights from multiple reliable sources...
                      </TextShimmer>
                    </div>
                  </div>
                </div>

                {/* Response */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Response</p>
                    <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
                      <p>
                        Quantum computing is a revolutionary technology that harnesses quantum mechanics to solve
                        complex problems traditional computers cannot handle efficiently...
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <div className="text-xs py-1 px-2 bg-accent rounded-md text-accent-foreground">
                          Nature Physics
                        </div>
                        <div className="text-xs py-1 px-2 bg-accent rounded-md text-accent-foreground">
                          IBM Research
                        </div>
                        <div className="text-xs py-1 px-2 bg-accent rounded-md text-accent-foreground">
                          MIT Technology Review
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Powered By Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-accent/10">
        <div className="container max-w-screen-2xl mx-auto !w-full">
          <motion.div
            className="max-w-6xl mx-auto space-y-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-6">
              <motion.h2
                className="text-4xl font-medium tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                Powered By Industry Leaders
              </motion.h2>
              <motion.p
                className="text-muted-foreground max-w-3xl mx-auto text-lg leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Built with cutting-edge technology from the world&apos;s most innovative companies
              </motion.p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              <motion.div
                className="group relative p-12 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col items-center justify-center gap-8 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[240px] overflow-hidden"
                whileHover={{ y: -4, scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                  <VercelLogo />
                </div>
                <div className="relative z-10 text-center space-y-2">
                  <h3 className="font-semibold text-lg">Vercel AI SDK</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Advanced AI framework powering intelligent responses
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="group relative p-12 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col items-center justify-center gap-8 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[240px] overflow-hidden"
                whileHover={{ y: -4, scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                  <ExaLogo />
                </div>
                <div className="relative z-10 text-center space-y-2">
                  <h3 className="font-semibold text-lg">Exa Search</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Real-time search grounding with reliable sources
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="group relative p-12 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col items-center justify-center gap-8 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[240px] overflow-hidden"
                whileHover={{ y: -4, scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 w-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                  <ElevenLabsLogo />
                </div>
                <div className="relative z-10 text-center space-y-2">
                  <h3 className="font-semibold text-lg">ElevenLabs Voice</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Natural voice synthesis with human-like quality
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-y border-border">
        <div className="container max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold">1M+</div>
              <p className="text-muted-foreground">Questions Answered</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">100K+</div>
              <p className="text-muted-foreground">Active Users</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {isLoadingStars ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${githubStars?.toLocaleString() || '9,000'}+`
                )}
              </div>
              <p className="text-muted-foreground">GitHub Stars</p>
            </div>
          </div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-4">Recognition & Awards</h2>
            <p className="text-muted-foreground">Recognized by leading platforms and communities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-4">
                <Image
                  src="https://cdn.prod.website-files.com/657b3d8ca1cab4015f06c850/680a4d679063da73487739e0_No1prgold-caps-removebg-preview.png"
                  alt="Tiny Startups #1 Product"
                  width={64}
                  height={64}
                  className="size-16 object-contain mx-auto"
                />
              </div>
              <h3 className="font-semibold mb-1">#1 Product of the Week</h3>
              <p className="text-sm text-muted-foreground">Tiny Startups</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-4">
                <Image
                  src="/Winner-Medal-Weekly.svg"
                  alt="Peerlist #1 Project"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain mx-auto"
                />
              </div>
              <h3 className="font-semibold mb-1">#1 Project of the Week</h3>
              <p className="text-sm text-muted-foreground">Peerlist</p>
            </div>
          </div>
        </div>
      </section>

      {/* Models Section */}
      <section className="py-24 px-4 bg-accent/10 border-y border-border">
        <div className="container mx-auto">
          <motion.div
            className="mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Powered By Advanced Models</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Each model is carefully selected for its unique strengths
              </p>
            </div>

            <div className="!max-w-4xl w-full mx-auto">
              <div className="bg-card rounded border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="!w-full">
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/20">
                        <TableHead className="w-[280px] py-3 px-6 font-medium text-foreground">Model</TableHead>
                        <TableHead className="py-3 px-6 font-medium text-foreground">Description</TableHead>
                        <TableHead className="w-[100px] py-3 px-6 font-medium text-foreground">Category</TableHead>
                        <TableHead className="w-[200px] py-3 px-6 font-medium text-foreground">Capabilities</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model: any) => (
                        <TableRow
                          key={model.value}
                          className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                        >
                          <TableCell className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-foreground">{model.label}</span>
                              <div className="flex gap-1">
                                {model.pro && (
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                    Pro
                                  </span>
                                )}
                                {model.experimental && (
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                    Exp
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-6">
                            <p className="text-sm text-muted-foreground">{model.description}</p>
                          </TableCell>
                          <TableCell className="py-3 px-6">
                            <span className="text-xs bg-accent px-2 py-1 rounded text-accent-foreground">
                              {model.category}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-6">
                            <div className="flex items-center gap-1 flex-wrap">
                              {model.vision && (
                                <span className="text-xs bg-accent px-2 py-1 rounded text-accent-foreground">
                                  Vision
                                </span>
                              )}
                              {model.reasoning && (
                                <span className="text-xs bg-accent px-2 py-1 rounded text-accent-foreground">
                                  Reasoning
                                </span>
                              )}
                              {model.pdf && (
                                <span className="text-xs bg-accent px-2 py-1 rounded text-accent-foreground">PDF</span>
                              )}
                              {!model.vision && !model.reasoning && !model.pdf && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-background to-accent/10">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            className="max-w-3xl mx-auto space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-medium tracking-tight">Built For Everyone</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Whether you need quick answers or in-depth research, Ola adapts to your needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <h3 className="font-medium">Students</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Research paper assistance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Complex topic explanations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Math problem solving</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <h3 className="font-medium">Researchers</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Academic paper analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Data interpretation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Literature review</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
              <motion.div
                className="group relative p-6 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
                whileHover={{ y: -2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-4">
                  <h3 className="font-medium">Professionals</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Market research</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Technical documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Data analysis</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built with modern AI technology to provide accurate and reliable search results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Advanced AI Models</h3>
              <p className="text-muted-foreground">
                Uses multiple state-of-the-art AI models to understand and answer complex questions accurately.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Search</h3>
              <p className="text-muted-foreground">
                Combines RAG and search grounding to retrieve up-to-date information from reliable sources.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Open Source</h3>
              <p className="text-muted-foreground">
                Fully open source and transparent. Contribute to development or self-host your own instance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-semibold mb-4">Built With Industry Leaders</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powered by cutting-edge technology from leading companies
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-6 flex justify-center">
                <VercelLogo />
              </div>
              <h3 className="text-lg font-semibold mb-2">Vercel AI SDK</h3>
              <p className="text-muted-foreground text-sm">Advanced AI framework powering intelligent responses</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-6 flex justify-center">
                <ExaLogo />
              </div>
              <h3 className="text-lg font-semibold mb-2">Exa Search</h3>
              <p className="text-muted-foreground text-sm">Real-time search grounding with reliable sources</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="mb-6 flex justify-center">
                <ElevenLabsLogo />
              </div>
              <h3 className="text-lg font-semibold mb-2">ElevenLabs Voice</h3>
              <p className="text-muted-foreground text-sm">Natural voice synthesis with human-like quality</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured on Vercel Section */}
      <section className="py-16 px-4 border-y border-border">
        <div className="container max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Featured on Vercel&apos;s Blog</h2>
              <p className="text-muted-foreground leading-relaxed">
                Recognized for our innovative use of AI technology and contribution to the developer community through
                the Vercel AI SDK.
              </p>
              <Link
                href="https://vercel.com/blog/ai-sdk-4-1"
                className="inline-flex items-center gap-2 font-medium text-primary hover:text-primary/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the Feature
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
              <Image src="/vercel-featured.png" alt="Featured on Vercel Blog" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Models Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-semibold mb-4">Available AI Models</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose from a variety of models, each optimized for different tasks
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="font-semibold">Model</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Capabilities</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model: any) => (
                    <TableRow key={model.value} className="border-b border-border/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{model.label}</span>
                          {model.pro && (
                            <Badge variant="secondary" className="text-xs">
                              Pro
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{model.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {model.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {model.vision && (
                            <Badge variant="outline" className="text-xs">
                              Vision
                            </Badge>
                          )}
                          {model.reasoning && (
                            <Badge variant="outline" className="text-xs">
                              Reasoning
                            </Badge>
                          )}
                          {model.pdf && (
                            <Badge variant="outline" className="text-xs">
                              PDF
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-medium mb-4 tracking-tight">Pricing</h2>
            <p className="text-muted-foreground/80 max-w-lg mx-auto">Simple, transparent pricing for everyone</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="bg-background/50 border border-border/50 rounded-xl p-8 hover:border-border/80 transition-colors">
              <div className="mb-8">
                <h3 className="text-xl font-medium mb-2">Free</h3>
                <p className="text-muted-foreground/70 mb-4">Get started with essential features</p>
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-light tracking-tight">$0</span>
                    <span className="text-muted-foreground/70 ml-2">/month</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-medium text-muted-foreground/60">₹0</span>
                    <span className="text-muted-foreground/60 ml-2 text-sm">/month</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">10 searches per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">5 extreme searches per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Basic AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Search history</span>
                </li>
              </ul>

              <Button
                variant="outline"
                className="w-full border-border/60 hover:border-border"
                onClick={() => router.push('/')}
              >
                Get Started
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-background border border-primary/30 rounded-xl p-8 relative hover:border-primary/50 transition-colors">
              <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-medium">Pro</h3>
                  <span className="text-xs font-medium text-primary/80 bg-primary/10 px-2.5 py-1 rounded-full">
                    Popular
                  </span>
                </div>
                <p className="text-muted-foreground/70 mb-4">Everything you need for serious work</p>
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-light tracking-tight">${PRICING.PRO_MONTHLY}</span>
                    <span className="text-muted-foreground/70 ml-2">/month</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-medium text-muted-foreground/60">₹{PRICING.PRO_MONTHLY_INR}</span>
                    <span className="text-muted-foreground/60 ml-2 text-sm">1 month access</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Unlimited searches</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">All AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">PDF document analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Priority support</span>
                </li>
              </ul>

              <Button className="w-full" onClick={() => router.push('/pricing')}>
                Upgrade to Pro
              </Button>
            </div>
          </div>

          {/* Student Discount */}
          <div className="max-w-2xl mx-auto bg-muted/20 border border-border/40 rounded-xl p-6 mt-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-5 w-5 text-primary/70" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Student Pricing</h3>
                <p className="text-muted-foreground/80 mb-4 text-sm">
                  Students can access Pro features for $5/month (₹500/month). Contact us with your student verification.
                </p>
                <a
                  href="mailto:zaid@scira.ai?subject=Student%20Discount%20Request"
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-border/60 bg-background hover:bg-accent/50 text-sm font-medium transition-colors"
                >
                  Apply for Student Pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Find answers to common questions about Scira</p>
          </div>

          <ProAccordion type="single" collapsible className="w-full">
            <ProAccordionItem value="item-1">
              <ProAccordionTrigger>What is Scira?</ProAccordionTrigger>
              <ProAccordionContent>
                Scira is an open-source AI-powered search engine that uses RAG (Retrieval-Augmented Generation) and
                search grounding to provide accurate, up-to-date answers from reliable sources.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-2">
              <ProAccordionTrigger>What&apos;s the difference between Free and Pro plans?</ProAccordionTrigger>
              <ProAccordionContent>
                The Free plan offers limited daily searches with basic AI models, while the Pro plan ($15/month)
                provides unlimited searches, access to all AI models, PDF document analysis, and priority support.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-3">
              <ProAccordionTrigger>Is there a student discount?</ProAccordionTrigger>
              <ProAccordionContent>
                Yes, students can get $10 off the Pro plan, bringing it down to $5/month. Email zaid@scira.ai with your
                student verification and a brief description of how you use Scira.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-4">
              <ProAccordionTrigger>Can I cancel my subscription anytime?</ProAccordionTrigger>
              <ProAccordionContent>
                Yes, you can cancel your Pro subscription at any time. Your benefits will continue until the end of your
                current billing period.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-5">
              <ProAccordionTrigger>What AI models does Scira use?</ProAccordionTrigger>
              <ProAccordionContent>
                Scira uses a range of advanced AI models including Grok, Claude, OpenAI GPT, Gemini, and more to provide
                the best possible answers for different types of queries.
              </ProAccordionContent>
            </ProAccordionItem>

            <ProAccordionItem value="item-6">
              <ProAccordionTrigger>How does Scira ensure information accuracy?</ProAccordionTrigger>
              <ProAccordionContent>
                Scira combines RAG technology with search grounding to retrieve information from reliable sources and
                verify it before providing answers. Each response includes source attribution for transparency.
              </ProAccordionContent>
            </ProAccordionItem>
          </ProAccordion>

          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              Have more questions?{' '}
              <a href="mailto:zaid@scira.ai" className="text-primary hover:text-primary/80 transition-colors">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image src="/ola.chat-logo-invert.png" alt="Ola" width={60} height={15} className="w-15 h-4 object-contain" />
              <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Ola. All rights reserved.</p>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link
                href="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="https://x.com/sciraai"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <XLogo className="h-4 w-4" />
                </Link>
                <Link
                  href="https://git.new/scira"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GithubLogo className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
