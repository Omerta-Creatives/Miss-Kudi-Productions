import Link from "next/link";
import QuoteForm from "../components/QuoteForm";
import { productionFaqs } from "../data";

export default function Quote() {
  return (
    <main>
      {/* Architectural Dark-Olive Editorial Hero Stage */}
      <section className="marketing-stage-hero marketing-stage-hero-compact">
        <img
          src="/images/lagos-atelier-lookbook.jpg"
          alt="Victoria Island fashion atelier showroom featuring olive linen blazers, ecru resortwear shirts and tailored trousers on a brass garment rail"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="marketing-stage-bg"
        />
        <div className="marketing-stage-scrim" aria-hidden="true" />

        <div className="marketing-stage-inner section-wrap">
          <div className="marketing-stage-grid">
            <div className="marketing-stage-copy">
              <div className="hero-fs-badges" style={{ marginBottom: 18 }}>
                <span className="hero-fs-chip-primary mono">
                  05 / PRODUCTION QUOTE &amp; COSTING STUDIO
                </span>
                <span className="hero-fs-chip-outline mono">
                  INSTANT PRO-FORMA &amp; JOB TICKET
                </span>
              </div>

              <h1 className="hero-fs-title">
                Have a collection
                <br />
                <em>ready for production?</em>
              </h1>

              <p className="hero-fs-description">
                Configure your garment category, exact unit volume, and XS–XXL size breakdown to
                preview an instant pro-forma cost estimate, fabric yardage requirement, and
                printable Factory Job Ticket.
              </p>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>B2B VOLUME TIER DISCOUNTS</span>
                <span>AUTOMATICALLY APPLIED</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">100 – 499 PIECES</span>
                  <strong className="mono">3% – 8% Off</strong>
                  <small>Emerging &amp; contemporary runs</small>
                </div>
                <div>
                  <span className="mono">500 – 999 PIECES</span>
                  <strong className="mono">12% Efficiency</strong>
                  <small>Dedicated multi-station line</small>
                </div>
                <div>
                  <span className="mono">1,000 – 5,000+ PIECES</span>
                  <strong className="mono">Up to 18% Off</strong>
                  <small>High-volume enterprise runs</small>
                </div>
              </div>
              <Link href="/size-charts" className="marketing-stage-scroll mono">
                <span>NEED TO PLAN YOUR XS–XXL RATIO FIRST?</span>
                <span>⊞</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Split Quote Studio */}
      <section className="quote-section section-wrap" id="quote" style={{ paddingTop: 72 }}>
        <div className="quote-copy">
          <div className="section-kicker mono">ATELIER ONBOARDING &amp; DELIVERABLES</div>
          <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", margin: "14px 0 16px" }}>
            What happens when you
            <br />
            <em>submit your brief?</em>
          </h2>
          <p>
            Every inquiry generates a unique Job Code (`MKP-...`), calculates your Bill of
            Materials yardage, and assigns a dedicated Pattern Designer, Master Tailor Lead, and
            AQL 2.5 QC Inspector.
          </p>

          <figure className="quote-editorial-figure">
            <img
              src="/images/private-label-finishing.jpg"
              alt="Custom woven damask neck labels, corozo buttons, spec tags and folded olive and ecru textiles"
              width={720}
              height={480}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="image-caption">
              <span>PRIVATE-LABEL &amp; CMT SPECIFICATIONS</span>
              <span className="mono">MOQ 50+ PCS · AQL 2.5</span>
            </figcaption>
          </figure>

          <div className="quote-detail">
            <span className="detail-mark">↗</span>
            <div>
              <strong>For Fashion Labels &amp; Corporate Buyers</strong>
              <span>
                Bulk cut-and-sew · Private-label damask tags · CAD pattern development
              </span>
            </div>
          </div>
          <div className="quote-detail">
            <span className="detail-mark">⌖</span>
            <div>
              <strong>Lagos, Nigeria · Local &amp; International Dispatch</strong>
              <span>
                Yaba Flagship Plant · Victoria Island Atelier · Ikeja Export Depot
              </span>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link className="underlined-link" href="/size-charts">
              Open Size &amp; Ratio Calculator <span>↗</span>
            </Link>
            <Link className="underlined-link" href="/process">
              Inspect 5-Stage Production Process <span>→</span>
            </Link>
          </div>

          {/* Native Exclusive Accordion FAQ */}
          <div className="faq-accordion-stack" style={{ marginTop: 32 }}>
            <div className="ticket-label" style={{ marginBottom: 10 }}>
              QUOTATION &amp; ONBOARDING FAQS
            </div>
            {productionFaqs.map((faq, idx) => (
              <details
                key={faq.question}
                name="quote-page-faq"
                className="mkp-accordion-item"
                open={idx === 0}
              >
                <summary className="mkp-accordion-summary">{faq.question}</summary>
                <div className="mkp-accordion-content">
                  <p>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
        <QuoteForm />
      </section>
    </main>
  );
}
