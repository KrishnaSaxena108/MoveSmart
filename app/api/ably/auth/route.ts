import { NextResponse } from 'next/server'
import Ably from 'ably'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const apiKey = process.env.ABLY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Ably not configured' },
        { status: 500 }
      )
    }

    const ably = new Ably.Rest({ key: apiKey })
    
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: session.user.id,
    })

    return NextResponse.json(tokenRequest)
  } catch (error) {
    console.error('Ably auth error:', error)
    return NextResponse.json(
      { error: 'Failed to authenticate' },
      { status: 500 }
    )
  }
}
