import "./globals.css";
import { Providers } from "./providers"; 

export const metadata = {
  title: "Vincent Escrow DApp",
  description: "Secure Freelance Payments",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}