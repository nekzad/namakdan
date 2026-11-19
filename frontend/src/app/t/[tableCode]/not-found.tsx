import type { Metadata } from "next";
import NotFoundClient from "@/app/NotFoundClient";

export const metadata: Metadata = {
  title: "Table | Namakdan",
  robots: { index: false, follow: false },
};

export default function TableNotFound() {
  return <NotFoundClient />;
}
