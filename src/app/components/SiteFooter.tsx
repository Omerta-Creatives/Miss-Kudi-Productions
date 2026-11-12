"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CONSOLE_PREFIXES = [
  "/dashboard",
  "/superadmin",
  "/workspace",
  "/tracker",
  "/login",
  "/reset-password",
];

export default function SiteFooter() {
  const pathname = usePathname() || "/";
  const isInternal = CONSOLE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isInternal) {
    return null;
  }

  return (
    <footer className="footer no-print">
      <div className="footer-top">
        <div className="footer-brand-col">
          <Link
            href="/"
            className="wordmark wordmark-footer"
            aria-label="Miss Kudi Productions Home"
          >
            <img
              src="/images/mk-logo-light.png"
              alt="Miss Kudi Productions, Surulere, Lagos Atelier"
              width={64}
              height={64}
              className="footer-logo-img"
            />
          </Link>
          <p className="footer-tagline">
            Your designs. Our expertise.
            <br />
            Production at scale in Surulere, Lagos.
          </p>
          <p className="footer-address">
            1 Alawode Street, Surulere, Lagos, Nigeria
          </p>
        </div>

        <div>
          <h4>Production</h4>
          <ul>
            <li>
              <Link href="/services">Capabilities &amp; MOQ</Link>
            </li>
            <li>
              <Link href="/process">Five-Stage Process</Link>
            </li>
            <li>
              <Link href="/size-charts">Size &amp; Grading Matrix</Link>
            </li>
            <li>
              <Link href="/quote">Request Production Quote</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Atelier</h4>
          <ul>
            <li>
              <Link href="/about">Surulere Facility &amp; Leads</Link>
            </li>
            <li>
              <Link href="/tracker">Order Tracker</Link>
            </li>
            <li>
              <Link href="/login">Staff &amp; Partner Sign-In</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Terms &amp; Governance</h4>
          <ul>
            <li>
              <Link href="/privacy-policy">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
            </li>
            <li>
              <Link href="/refund-policy">Refund &amp; Defect Policy</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Miss Kudi Productions</span>
        <span>1 Alawode Street, Surulere, Lagos, Nigeria</span>
        <span>B2B garment manufacturing &amp; private-label production</span>
      </div>
    </footer>
  );
}
