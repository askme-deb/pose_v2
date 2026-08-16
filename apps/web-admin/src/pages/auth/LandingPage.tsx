import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Moon,
  Sun,
  ArrowRight,
  Zap,
  ShieldCheck,
  Printer,
  FileCheck2,
  Warehouse,
  Users,
  Smartphone,
  ShoppingBasket,
  Utensils,
  Pill,
  Tv,
  Check,
  ChevronDown,
} from 'lucide-react';
import { GlassCard } from '@pospe/ui-library';
import logo from '../../assets/logo.svg';
import { useThemeStore } from '../../store/useThemeStore';

interface Feature {
  icon: typeof Zap;
  color: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    color: 'blue',
    title: 'Offline-First POS Engine',
    description:
      'Keep billing even when internet fails. Instant SQLite local storage automatically synchronizes with PostgreSQL cloud servers when connectivity is restored.',
  },
  {
    icon: Printer,
    color: 'purple',
    title: 'POS Hardware Integration',
    description:
      'Plug-and-play compatibility with Android POS machines (Sunmi, PAX, Verifone), thermal printers (80mm/58mm), barcode scanners, and weighing scales.',
  },
  {
    icon: FileCheck2,
    color: 'emerald',
    title: 'Automated GST Compliance',
    description:
      'Instant HSN code registry, CGST/SGST/IGST calculation, GSTR-1, GSTR-2B, and GSTR-3B report generation with 1-click JSON export.',
  },
  {
    icon: Warehouse,
    color: 'cyan',
    title: 'Multi-Store & Warehouse Racks',
    description:
      'Control unlimited store branches, manage inter-warehouse stock transfers, track rack locations, batch numbers, and expiry dates.',
  },
  {
    icon: Users,
    color: 'amber',
    title: 'Customer CRM & Loyalty',
    description:
      'Track customer purchase history, manage loyalty points, issue store wallet balances, and dispatch automated WhatsApp birthday offers.',
  },
  {
    icon: Smartphone,
    color: 'indigo',
    title: 'Native Mobile Apps Suite',
    description:
      'Dedicated mobile apps for Business Owner monitoring, Cashier checkout, Store Manager stock tracking, and Delivery agent management.',
  },
];

const featureIconClasses: Record<string, string> = {
  blue: 'bg-blue-600/10 text-blue-600',
  purple: 'bg-purple-600/10 text-purple-600',
  emerald: 'bg-emerald-600/10 text-emerald-600',
  cyan: 'bg-cyan-600/10 text-cyan-600',
  amber: 'bg-amber-600/10 text-amber-600',
  indigo: 'bg-indigo-600/10 text-indigo-600',
};

const featureHoverBorder: Record<string, string> = {
  blue: 'hover:border-blue-500/40',
  purple: 'hover:border-purple-500/40',
  emerald: 'hover:border-emerald-500/40',
  cyan: 'hover:border-cyan-500/40',
  amber: 'hover:border-amber-500/40',
  indigo: 'hover:border-indigo-500/40',
};

interface IndustryPack {
  icon: typeof ShoppingBasket;
  color: string;
  title: string;
  description: string;
}

const industryPacks: IndustryPack[] = [
  {
    icon: ShoppingBasket,
    color: 'text-blue-600 hover:border-blue-500',
    title: 'Supermarket Billing',
    description: 'High-speed barcode scan & weighing machine sync.',
  },
  {
    icon: Utensils,
    color: 'text-purple-600 hover:border-purple-500',
    title: 'Restaurant & Cafe',
    description: 'Kitchen Order Tickets (KOT) & table split billing.',
  },
  {
    icon: Pill,
    color: 'text-emerald-600 hover:border-emerald-500',
    title: 'Pharmacy & Chemist',
    description: 'Batch numbers, expiry tracking, & salt search.',
  },
  {
    icon: Tv,
    color: 'text-cyan-600 hover:border-cyan-500',
    title: 'Electronics Store',
    description: 'Serial number & IMEI tracking with warranty logs.',
  },
];

