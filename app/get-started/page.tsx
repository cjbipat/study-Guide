import type { Metadata } from "next";

import { AuthScreen } from "@/components/auth/AuthScreen";

export const metadata: Metadata = { title: "Get started" };

export default function GetStartedPage() {
  return <AuthScreen mode="signup" />;
}
