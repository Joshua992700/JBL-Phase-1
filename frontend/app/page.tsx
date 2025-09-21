import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function Hero() {
  return (
    <div>
      <h1>Welcome to the Hero Section</h1>
      <Button>
      <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
    </div>
  )
}

export default Hero
