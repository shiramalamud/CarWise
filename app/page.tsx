import { Card } from '../components/ui'
import NavBar from '../components/NavBar'
import HomeNavCards from '../components/HomeNavCards'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-4">
        <Card>
          <h1 className="text-2xl font-semibold">CarWise</h1>
          <p className="text-sm text-gray-600 mt-2">Welcome to CarWise.</p>
        </Card>

        <HomeNavCards />
      </div>
    </main>
  )
}
