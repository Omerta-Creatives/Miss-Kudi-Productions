import Link from "next/link";
import QuoteForm from "../components/QuoteForm";
import { productionFaqs } from "../data";

export default function Quote() {
  return (
    <main>
      <section className="marketing-stage-hero marketing-stage-hero-compact">
        <img
          src="/images/lagos-atelier-lookbook.jpg"
          alt="Surulere fashion atelier showroom featuring olive linen blazers, ecru resortwear shirts and tailored trousers on a brass garment rail"
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
              <h1 className="hero-fs-title">
                Have a collection
                <br />
                ready for production?
              </h1>

              <p className="hero-fs-description">
                Configure garment category, volume, and size curve for an instant pro-forma quote.
              </p>

              <div className="hero-fs-badges">
                <span className="hero-fs-chip-primary mono">
                  Production quote &amp; costing studio
                </span>
                <span className="hero-fs-chip-outline mono">
                  Instant pro-forma &amp; Job Ticket
                </span>
              </div>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>B2B volume tier discounts</span>
                <span>Applied automatically</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">100 to 499 pieces</span>
                  <strong className="mono">3% to 8% Off</strong>
                  <small>Emerging &amp; contemporary runs</small>
                </div>
                <div>
                  <span className="mono">500 to 999 pieces</span>
                  <strong className="mono">12% Efficiency</strong>
                  <small>Dedicated multi-station line</small>
                </div>
                <div>
                  <span className="mono">1,000 to 5,000+ pieces</span>
                  <strong className="mono">Up to 18% Off</strong>
                  <small>High-volume enterprise runs</small>
                </div>
              </div>
              <Link href="/size-charts" className="marketing-stage-scroll mono">
                <span>Plan your XS to XXL ratio first</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-section section-wrap" id="quote" style={{ paddingTop: 72 }}>
        <div className="quote-copy">
          <h2 style={{ fontSize: "clamp(26px, 3vw, 38px)", margin: "0 0 16px" }}>
            What happens when you
            <br />
            submit your brief?
          </h2>
          <p>
            Every inquiry generates a unique Job Code (MKP-...), calculates your Bill of Materials
            yardage, and assigns a dedicated Pattern Designer, Master Tailor Lead, and AQL 2.5 QC
            Inspector.
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
              <span>Private-label &amp; CMT specifications</span>
              <span className="mono">MOQ 50+ pcs, AQL 2.5</span>
            </figcaption>
          </figure>

          <div className="quote-detail">
            <span className="detail-mark mono">01</span>
            <div>
              <strong>For Fashion Labels &amp; Corporate Buyers</strong>
              <span>
                Bulk cut-and-sew, private-label damask tags, and CAD pattern development
              </span>
            </div>
          </div>
          <div className="quote-detail">
            <span className="detail-mark mono">02</span>
            <div>
              <strong>Surulere, Lagos &amp; International Dispatch</strong>
              <span>1 Alawode Street, Surulere, Lagos, Nigeria</span>
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link className="underlined-link" href="/size-charts">
              Size &amp; Ratio Calculator
            </Link>
            <Link className="underlined-link" href="/process">
              5-Stage Production Process
            </Link>
          </div>

          <div className="faq-accordion-stack" style={{ marginTop: 32 }}>
            <div className="ticket-label" style={{ marginBottom: 10 }}>
              Quotation &amp; onboarding FAQs
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
