import "./globals.css";
import AppShell from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";

export const metadata = {
  title: "CPE Tracker | Continuing education, made clear",
  description: "A workspace for managing professional education and license records.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
      </body>
    </html>
  );
}
