import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CourtVision",
  description: "A web-based basketball playbook app.",
};

type Props = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
