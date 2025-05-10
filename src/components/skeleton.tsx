import { Card, CardContent } from '@/components/ui/card'

export function ProfileSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden border-none bg-card-background shadow-lg">
        <div className="relative h-32 bg-gradient-to-r from-card-hero-from to-card-hero-to">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-card-background bg-skeleton animate-pulse"></div>
          </div>
        </div>

        <CardContent className="mt-16 p-6 text-center">
          <div className="mb-1 h-7 w-40 mx-auto bg-skeleton rounded animate-pulse"></div>
          <div className="h-4 w-24 mx-auto bg-skeleton rounded animate-pulse mt-2"></div>

          <div className="my-6">
            <div className="h-5 w-32 mx-auto bg-skeleton rounded animate-pulse"></div>
          </div>

          <div className="flex justify-center space-x-4">
            <div className="h-9 w-9 bg-skeleton rounded-md animate-pulse"></div>
            <div className="h-9 w-9 bg-skeleton rounded-md animate-pulse"></div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 h-4 w-64 bg-skeleton rounded animate-pulse"></div>
    </div>
  )
}
