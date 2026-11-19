import type { Metadata } from "next";
import NotFoundClient from "@/app/NotFoundClient";

export const metadata: Metadata = {
  title: "Menu | Namakdan",
  robots: { index: false, follow: false },
};

export default function MenuNotFound() {
  return <NotFoundClient />;
}
