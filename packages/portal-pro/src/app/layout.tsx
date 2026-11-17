// Next's routing entry: the composition root of this face. Pages stay thin and render modules.
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Architect · Portal Pro" };

const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
