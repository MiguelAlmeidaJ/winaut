import Image from 'next/image';

interface OrquestraBrandProps {
  variant?: 'color' | 'white' | 'icon';
  className?: string;
  priority?: boolean;
}

const assets = {
  color: {
    src: '/brand/orquestra-logo.png',
    width: 1214,
    height: 296,
  },
  white: {
    src: '/brand/orquestra-logo-white.png',
    width: 1204,
    height: 295,
  },
  icon: {
    src: '/brand/orquestra-icon.png',
    width: 392,
    height: 309,
  },
} as const;

export function OrquestraBrand({
  variant = 'color',
  className,
  priority = false,
}: OrquestraBrandProps) {
  const asset = assets[variant];

  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={variant === 'icon' ? 'Ícone Orquestra' : 'Orquestra'}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