interface PricingPlan {
  name: string;
  tagline: string;
  monthly: string;
  annual: string;
  priceColor: string;
  highlighted?: boolean;
  features: string[];
  cta: string;
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter Plan',
    tagline: 'Ideal for single retail shops & standalone stores',
    monthly: '₹1,999',
    annual: '₹1,599',
    priceColor: 'text-slate-900 dark:text-white',
    features: [
      'Single Store Location',
      '2 Billing Counter Terminals',
      'Offline Billing & Sync',
      'Basic Inventory & GST Billing',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional Plan',
    tagline: 'For growing multi-branch businesses & supermarkets',
    monthly: '₹4,999',
    annual: '₹3,999',
    priceColor: 'text-blue-600 dark:text-blue-400',
    highlighted: true,
    features: [
      'Up to 5 Store Branches',
      'Unlimited Billing Counters',
      'Warehouse Rack Management',
      'GSTR-1, 2B, 3B Tax Reports',
      'CRM, Loyalty Wallet & Mobile Apps',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise Plan',
    tagline: 'For large retail chains, franchises & white label SaaS',
    monthly: '₹12,999',
    annual: '₹9,999',
    priceColor: 'text-purple-600 dark:text-purple-400',
    features: [
      'Unlimited Stores & Warehouses',
      'White Label Custom Domain',
      'REST API & Webhooks Access',
      '24/7 Dedicated Account Manager',
    ],
    cta: 'Contact Enterprise Sales',
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: 'How does offline billing work if our internet fails?',
    answer:
      'All billing transactions, customer profiles, and product catalogs are stored locally using high-speed SQLite. The moment your internet reconnects, our background engine automatically synchronizes all pending invoices to the cloud.',
  },
  {
    question: 'Can I connect my existing Sunmi/PAX Android POS machine?',
    answer:
      'Yes! ApexPOS is optimized for Sunmi, PAX, Verifone, and Newland Android POS devices. You can print receipts, scan barcodes, and accept UPI/Card payments natively.',
  },
  {
    question: 'Is GST compliance included automatically?',
    answer:
      'Absolutely. CGST, SGST, IGST, and HSN codes are calculated in real time during checkout. You can export GSTR-1, GSTR-2B, and GSTR-3B filing JSON reports with one click.',
  },
];

function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <GlassCard padding="sm" className="!p-5 space-y-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.question}</h4>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed animate-fade-in">
          {item.answer}
        </p>
      )}
    </GlassCard>
  );
}

