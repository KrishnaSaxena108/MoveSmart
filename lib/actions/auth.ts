"use server"

import { connectToDatabase } from "@/lib/db/mongodb"
import { User, type UserRole } from "@/lib/db/models/user"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { redirect } from "next/navigation"
import { signIn, signOut } from "@/lib/auth"

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["shipper", "carrier"]),
  phone: z.string().optional(),
  companyName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export type RegisterFormState = {
  success: boolean
  credentials?: {
    email: string
    password: string
  }
  errors?: {
    email?: string[]
    password?: string[]
    name?: string[]
    role?: string[]
    phone?: string[]
    companyName?: string[]
    _form?: string[]
  }
}

export type LoginFormState = {
  success: boolean
  errors?: {
    email?: string[]
    password?: string[]
    _form?: string[]
  }
}

export async function registerUser(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const validatedFields = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    role: formData.get("role"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { email, password, name, role, phone, companyName } = validatedFields.data

  try {
    await connectToDatabase()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return {
        success: false,
        errors: {
          email: ["An account with this email already exists"],
        },
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      phone,
      companyName,
      verificationStatus: "pending",
      stats: {
        totalShipments: 0,
        completedShipments: 0,
        cancelledShipments: 0,
        averageRating: 0,
        totalReviews: 0,
        responseRate: 0,
        responseTime: 0,
      },
    })

    return {
      success: true,
      credentials: {
        email: email.toLowerCase(),
        password,
      },
    }
  } catch (error) {
    console.error("Registration error:", error)
    return {
      success: false,
      errors: {
        _form: ["Something went wrong. Please try again."],
      },
    }
  }
}

export async function loginUser(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  // This function is no longer used - login now happens client-side via NextAuth signIn()
  return {
    success: false,
    errors: {
      _form: ["Use the login form directly"],
    },
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" })
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" })
}

export async function completeOAuthProfile(
  userId: string,
  role: UserRole,
  companyName?: string
) {
  await connectToDatabase()
  
  await User.findByIdAndUpdate(userId, {
    role,
    companyName,
    verificationStatus: "pending",
  })
  
  redirect("/dashboard")
}
