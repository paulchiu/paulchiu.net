import { Github, Linkedin } from 'lucide-react'
import { SocialButton } from '@/components/social-button'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export default function Home() {
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    // Preload the profile image
    const img = new Image()
    img.src = '/profile.webp'
    img.onload = () => setImageLoaded(true)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden border-none bg-card-background shadow-lg">
        <div className="relative h-32 bg-gradient-to-r from-card-hero-from to-card-hero-to">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-card-background bg-card-background">
              {imageLoaded ? (
                <img
                  src="/profile.webp"
                  width={96}
                  height={96}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-card-background animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="mt-16 p-6 text-center">
          <h1 className="mb-1 text-2xl font-bold text-primary-foreground">
            Paul Chiu
          </h1>
          <p className="text-sm text-foreground">Programmer</p>

          <div className="my-6">
            <p className="text-primary-foreground">Brisbane, Australia</p>
          </div>

          <div className="flex justify-center space-x-4">
            <SocialButton
              href="https://github.com/paulchiu"
              icon={Github}
              label="GitHub Profile"
            />

            <SocialButton
              href="https://linkedin.com/in/paulchiu1"
              icon={Linkedin}
              label="LinkedIn Profile"
            />
          </div>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-sm text-accent">
        <p>© {new Date().getFullYear()} Paul Chiu. All rights reserved.</p>
      </footer>
    </div>
  )
}
