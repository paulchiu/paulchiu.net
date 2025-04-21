import { Suspense, lazy } from 'react'
import { ProfileSkeleton } from './components/skeleton'

const Home = lazy(() => import('./app/page'))

function App() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Home />
    </Suspense>
  )
}

export default App
