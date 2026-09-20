import { NextRequest, NextResponse } from "next/server";
import { getPrescriberDetail } from "@/lib/detail";
import { getApiSession, planAllows } from "@/lib/apiAuth";
import { resolveNppesContact, type ContactPayload } from "@/lib/nppes";
import { getGroupForNpi } from "@/lib/enrollment";
import { getOpenPaymentsProfile, type OpenPaymentsPayload } from "@/lib/openPayments";

export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const npi = searchParams.get("npi");
  if (!npi) {
    return NextResponse.json({ error: "npi required" }, { status: 400 });
  }
  const detail = getPrescriberDetail(npi, searchParams.get("familyId"));
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let contact: ContactPayload = null;
  if (!planAllows(session.plan, "provider_contacts")) {
    contact = { locked: true };
  } else {
    contact = await resolveNppesContact(npi);
  }

  let openPayments: OpenPaymentsPayload = null;
  if (!planAllows(session.plan, "open_payments")) {
    openPayments = { locked: true };
  } else {
    openPayments = getOpenPaymentsProfile(npi);
  }

  const enrollmentGroup = getGroupForNpi(npi);
  return NextResponse.json({ ...detail, contact, openPayments, enrollmentGroup });
}
