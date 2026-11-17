import { RootProvider } from "fumadocs-ui/provider/react-router";
import type { ReactNode } from "react";
import { RouterProvider } from "react-aria-components";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useHref, useNavigate } from "react-router";
import "./app.css";

// The router's basename (react-router.config.ts); Vite's BASE_URL stays "/", so it can't be used here.

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: "static", api: "/portal/api/search" } }}>{children}</RootProvider>
        <ScrollRestoration /><Scripts />
      </body>
    </html>
  );
}
// HeroUI Pro's Sidebar, Navbar and links route through React Aria; this hands them React Router.
export default function App() {
  const navigate = useNavigate();
  return <RouterProvider navigate={navigate} useHref={useHref}><Outlet /></RouterProvider>;
}
