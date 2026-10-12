import logoIcon from '../../assets/logo-icon.webp';

interface BrandLogoProps {
  /** Overall scale: the header uses `md`, menus and sign-in pages use `lg`. */
  size?: 'md' | 'lg';
  className?: string;
}

const sizes = {
  md: { icon: 'h-11 w-11', name: 'text-[26px]', tag: 'text-[10px]' },
  lg: { icon: 'h-12 w-12', name: 'text-[30px]', tag: 'text-[11px]' },
};

/**
 * The Pospe mark plus its name as live text. Unlike the old single-image SVG,
 * the wordmark stays sharp at any size and follows the light/dark theme.
 */
export default function BrandLogo({ size = 'md', className = '' }: BrandLogoProps) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={logoIcon} alt="" className={`${s.icon} shrink-0 rounded-xl object-contain bg-white`} />
      <span className="flex flex-col leading-none">
        <span className={`${s.name} font-extrabold tracking-tight text-slate-900 dark:text-white`}>Pospe</span>
        <span className={`${s.tag} mt-1 font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400`}>Enterprise SaaS</span>
      </span>
    </span>
  );
}
