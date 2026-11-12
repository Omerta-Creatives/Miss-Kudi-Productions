import Link from "next/link";
import {
  facilityHighlights,
  garmentCategories,
  productionFaqs,
  services,
  steps,
} from "./data";
import AnimatedHero from "./components/AnimatedHero";

export default function Home() {
  const [flagshipPlant, ...secondaryPlants] = facilityHighlights;

  return (
    <main>
      <AnimatedHero />

      <section className="intro section-wrap" id="about">
        <div className="taste-manifesto-grid">
          <div className="taste-manifesto-index">
            <span className="taste-index-rule" />
            <span className="mono mkp-muted-text" style={{ fontSize: 12 }}>
              Surulere, Lagos, est. 2018
            </span>
          </div>

          <div className="taste-manifesto-statement">
            <h2>
              Built for brands.
              <br />
              Ready for the next run.
            </h2>
            <div className="taste-hairline-ledger" style={{ marginTop: 32 }}>
              <div className="taste-ledger-cell">
                <span className="ticket-label">Monthly capacity</span>
                <strong className="mono">35,500+ Pcs</strong>
                <small>1 Alawode St, Surulere hub</small>
              </div>
              <div className="taste-ledger-cell">
                <span className="ticket-label">Quality benchmark</span>
                <strong className="mono">99.4% Yield</strong>
                <small>AQL 2.5 36-point inspection</small>
              </div>
              <div className="taste-ledger-cell">
                <span className="ticket-label">MOQ flexibility</span>
                <strong className="mono">50 to 5,000+</strong>
                <small>Units per style (XS to XXL)</small>
              </div>
            </div>
          </div>

          <div className="intro-body">
            <p>
              Miss Kudi Productions is an industrial garment manufacturing partner at 1 Alawode
              Street, Surulere, Lagos, Nigeria, built for emerging and established fashion labels
              that demand consistent stitching, accurate grading, and predictable delivery windows.
            </p>
            <p>
              Every production order is assigned a dedicated{" "}
              <strong>Pattern Designer</strong>, <strong>Cutting Master</strong>,{" "}
              <strong>Master Tailor Lead</strong>, and{" "}
              <strong>Quality Control Inspector</strong>, with a printable Production Job Ticket
              generated at intake.
            </p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 12 }}>
              <Link className="underlined-link" href="/about">
                Explore Surulere Facility
              </Link>
              <Link className="underlined-link" href="/quote">
                Calculate MOQ Quote
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="capabilities section-wrap" id="capabilities">
        <div className="section-heading">
          <div>
            <h2>
              Manufacturing that
              <br />
              moves your brand forward.
            </h2>
          </div>
          <p>
            End-to-end garment production shaped around your technical packs, fabric
            specifications and retail launch calendar.
          </p>
        </div>

        <div className="taste-bento-grid">
          {services.map((service, index) => {
            const isWide = index === 0 || index === 3;
            return (
              <article
                className={`taste-bento-card ${isWide ? "bento-span-7 bento-horizontal" : "bento-span-5"}`}
                key={service.number}
              >
                <figure className="taste-bento-figure">
                  <img
                    src={service.image}
                    alt={service.alt}
                    width={640}
                    height={460}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    loading={index === 0 ? "eager" : "lazy"}
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

        <div
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <p className="capability-note" style={{ margin: 0 }}>
            Service scope, minimum quantities and timelines are confirmed for each garment and
            order.
          </p>
          <Link href="/services" className="button button-dark">
            Explore Capabilities
          </Link>
        </div>
      </section>

      <section className="section-wrap" style={{ paddingTop: 92, paddingBottom: 92 }}>
        <div className="section-heading">
          <div>
            <h2>
              Engineered for every
              <br />
              silhouette &amp; fabric weight.
            </h2>
          </div>
          <p>
            From 480 GSM heavyweight streetwear fleece to delicate bias-cut silk resortwear and
            structured suiting.
          </p>
        </div>

        <div className="taste-spec-index-ledger">
          {garmentCategories.map((cat, idx) => (
            <article key={cat.title} className="taste-spec-row">
              <span className="taste-spec-num mono">Item 0{idx + 1}</span>
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
      </section>

      <section className="process-section" id="process">
        <div className="process-inner section-wrap">
          <div className="process-heading">
            <h2>
              From your brief
              <br />
              to bulk production.
            </h2>
            <p>
              A transparent 5-stage pipeline connects our Pattern Studio, Cutting Tables, Sewing
              Lines and Quality Control Bays with milestone sign-offs for your brand.
            </p>
          </div>
          <div className="taste-blueprint-steps">
            {steps.map(([number, title, copy]) => (
              <article className="taste-blueprint-step" key={number}>
                <h3>{title}</h3>
                <div className="taste-blueprint-top mono">
                  <span>Stage {number}</span>
                  <span>AQL 2.5 gate</span>
                </div>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: 42, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link className="button button-light" href="/process">
              5-Stage Workflow
            </Link>
            <Link className="button button-dark" href="/quote">
              Configure Quote
            </Link>
          </div>
        </div>
      </section>

      <section
        className="section-wrap mkp-surface-warm"
        style={{ paddingTop: 92, paddingBottom: 92 }}
      >
        <div className="section-heading">
          <div>
            <h2>
              Three specialized divisions.
              <br />
              Under one roof in Surulere.
            </h2>
          </div>
          <p>
            Integrated pattern development, bulk cut-and-sew lines and AQL 2.5 export finishing at
            1 Alawode Street, Surulere, Lagos.
          </p>
        </div>

        <div className="taste-plant-spotlight-grid">
          <article className="taste-plant-flagship">
            <figure className="taste-plant-flagship-figure">
              <img
                src={flagshipPlant.image}
                alt={flagshipPlant.alt}
                width={840}
                height={520}
                loading="lazy"
                decoding="async"
              />
              <span className="facility-code-badge mono">{flagshipPlant.code}</span>
            </figure>
            <div className="taste-plant-flagship-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h3>{flagshipPlant.name}</h3>
                <span className="facility-location mono">{flagshipPlant.location}</span>
              </div>
              <p>{flagshipPlant.focus}</p>
              <div className="facility-metrics-row mono">
                <span>{flagshipPlant.machines}</span>
                <strong>{flagshipPlant.monthlyCapacity}</strong>
              </div>
            </div>
          </article>

          <div className="taste-plant-secondary-stack">
            {secondaryPlants.map((plant) => (
              <article key={plant.code} className="taste-plant-secondary-card">
                <figure className="taste-plant-secondary-figure">
                  <img
                    src={plant.image}
                    alt={plant.alt}
                    width={420}
                    height={300}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="facility-code-badge mono">{plant.code}</span>
                </figure>
                <div className="taste-plant-secondary-body">
                  <h3>{plant.name}</h3>
                  <span className="facility-location mono">{plant.location}</span>
                  <p>{plant.focus}</p>
                  <div className="facility-metrics-row mono">
                    <span>{plant.machines}</span>
                    <strong>{plant.monthlyCapacity}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wrap home-conversion-section">
        <div className="home-conversion-grid">
          <div className="home-faq-column">
            <h2 style={{ marginTop: 0, marginBottom: 14 }}>
              Questions before your
              <br />
              production run.
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 13.5,
                lineHeight: 1.8,
                marginBottom: 24,
              }}
            >
              Whether you are producing a 50-piece debut capsule or a 5,000-unit retail restock,
              our merchandising and pattern studios guide every step.
            </p>

            <div className="faq-accordion-stack">
              {productionFaqs.map((faq, idx) => (
                <details
                  key={faq.question}
                  name="home-production-faq"
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

          <aside className="home-quote-cta-card" aria-label="Start a Production Quote">
            <figure className="home-quote-cta-figure">
              <img
                src="/images/lagos-atelier-lookbook.jpg"
                alt="Surulere fashion atelier showroom with olive linen blazers and resortwear on brass rail"
                width={720}
                height={420}
                loading="lazy"
                decoding="async"
              />
              <div className="home-quote-cta-badges mono">
                <span>Instant pro-forma quote</span>
                <span>MOQ 50 to 5,000+ pcs</span>
              </div>
            </figure>

            <div className="home-quote-cta-body">
              <h3>Ready to cost your collection &amp; generate a Job Ticket?</h3>
              <p>
                Use our interactive Quote Calculator to configure your garment category, exact unit
                volume, and XS to XXL size breakdown. Receive an instant pro-forma estimate, fabric
                yardage requirement, and printable Factory Job Ticket.
              </p>

              <div className="home-quote-cta-perks mono">
                <div>
                  <span>Volume discounts</span>
                  <strong>3% to 18% B2B Tier</strong>
                </div>
                <div>
                  <span>Turnaround</span>
                  <strong>3 to 5 Weeks</strong>
                </div>
                <div>
                  <span>Quality standard</span>
                  <strong>AQL 2.5 Verified</strong>
                </div>
              </div>

              <div className="home-quote-cta-actions">
                <Link className="button button-dark" href="/quote">
                  Open Quote Studio
                </Link>
                <Link className="button button-light" href="/size-charts">
                  Size Calculator
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
