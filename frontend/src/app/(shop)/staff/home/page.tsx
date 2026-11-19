import { Metadata } from "next";
import StaffHomeClient from "./StaffHomeClient";

export const metadata: Metadata = {
  title: "Staff — Namakdan",
  robots: { index: false, follow: false },
};

export default function StaffHomePage() {
  return <StaffHomeClient />;
}
