import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoAudit",
  description: "Automated security auditing for Git repositories and software supply chains.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="border-b border-zinc-800 p-4 md:w-56 md:shrink-0 md:border-r md:border-b-0">
            <div className="mb-6 px-3">
              <p className="font-mono text-sm font-semibold tracking-tight text-zinc-50">RepoAudit</p>
              <p className="font-mono text-[11px] text-zinc-500">SecuriNets R&amp;D</p>
            </div>
            <Nav />
          </aside>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
