import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

function createBrandIcon(displayName: string, path: string) {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(
    ({ color = 'currentColor', size = 24, ...props }, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={color}
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        <path d={path} />
      </svg>
    )
  )

  Icon.displayName = displayName

  return Icon
}

export const GithubIcon = createBrandIcon(
  'GithubIcon',
  'M12 .5C5.73.5.98 5.24.98 11.5c0 4.86 3.15 8.98 7.52 10.43.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.03-3.06.66-3.7-1.3-3.7-1.3-.5-1.27-1.22-1.6-1.22-1.6-.99-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.98 1.67 2.56 1.19 3.18.91.1-.71.38-1.19.69-1.46-2.44-.28-5.01-1.22-5.01-5.42 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.91 0 0 .92-.29 3.02 1.13A10.46 10.46 0 0 1 12 6.8c.94 0 1.89.13 2.78.38 2.1-1.42 3.02-1.13 3.02-1.13.6 1.51.22 2.63.11 2.91.7.77 1.13 1.75 1.13 2.95 0 4.21-2.57 5.14-5.02 5.41.39.34.74 1.01.74 2.04 0 1.47-.01 2.65-.01 3.01 0 .29.2.64.76.53a10.99 10.99 0 0 0 7.51-10.42C23.02 5.24 18.27.5 12 .5Z'
)

export const LinkedinIcon = createBrandIcon(
  'LinkedinIcon',
  'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.54V9H7.1v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z'
)
