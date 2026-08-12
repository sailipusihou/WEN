import { NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"

// Public API — no auth required. Returns only frontend-facing content.
export async function GET() {
  const repo = getRepository()
  const settings = repo.settings.get()
  return NextResponse.json(settings.frontendContent || {})
}