export default function LandingPage() {
  const { dark, toggleTheme } = useThemeStore();
  const [annual, setAnnual] = useState(true);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-x-hidden">
      {/* Ambient Glowing Radial Mesh Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[160px] animate-pulse" />
        <div
          className="absolute top-[40%] right-[-10%] w-[700px] h-[700px] rounded-full bg-purple-500/10 dark:bg-purple-600/15 blur-[160px] animate-pulse"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      {/* Sticky Glass Navigation Header */}
      <header className="sticky top-0 z-50 w-full glass-panel bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-6 lg:px-12 py-4 flex items-center justify-between shadow-lg shadow-slate-100/80 dark:shadow-2xl">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logo} alt="ApexPOS Logo" className="h-10 group-hover:scale-105 transition-transform" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600 dark:text-slate-300">
          <a href="#features" className="hover:text-blue-600 dark:hover:text-white transition">
            Features
          </a>
          <a href="#industries" className="hover:text-blue-600 dark:hover:text-white transition">
            Industry Packs
          </a>
          <a href="#hardware" className="hover:text-blue-600 dark:hover:text-white transition">
            POS Hardware
          </a>
          <a href="#pricing" className="hover:text-blue-600 dark:hover:text-white transition">
            Pricing Tiers
          </a>
          <a href="#faq" className="hover:text-blue-600 dark:hover:text-white transition">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition shadow-sm backdrop-blur-md"
          >
            {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs border border-slate-200 dark:border-white/10 transition"
          >
            Sign In
          </Link>

          <Link
            to="/register"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition transform hover:scale-[1.02]"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-6 lg:px-12 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-sm animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>NEXT-GEN MULTI-TENANT ENTERPRISE POS SAAS</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] max-w-5xl mx-auto">
          The World&apos;s Most Powerful Billing &amp;{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-400 bg-clip-text text-transparent">
            Inventory SaaS Platform
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
          Engineered for retail supermarket chains, restaurants, electronics stores, pharmacy networks, and
          multi-branch enterprises. Experience high-speed POS billing, zero-downtime offline sync, Sunmi/PAX
          hardware support, and automated GST filings.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-2 transition transform hover:scale-105"
          >
            <Zap className="w-5 h-5" />
            <span>Launch Live POS Demo</span>
          </Link>

          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 transition shadow-md"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Start 14-Day Free Trial</span>
          </Link>
        </div>

        {/* Live Glass Dashboard Preview Mockup */}
        <div className="pt-10 max-w-5xl mx-auto" id="hardware">
          <div className="glass-card bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-slate-200/60 dark:shadow-none relative overflow-hidden group">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2">
                  https://app.apexpos.com/dashboard
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                POS LIVE FEED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 text-left">
              <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                  Today&apos;s Sales Revenue
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">₹148,920.00</h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  +18.4% vs yesterday
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                  Active POS Counters
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">4 / 4 Online</h3>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Zero latency sync</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                  Net Profit Margin
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">28.6%</h3>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Target exceeded</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Supported Hardware: Sunmi, PAX, Thermal ESC/POS, Barcode Scanners</span>
              <Link to="/dashboard" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                Explore Full Tenant Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Breakdown Grid Section */}
      <section id="features" className="relative z-10 py-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="px-3.5 py-1 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-200 dark:border-purple-500/20">
            ENTERPRISE SAAS FEATURES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Built For Unstoppable Business Growth
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Every tool your business needs to bill faster, manage stock across warehouses, and automate GST tax
            filing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <GlassCard
                key={feature.title}
                className={`!bg-white/90 dark:!bg-slate-900/70 !border-slate-200/90 dark:!border-white/10 space-y-4 shadow-lg transition ${featureHoverBorder[feature.color]}`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${featureIconClasses[feature.color]}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Industry Specific Packs Section */}
      <section id="industries" className="relative z-10 py-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="px-3.5 py-1 rounded-full bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold border border-cyan-200 dark:border-cyan-500/20">
            TAILORED SOLUTIONS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            14+ Industry Specific Billing Packs
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Pre-configured workflows, tax structures, and catalog templates for your exact retail vertical.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {industryPacks.map((pack) => {
            const Icon = pack.icon;
            const [iconColor, hoverBorder] = pack.color.split(' ');
            return (
              <GlassCard
                key={pack.title}
                padding="sm"
                className={`!bg-white/90 dark:!bg-slate-900/80 !border-slate-200/90 dark:!border-slate-800 space-y-2 transition shadow-md ${hoverBorder}`}
              >
                <Icon className={`w-6 h-6 ${iconColor}`} />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{pack.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{pack.description}</p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Interactive Pricing Section */}
      <section id="pricing" className="relative z-10 py-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="px-3.5 py-1 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
            TRANSPARENT PRICING
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Predictable SaaS Subscription Plans
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            No hidden fees. Scale from a single store to nationwide retail chains seamlessly.
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Monthly</span>
            <button
              onClick={() => setAnnual((v) => !v)}
              className="w-12 h-6 rounded-full bg-blue-600 p-1 flex items-center transition"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transform transition ${annual ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                20% OFF
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <GlassCard
              key={plan.name}
              padding="lg"
              className={
                plan.highlighted
                  ? '!bg-white dark:!bg-slate-900 !border-2 !border-blue-500 relative flex flex-col justify-between space-y-6 shadow-2xl shadow-blue-500/20'
                  : '!bg-white/90 dark:!bg-slate-900/80 !border-slate-200/90 dark:!border-slate-800 flex flex-col justify-between space-y-6 shadow-xl'
              }
            >
              {plan.highlighted && (
                <span className="absolute -top-3.5 right-8 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  MOST POPULAR
                </span>
              )}
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{plan.tagline}</p>
                <div className="my-6">
                  <span className={`text-4xl font-extrabold ${plan.priceColor}`}>
                    {annual ? plan.annual : plan.monthly}
                  </span>
                  <span className="text-xs text-slate-500"> / month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to="/register"
                className={
                  plan.highlighted
                    ? 'w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs text-center shadow-lg shadow-blue-500/25 transition'
                    : 'w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs text-center transition'
                }
              >
                {plan.cta}
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="relative z-10 py-20 px-6 lg:px-12 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500">Everything you need to know about ApexPOS SaaS deployment</p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item) => (
            <FaqAccordionItem key={item.question} item={item} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 lg:px-12 py-12 bg-white/80 dark:bg-slate-950 border-t border-slate-200/80 dark:border-white/10 space-y-8 text-slate-600 dark:text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <img src={logo} alt="ApexPOS Logo" className="h-9" />
            <p className="text-slate-500">
              World-Class Enterprise Multi-Tenant POS Billing &amp; Inventory Management SaaS Platform.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider text-[11px]">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="hover:text-blue-600 dark:hover:text-white">
                  Touch POS Billing
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-blue-600 dark:hover:text-white">
                  Inventory Engine
                </Link>
              </li>
              <li>
                <Link to="/gst/reports" className="hover:text-blue-600 dark:hover:text-white">
                  GST Compliance
                </Link>
              </li>
              <li>
                <Link to="/mobile-apps" className="hover:text-blue-600 dark:hover:text-white">
                  Mobile Apps Hub
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider text-[11px]">
              SaaS Accounts
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="hover:text-blue-600 dark:hover:text-white">
                  Tenant Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-blue-600 dark:hover:text-white">
                  Start Free Trial
                </Link>
              </li>
              <li>
                <Link to="/superadmin" className="hover:text-blue-600 dark:hover:text-white">
                  Super Admin Portal
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider text-[11px]">
              Security &amp; Compliance
            </h4>
            <div className="space-y-2">
              <span className="inline-block px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                PCI-DSS Level 1 Certified
              </span>
              <span className="inline-block px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                256-Bit SSL Encrypted
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-900 text-center text-slate-500">
          &copy; 2026 ApexPOS Enterprise SaaS Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
