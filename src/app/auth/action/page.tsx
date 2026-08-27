import { Suspense } from "react";
import AuthAction from "@/components/AuthAction";

export default function AuthActionPage() {
  return (
    <Suspense>
      <AuthAction />
    </Suspense>
  );
}
