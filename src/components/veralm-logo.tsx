import Image from 'next/image';
import { cn } from '@/lib/utils';

interface VeraLMLogoProps {
  className?: string;
  size?: number;
}

export function VeraLMLogo({ className, size = 24 }: VeraLMLogoProps) {
  return (
    <Image
      src="/icon.png"
      alt="VeraLM"
      width={size}
      height={size}
      className={cn('rounded-md object-contain shrink-0', className)}
    />
  );
}
