import { NextRequest, NextResponse } from "next/server";
import { getFamilyDetail } from "@/lib/detail";
import { getApiSession } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  if (!(await getApiSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = new URL(req.url).searchParams.get("familyId");
  if (!familyId) {
    return NextResponse.json({ error: "familyId required" }, { status: 400 });
  }
  const detail = getFamilyDetail(familyId);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
