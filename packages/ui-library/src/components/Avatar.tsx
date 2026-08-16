import { cn } from '../utils/cn';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-7 h-7 text-[10px] rounded-lg',
  md: 'w-8 h-8 text-xs rounded-xl',
  lg: 'w-12 h-12 text-base rounded-2xl',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center font-bold text-white shadow-md bg-gradient-to-tr from-violet-500 to-indigo-600 shrink-0',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
