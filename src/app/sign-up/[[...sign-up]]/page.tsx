import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isClerkEnabled } from "@/lib/authMode";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  if (!isClerkEnabled()) {
    redirect("/login");
  }
  return (
    <div className="flex justify-center py-6">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </div>
  );
}
