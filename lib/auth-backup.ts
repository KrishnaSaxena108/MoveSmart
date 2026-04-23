/**
 * JOLLY420 - AUTHENTICATION CONFIGURATION BACKUP
 * 
 * This is a backup of the original auth.ts file.
 */
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/db/mongodb-client"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models/user"
import bcrypt from "bcryptjs"
import type { UserRole, VerificationStatus } from "@/lib/db/models/user"

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

export const { handlers, signIn, signOut, auth } = NextAuth({
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
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
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
          email: credentials.email.toString().toLowerCase() 
        }).select("+password")

        if (!user || !user.password) {
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
      if (account?.provider === "google") {
        await connectToDatabase()
        
        const existingUser = await User.findOne({ email: user.email })
        
        if (!existingUser) {
          return true
        }
        
        if (!existingUser.googleId && account.providerAccountId) {
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
      
      if (trigger === "update" && session) {
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
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.verificationStatus = token.verificationStatus as VerificationStatus
      }
      
      return session
    },
  },
})
