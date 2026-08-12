import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getRepository } from "@/lib/repository"
import { requireAdmin, ADMIN_USER_COOKIE_OPTIONS, hashAdminPassword, verifyAdminPassword } from "@/lib/auth"
import { validateEmail, validateString, sanitizeString } from "@/lib/validation"
import { hashStaffPassword, verifyStaffPassword } from "@/lib/settings"

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if ("error" in auth) return auth.error
  return NextResponse.json({ user: auth.user })
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req)
  if ("error" in auth) return auth.error

  try {
    const body = await req.json()
    const repo = getRepository()
    const userId = auth.user.id
    const user = auth.user
    const isMainAdmin = userId === "main-admin"

    const updates: any = {}

    if (body.name !== undefined) {
      if (!validateString(body.name, 100)) {
        return NextResponse.json({ error: "Name must be under 100 characters" }, { status: 400 })
      }
      updates.name = sanitizeString(body.name)
    }

    if (body.email !== undefined) {
      if (!validateEmail(body.email)) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 })
      }
      const newEmail = body.email.toLowerCase().trim()
      if (!isMainAdmin) {
        const existing = repo.staff.list().find(s => s.email.toLowerCase() === newEmail && s.id !== userId)
        if (existing) {
          return NextResponse.json({ error: "Email already exists" }, { status: 409 })
        }
      }
      updates.email = newEmail
    }

    if (body.avatar !== undefined) {
      if (!validateString(body.avatar, 500)) {
        return NextResponse.json({ error: "Avatar URL too long" }, { status: 400 })
      }
      updates.avatar = sanitizeString(body.avatar)
    }

    if (body.phone !== undefined) {
      if (!validateString(body.phone, 30)) {
        return NextResponse.json({ error: "Phone too long" }, { status: 400 })
      }
      updates.phone = sanitizeString(body.phone)
    }

    if (body.bio !== undefined) {
      if (!validateString(body.bio, 500)) {
        return NextResponse.json({ error: "Bio too long" }, { status: 400 })
      }
      updates.bio = sanitizeString(body.bio)
    }

    let passwordUpdated = false

    if (body.currentPassword && body.newPassword) {
      if (typeof body.newPassword !== "string" || body.newPassword.length < 8 || body.newPassword.length > 128) {
        return NextResponse.json({ error: "New password must be 8-128 characters" }, { status: 400 })
      }

      if (isMainAdmin) {
        const settings = repo.settings.get()
        if (settings?.adminPasswordHash && settings?.adminPasswordSalt) {
          if (!verifyAdminPassword(body.currentPassword, settings.adminPasswordHash, settings.adminPasswordSalt)) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
          }
        }
        const { hash, salt } = hashAdminPassword(body.newPassword)
        updates.adminPasswordHash = hash
        updates.adminPasswordSalt = salt
        passwordUpdated = true
      } else {
        const fullUser = repo.staff.getById(userId)
        if (!fullUser || !verifyStaffPassword(body.currentPassword, fullUser)) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
        }
        const { hash: newHash, salt: newSalt } = hashStaffPassword(body.newPassword)
        updates.passwordHash = newHash
        updates.salt = newSalt
        passwordUpdated = true
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    let updatedUser: any = null

    if (isMainAdmin) {
      const settingsUpdates: any = {}
      if (updates.name !== undefined) settingsUpdates.adminUsername = updates.name
      if (updates.email !== undefined) settingsUpdates.adminEmail = updates.email
      if (updates.avatar !== undefined) settingsUpdates.adminAvatar = updates.avatar
      if (updates.phone !== undefined) settingsUpdates.adminPhone = updates.phone
      if (updates.bio !== undefined) settingsUpdates.adminBio = updates.bio
      if (updates.adminPasswordHash) settingsUpdates.adminPasswordHash = updates.adminPasswordHash
      if (updates.adminPasswordSalt) settingsUpdates.adminPasswordSalt = updates.adminPasswordSalt

      repo.settings.update(settingsUpdates)

      const updatedSettings = repo.settings.get()
      updatedUser = {
        id: "main-admin",
        name: updatedSettings.adminUsername || "Admin",
        email: updatedSettings.adminEmail || "admin@lowflame.com",
        role: "super_admin",
        avatar: updatedSettings.adminAvatar,
        phone: updatedSettings.adminPhone,
        bio: updatedSettings.adminBio,
      }
    } else {
      const { adminPasswordHash, adminPasswordSalt, ...staffUpdates } = updates
      const updated = repo.staff.update(userId, staffUpdates)
      if (!updated) {
        return NextResponse.json({ error: "Update failed" }, { status: 400 })
      }
      const { passwordHash, salt, password, ...safe } = updated as any
      updatedUser = safe
    }

    if (updatedUser) {
      const cookieStore = await cookies()
      const userForCookie = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || user.role,
        avatar: updatedUser.avatar,
      }
      cookieStore.set("admin_user", JSON.stringify(userForCookie), ADMIN_USER_COOKIE_OPTIONS)
    }

    return NextResponse.json({ user: updatedUser })
  } catch (e) {
    console.error("Profile update error:", e)
    return NextResponse.json({ error: "Update failed" }, { status: 400 })
  }
}
