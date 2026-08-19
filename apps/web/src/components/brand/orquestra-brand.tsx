import Image from 'next/image';

import orquestraIcon from '@/assets/brand/orquestra-icon.png';
import orquestraLogoWhite from '@/assets/brand/orquestra-logo-white.png';
import orquestraLogo from '@/assets/brand/orquestra-logo.png';

interface OrquestraBrandProps {
  variant?: 'color' | 'white' | 'icon';
  className?: string;
  priority?: boolean;
}

const assets = {
  color: orquestraLogo,
  white: orquestraLogoWhite,
  icon: orquestraIcon,
} as const;

export function OrquestraBrand({
  variant = 'color',
  className,
  priority = false,
}: OrquestraBrandProps) {
  const asset = assets[variant];

  return (
    <Image
      src={asset}
      alt={variant === 'icon' ? 'Ícone Orquestra' : 'Orquestra'}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
