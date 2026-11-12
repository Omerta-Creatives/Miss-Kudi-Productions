import Link from "next/link";
import { garmentCategories, productionFaqs, services } from "../data";

export default function Services() {
  return (
    <main>
      <section className="marketing-stage-hero">
        <img
          src="/images/sewing-production-line.jpg"
          alt="Nigerian master tailors operating industrial lockstitch sewing machines in the Miss Kudi Productions Surulere, Lagos factory"
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
                Manufacturing that
                <br />
                moves your brand forward.
              </h1>

              <p className="hero-fs-description">
                Cut-Make-Trim and full-package production built around your patterns, grading, and calendar.
              </p>

              <div className="hero-fs-badges" style={{ marginBottom: 20 }}>
                <span className="hero-fs-chip-primary mono">
                  Manufacturing capabilities
                </span>
                <span className="hero-fs-chip-outline mono">
                  CMT &amp; Full-Package (FOB)
                </span>
              </div>

              <div className="hero-fs-actions">
                <Link className="button hero-fs-btn-gold" href="/quote">
                  Calculate Quote
                </Link>
                <Link className="button hero-fs-btn-glass" href="/size-charts">
                  Size Calculator
                </Link>
              </div>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>Production specifications</span>
                <span>AQL 2.5 Verified</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">Minimum order (MOQ)</span>
                  <strong className="mono">50 to 5,000+ Pcs</strong>
                  <small>Split across XS to XXL size curves</small>
                </div>
                <div>
                  <span className="mono">Turnaround window</span>
                  <strong className="mono">3 to 6 Weeks</strong>
                  <small>7 to 14 days for 1st fit sample</small>
                </div>
                <div>
                  <span className="mono">Marker utilization</span>
                  <strong className="mono">94.6%+ Yield</strong>
                  <small>CAD nested pattern blocks</small>
                </div>
              </div>
              <a href="#capabilities" className="marketing-stage-scroll mono">
                <span>Explore four production pillars</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="capabilities section-wrap" id="capabilities">
        <div className="section-heading">
          <div>
            <h2>
              Complete garment execution
              <br />
              under one roof.
            </h2>
          </div>
          <p>
            Every service tier includes dedicated artisan station assignment and printable
            Production Job Tickets.
          </p>
        </div>

        <div className="taste-bento-grid">
          {services.map((service, index) => {
            const isWide = index === 0 || index === 3;
            return (
              <article
                className={`taste-bento-card ${
                  isWide ? "bento-span-7 bento-horizontal" : "bento-span-5"
                }`}
                key={service.number}
              >
                <figure className="taste-bento-figure">
                  <img
                    src={service.image}
                    alt={service.alt}
                    width={640}
                    height={460}
                    loading="lazy"
                    decoding="async"
                    className="taste-bento-img"
                  />
                  <span className="service-number mono">{service.number}</span>
                  <span className="service-moq-pill mono">{service.moqLabel}</span>
                </figure>
                <div className="taste-bento-body">
                  <h3>{service.title}</h3>
                  <div className="service-role-kicker mono">{service.artisanRole}</div>
                  <p>{service.copy}</p>
                  <ul className="service-deliverables-list">
                    {service.deliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="taste-bento-footer mono">
                    <span>{service.leadTimeLabel}</span>
                    <Link href="/quote">Configure Run</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="section-wrap mkp-surface-warm"
        style={{ paddingTop: 84, paddingBottom: 84 }}
      >
        <div className="section-heading">
          <div>
            <h2>
              Cut-Make-Trim (CMT) vs.
              <br />
              Full-Package (FOB) Sourcing.
            </h2>
          </div>
          <p>
            Select the production model that matches your brand&apos;s textile supply chain.
          </p>
        </div>

        <div className="service-model-compare-grid">
          <article className="service-model-card">
            <h3>Cut-Make-Trim (CMT) Manufacturing</h3>
            <div className="service-model-top mono">
              <span className="mkp-badge mkp-badge-olive">Option A: CMT</span>
              <span>Client-supplied fabric</span>
            </div>
            <p>
              Ideal for fashion labels that import or weave proprietary textiles (such as custom
              Adire, deadstock wool, or specialty prints) and need industrial pattern grading,
              cutting, sewing, and AQL 2.5 finishing.
            </p>
            <ul className="service-deliverables-list">
              <li>24-hour fabric roll relaxation &amp; shrinkage verification</li>
              <li>CAD marker nesting to maximize yield from your supplied yardage</li>
              <li>Thread matching, interlinings, and full sewing line execution</li>
            </ul>
            <div className="service-model-footer mono">
              <span>MOQ: 50 pcs / style</span>
              <Link href="/quote">Quote CMT Run</Link>
            </div>
          </article>

          <article className="service-model-card service-model-card-dark">
            <h3>Full-Package (FOB) Private-Label Production</h3>
            <div className="service-model-top mono">
              <span className="hero-fs-chip-primary">Option B: Full Package (FOB)</span>
              <span className="mkp-gold-text">Turnkey mill to carton</span>
            </div>
            <p>
              Turnkey manufacturing utilizing our vetted textile mill inventory (240 to 480 GSM
              combed jersey &amp; fleece, linen, gabardine, silk crepe) paired with custom woven
              damask neck labels, care tags, and branded hardware.
            </p>
            <ul className="service-deliverables-list">
              <li>Mill-certified fabric &amp; custom-dyed rib/drawcord sourcing</li>
              <li>Custom woven damask neck labels, satin care labels &amp; swing tags</li>
              <li>Steam pressing, barcode polybagging &amp; export carton dispatch</li>
            </ul>
            <div className="service-model-footer mono">
              <span>MOQ: 100 pcs / style</span>
              <Link href="/quote" className="mkp-gold-text">
                Quote FOB Run
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section-wrap" style={{ paddingTop: 88, paddingBottom: 96 }}>
        <div className="section-heading">
          <div>
            <h2>
              What we produce across
              <br />
              our Surulere lines.
            </h2>
          </div>
          <p>
            Specialized machine attachments and needle gauges calibrated for knits, wovens, silks
            and heavy twill.
          </p>
        </div>

        <div className="taste-spec-index-ledger">
          {garmentCategories.map((cat, idx) => (
            <article key={cat.title} className="taste-spec-row">
              <div className="taste-spec-num mono">0{idx + 1}</div>
              <div className="taste-spec-title-col">
                <h3>{cat.title}</h3>
                <span className="taste-spec-tag mono">{cat.tag}</span>
              </div>
              <div className="taste-spec-desc-col">
                <p>{cat.description}</p>
                <div className="taste-spec-pills mono">
                  <span>{cat.gsmRange}</span>
                  <strong>{cat.moq}</strong>
                </div>
              </div>
              <figure className="taste-spec-thumb">
                <img
                  src={cat.image}
                  alt={cat.alt}
                  width={360}
                  height={240}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 64, maxWidth: 860 }}>
          <div className="ticket-label" style={{ marginBottom: 12 }}>
            Technical &amp; MOQ FAQs
          </div>
          <div className="faq-accordion-stack">
            {productionFaqs.map((faq, idx) => (
              <details
                key={faq.question}
                name="services-faq"
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

        <div className="marketing-bottom-cta-banner">
          <div>
            <h3>Have a tech pack or reference garment ready for costing?</h3>
            <p>
              Calculate your exact unit cost, volume discount tier, and graded fabric consumption in
              under two minutes.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button hero-fs-btn-gold" href="/quote">
              Start Inquiry
            </Link>
            <Link className="button hero-fs-btn-glass" href="/process">
              5-Stage Process
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
