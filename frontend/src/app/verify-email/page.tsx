import { Metadata } from "next";
import VerifyEmailClient from "./VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verify email — Namakdan",
  robots: { index: false, follow: true },
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
