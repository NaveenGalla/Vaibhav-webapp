import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userCount = await db.user.count();
    const adminUser = await db.user.findUnique({
      where: { email: "admin@vaibhavjewellers.com" },
      select: { id: true, email: true, role: true, isActive: true, password: true },
    });
    return NextResponse.json({
      ok: true,
      userCount,
      adminFound: !!adminUser,
      adminActive: adminUser?.isActive,
      passwordLength: adminUser?.password?.length ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
