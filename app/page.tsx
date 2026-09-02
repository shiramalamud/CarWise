import { Button, Card } from '../components/ui'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <Card className="max-w-xl w-full">
        <h1 className="text-2xl font-semibold">CarWise</h1>
        <p className="text-sm text-gray-600 mt-2">Welcome to CarWise app scaffold.</p>
        <div className="mt-4">
          <Button>Get started</Button>
        </div>
      </Card>
    </main>
  )
}
