import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isClerkEnabled } from "@/lib/authMode";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  if (!isClerkEnabled()) {
    redirect("/login");
  }
  return (
    <div className="flex justify-center py-6">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
    </div>
  );
}
