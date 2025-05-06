import { Github, Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-dracula-background p-4">
      <Card className="w-full max-w-md overflow-hidden border-none bg-dracula-darkBackground shadow-lg">
        <div className="relative h-32 bg-gradient-to-r from-dracula-comment to-dracula-purple">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-dracula-darkBackground bg-dracula-darkBackground">
              {imageLoaded ? (
                <img
                  src="/profile.webp"
                  width={96}
                  height={96}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-dracula-currentLine animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="mt-16 p-6 text-center">
          <h1 className="mb-1 text-2xl font-bold text-dracula-foreground">
            Paul Chiu
          </h1>
          <p className="text-sm text-dracula-purple">Programmer</p>

          <div className="my-6">
            <p className="text-dracula-foreground">Brisbane, Australia</p>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              className="bg-dracula-currentLine text-dracula-foreground hover:bg-dracula-comment border-none"
              size="icon"
              asChild
            >
              <a
                href="https://github.com/paulchiu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Profile"
              >
                <Github className="h-5 w-5" />
              </a>
            </Button>

            <Button
              className="bg-dracula-currentLine text-dracula-foreground hover:bg-dracula-comment border-none"
              size="icon"
              asChild
            >
              <a
                href="https://linkedin.com/in/paulchiu1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-sm text-dracula-comment">
        <p>© {new Date().getFullYear()} Paul Chiu. All rights reserved.</p>
      </footer>
    </div>
  )
}
