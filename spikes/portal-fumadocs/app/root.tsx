import { RootProvider } from "fumadocs-ui/provider/react-router";
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./app.css";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><Meta /><Links /></head>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: "static", api: `${import.meta.env.BASE_URL}api/search`.replace("//", "/") } }}>{children}</RootProvider>
        <ScrollRestoration /><Scripts />
      </body>
    </html>
  );
}
export default function App() { return <Outlet />; }
