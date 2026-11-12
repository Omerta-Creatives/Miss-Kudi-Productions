import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

export const metadata = {
  title: "Miss Kudi Productions, B2B Garment Manufacturing in Surulere, Lagos",
  description:
    "Surulere, Lagos B2B garment manufacturing partner for fashion brands at 1 Alawode Street, Surulere. Bulk cut-and-sew, private-label production, CAD pattern grading, and AQL 2.5 quality control.",
  icons: {
    icon: "/images/mk-logo.svg",
    apple: "/images/mk-logo-transparent.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme="light">
      <body className="h-full">
        <SiteHeader />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
