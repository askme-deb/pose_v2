export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="glass-card p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 h-full">
      <h1 className="text-xl font-black tracking-tight">{title}</h1>
      <p className="text-xs text-slate-400 mt-1">This module is under construction.</p>
    </div>
  );
}
