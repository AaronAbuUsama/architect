import type { ReactNode } from "react";
import { RouterProvider } from "react-aria-components";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useHref, useNavigate } from "react-router";
import { SearchProvider } from "./shell/search.tsx";
import "./app.css";

// The router's basename (react-router.config.ts); Vite's BASE_URL stays "/", so it can't be used here.

// Applies the stored theme (or the system one) before first paint; the shell's ThemeToggle writes the same key.
const THEME = `try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}`;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><meta charSet="utf-8" /><script dangerouslySetInnerHTML={{ __html: THEME }} /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head>
      <body className="flex min-h-screen flex-col">
        {children}
        <ScrollRestoration /><Scripts />
      </body>
    </html>
  );
}
// HeroUI Pro's Sidebar, Navbar and links route through React Aria; this hands them React Router.
export default function App() {
  const navigate = useNavigate();
  return <RouterProvider navigate={navigate} useHref={useHref}><SearchProvider><Outlet /></SearchProvider></RouterProvider>;
}
