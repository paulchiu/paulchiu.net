import { Card, CardContent } from '@/components/ui/card'

export function ProfileSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#282a36] p-4">
      <Card className="w-full max-w-md overflow-hidden border-none bg-[#1e1f29] shadow-lg">
        <div className="relative h-32 bg-gradient-to-r from-[#6272a4] to-[#bd93f9] animate-pulse">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-[#1e1f29] bg-[#44475a] animate-pulse"></div>
          </div>
        </div>

        <CardContent className="mt-16 p-6 text-center">
          <div className="mb-1 h-7 w-40 mx-auto bg-[#44475a] rounded animate-pulse"></div>
          <div className="h-4 w-24 mx-auto bg-[#44475a] rounded animate-pulse mt-2"></div>

          <div className="my-6">
            <div className="h-5 w-32 mx-auto bg-[#44475a] rounded animate-pulse"></div>
          </div>

          <div className="flex justify-center space-x-4">
            <div className="h-9 w-9 bg-[#44475a] rounded-md animate-pulse"></div>
            <div className="h-9 w-9 bg-[#44475a] rounded-md animate-pulse"></div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 h-4 w-64 bg-[#44475a] rounded animate-pulse"></div>
    </div>
  )
}
