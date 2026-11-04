import "./globals.css";
import Link from "next/link";
import SiteHeader from "./components/SiteHeader";

export const metadata = {
  title: "Miss Kudi Productions — B2B Garment Manufacturing in Lagos, Nigeria",
  description:
    "Lagos-based B2B garment manufacturing partner for fashion brands. Bulk cut-and-sew, private-label production, CAD pattern grading, and AQL 2.5 quality control.",
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
        <footer className="footer no-print">
          <div className="footer-top">
            <Link href="/" className="wordmark wordmark-footer" aria-label="Miss Kudi Productions Home">
              <img
                src="/images/mk-logo-light.png"
                alt="Miss Kudi Productions — Lagos Atelier"
                width={76}
                height={76}
                className="wordmark-logo-img"
                style={{ width: 76, height: 76 }}
              />
            </Link>
            <p>
              Your designs. Our expertise.
              <br />
              Production at scale.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="button button-light" href="/size-charts">
                Size &amp; Grading Matrix <span>⊞</span>
              </Link>
              <Link className="button button-light" href="/services">
                Explore Capabilities <span>✦</span>
              </Link>
              <Link className="button button-light" href="/quote">
                Start a production inquiry <span>↗</span>
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Miss Kudi Productions</span>
            <span>
              1 Alawode Street, Lagos, Nigeria · Yaba Flagship · Victoria Island Atelier · Ikeja Export Depot
            </span>
            <span>B2B GARMENT MANUFACTURING</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
