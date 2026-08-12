import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { hashStaffPassword, type StaffMember } from "@/lib/settings"
import { requireSuperAdmin } from "@/lib/auth"
import { validateEmail, validateString, sanitizeString } from "@/lib/validation"

function sanitizeStaff(members: StaffMember[]) {
  return members.map(m => {
    const { password, passwordHash, salt, ...rest } = m as any
    return rest
  })
}

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req)
  if ('error' in auth) return auth.error
  const repo = getRepository()
  const staff = repo.staff.list()
  return NextResponse.json(sanitizeStaff(staff))
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req)
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const repo = getRepository()
    const staff = repo.staff.list()

    if (body.action === "add") {
      const password = body.password
      if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
        return NextResponse.json(
          { error: "Password is required and must be 8-128 characters" },
          { status: 400 }
        )
      }
      if (!validateEmail(body.email || "")) {
        return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
      }
      if (!validateString(body.name || "", 100)) {
        return NextResponse.json({ error: "Name is required and must be under 100 characters" }, { status: 400 })
      }
      if (staff.some(s => s.email.toLowerCase() === body.email.toLowerCase())) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 })
      }
      const { hash, salt } = hashStaffPassword(password)
      const member = repo.staff.add({
        name: sanitizeString(body.name),
        email: body.email.toLowerCase().trim(),
        password: "",
        passwordHash: hash,
        salt,
        role: body.role || "order_processor",
        active: true,
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
        avatar: typeof body.avatar === "string" ? body.avatar : "",
      } as StaffMember)
      return NextResponse.json(sanitizeStaff([member])[0], { status: 201 })
    }

    if (body.action === "remove") {
      if (body.id === auth.user.id) {
        return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
      }
      const success = repo.staff.delete(body.id)
      return NextResponse.json({ ok: success })
    }

    if (body.action === "toggle") {
      if (body.id === auth.user.id) {
        return NextResponse.json({ error: "Cannot disable your own account" }, { status: 400 })
      }
      const existing = repo.staff.getById(body.id)
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
      const updated = repo.staff.update(body.id, { active: !existing.active } as Partial<StaffMember>)
      return NextResponse.json(sanitizeStaff([updated!])[0])
    }

    if (body.action === "update_role") {
      const existing = repo.staff.getById(body.id)
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
      const updated = repo.staff.update(body.id, { role: body.role || "order_processor" } as Partial<StaffMember>)
      return NextResponse.json(sanitizeStaff([updated!])[0])
    }

    if (body.action === "update") {
      const existing = repo.staff.getById(body.id)
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
      const updates: Partial<StaffMember> & { password?: string; passwordHash?: string; salt?: string } = {}
      if (body.name) {
        if (!validateString(body.name, 100)) {
          return NextResponse.json({ error: "Name too long" }, { status: 400 })
        }
        updates.name = sanitizeString(body.name)
      }
      if (body.email) {
        if (!validateEmail(body.email)) {
          return NextResponse.json({ error: "Invalid email" }, { status: 400 })
        }
        updates.email = body.email.toLowerCase().trim()
      }
      if (body.password) {
        if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
          return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 })
        }
        const { hash, salt } = hashStaffPassword(body.password)
        updates.password = ""
        updates.passwordHash = hash
        updates.salt = salt
      }
      if (body.role) updates.role = body.role
      if (body.permissions) updates.permissions = Array.isArray(body.permissions) ? body.permissions : []
      if (body.avatar !== undefined) updates.avatar = body.avatar
      const updated = repo.staff.update(body.id, updates)
      return NextResponse.json(sanitizeStaff([updated!])[0])
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 })
  }
}
