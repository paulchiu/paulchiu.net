import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SocialButtonProps {
  href: string
  icon: LucideIcon
  label: string
}

export function SocialButton({ href, icon: Icon, label }: SocialButtonProps) {
  return (
    <Button
      className="bg-primary text-primary-foreground hover:bg-accent border-none"
      size="icon"
      asChild
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
      >
        <Icon className="h-5 w-5" />
      </a>
    </Button>
  )
}
