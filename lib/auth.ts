import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { redirect } from "next/navigation"
import clientPromise from "@/lib/db/mongodb-client"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User, type UserRole, type VerificationStatus } from "@/lib/db/models/user"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: UserRole
      verificationStatus: VerificationStatus
    }
  }

  interface User {
    role: UserRole
    verificationStatus: VerificationStatus
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: UserRole
    verificationStatus?: VerificationStatus
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/auth/register",
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        await connectToDatabase()

        const user = await User.findOne({
          email: credentials.email.toString().toLowerCase(),
        }).select("+password")

        if (!user?.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password.toString(),
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
          verificationStatus: user.verificationStatus,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await connectToDatabase()

        const existingUser = await User.findOne({ email: user.email })
        if (existingUser && !existingUser.googleId && account.providerAccountId) {
          await User.findByIdAndUpdate(existingUser._id, {
            googleId: account.providerAccountId,
          })
        }
      }

      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.verificationStatus = user.verificationStatus
      }

      if (trigger === "update" && session?.user) {
        token.role = session.user.role
        token.verificationStatus = session.user.verificationStatus
      }

      if (token.id) {
        await connectToDatabase()
        const dbUser = await User.findById(token.id)
        if (dbUser) {
          token.role = dbUser.role
          token.verificationStatus = dbUser.verificationStatus
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id
        session.user.role = token.role ?? "shipper"
        session.user.verificationStatus = token.verificationStatus ?? "pending"
      }

      return session
    },
  },
}

const nextAuthHandler = NextAuth(authOptions)

export const handlers = {
  GET: nextAuthHandler,
  POST: nextAuthHandler,
}

export function auth() {
  return getServerSession(authOptions)
}

export async function signIn(
  provider: "google" | "credentials",
  options?: { redirectTo?: string; callbackUrl?: string }
) {
  const callbackUrl = options?.redirectTo ?? options?.callbackUrl ?? "/dashboard"

  if (provider === "credentials") {
    throw new Error("Use next-auth/react signIn for credentials flows")
  }

  redirect(`/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`)
}

export async function signOut(options?: { redirectTo?: string; callbackUrl?: string }) {
  const callbackUrl = options?.redirectTo ?? options?.callbackUrl ?? "/"
  redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`)
}
