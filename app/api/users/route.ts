import { NextRequest, NextResponse } from "next/server"
import { toPublicUser } from "@/lib/users"
import { getRepository } from "@/lib/repository"
import { requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'users_view')
  if ('error' in auth) return auth.error
  const repo = getRepository()
  const users = repo.users.list().map(u => toPublicUser(u))
  return NextResponse.json(users)
}
