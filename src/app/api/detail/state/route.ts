import { NextRequest, NextResponse } from "next/server";
import { getStateDetail } from "@/lib/detail";
import { getApiSession } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  if (!(await getApiSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const state = new URL(req.url).searchParams.get("state");
  if (!state) {
    return NextResponse.json({ error: "state required" }, { status: 400 });
  }
  const detail = getStateDetail(state);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
