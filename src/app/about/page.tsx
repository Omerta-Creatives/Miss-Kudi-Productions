import Link from "next/link";
import { facilityHighlights } from "../data";

const PUBLIC_CRAFT_LEADS = [
  {
    role: "Production & Client Strategy",
    name: "Kudi Lasisi",
    facility: "Yaba Flagship Production Plant",
    focus:
      "Multi-facility capacity planning, private-label collection scheduling and international brand partnerships.",
    metric: "99.6% On-Time Dispatch",
  },
  {
    role: "CAD Pattern & Grading Studio",
    name: "Pattern & Grading Division",
    facility: "Victoria Island Pattern & Sample Atelier",
    focus:
      "CAD master block drafting, couture draping, first-fit toile development and XS–XXL size grading.",
    metric: "99.4% Fit Approval",
  },
  {
    role: "Master Cutting & Marker Studio",
    name: "Bulk Lay & Marker Division",
    facility: "Yaba Flagship Production Plant",
    focus:
      "24-hour fabric relaxation, zero-waste marker nesting, shade-lot bundling and precision multi-ply cutting.",
    metric: "94.8% Marker Yield",
  },
  {
    role: "Master Tailoring & Sewing Lines",
    name: "Industrial Cut-and-Sew Division",
    facility: "Yaba Flagship Production Plant",
    focus:
      "Balanced industrial lockstitch, French-seam resortwear, heavyweight streetwear and structured outerwear lines.",
    metric: "98.9% Inline Pass Rate",
  },
  {
    role: "AQL 2.5 Quality Assurance Bay",
    name: "Quality Inspection & Finishing Team",
    facility: "Ikeja Workwear & Export Finishing Depot",
    focus:
      "36-point garment measurement verification, seam tensile testing, steam finishing and export carton sign-off.",
    metric: "AQL 2.5 Certified",
  },
  {
    role: "Private-Label & Merchandising Desk",
    name: "Brand Onboarding & Sampling Desk",
    facility: "Victoria Island Pattern & Sample Atelier",
    focus:
      "Tech-pack onboarding, trim & woven label sourcing, and pre-production sample approvals for fashion labels.",
    metric: "7–14 Day Sample Lead",
  },
];

export default function About() {
  const [flagshipPlant, ...secondaryPlants] = facilityHighlights;

  return (
    <main>
      {/* Architectural Dark-Olive Editorial Hero Stage */}
      <section className="marketing-stage-hero">
        <img
          src="/images/hero-lagos-atelier.jpg"
          alt="Miss Kudi Productions flagship Lagos garment atelier with pattern tables and master tailors"
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
                  01 / ABOUT MISS KUDI PRODUCTIONS
                </span>
                <span className="hero-fs-chip-outline mono">
                  EST. 2018 · LAGOS, NIGERIA
                </span>
              </div>

              <h1 className="hero-fs-title">
                Built for brands.
                <br />
                <em>Engineered for scale in Lagos.</em>
              </h1>

              <p className="hero-fs-description">
                Miss Kudi Productions bridges artisanal fashion craftsmanship with industrial B2B
                garment manufacturing across three specialized Lagos production facilities — giving
                emerging and established labels predictable quality at scale.
              </p>

              <div className="hero-fs-actions">
                <Link className="button hero-fs-btn-gold" href="/quote">
                  Request Production Quote <span>↗</span>
                </Link>
                <Link className="button hero-fs-btn-glass" href="/services">
                  Explore Capabilities <span>→</span>
                </Link>
              </div>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>MULTI-PLANT NETWORK TELEMETRY</span>
                <span>3 FACILITIES</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">MONTHLY CAPACITY</span>
                  <strong className="mono">35,500+ Pcs</strong>
                  <small>Yaba · Victoria Island · Ikeja</small>
                </div>
                <div>
                  <span className="mono">INDUSTRIAL MACHINES</span>
                  <strong className="mono">92+ Stations</strong>
                  <small>Lockstitch, Overlock &amp; Steam</small>
                </div>
                <div>
                  <span className="mono">QUALITY BENCHMARK</span>
                  <strong className="mono">99.4% Yield</strong>
                  <small>ISO / AQL 2.5 36-Point Audit</small>
                </div>
              </div>
              <a href="#philosophy" className="marketing-stage-scroll mono">
                <span>EXPLORE OUR FACILITIES &amp; TEAMS</span>
                <span>↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Craftsmanship & Story Triptych */}
      <section
        id="philosophy"
        className="section-wrap"
        style={{ paddingTop: 84, paddingBottom: 84 }}
      >
        <div className="section-heading">
          <div>
            <div className="section-kicker mono">01 / OUR MANUFACTURING PHILOSOPHY</div>
            <h2>
              Where pattern precision meets
              <br />
              <em>disciplined floor execution.</em>
            </h2>
          </div>
          <p>
            Every run is governed by graded measurement tolerances, balanced sewing lines and AQL
            2.5 quality audits.
          </p>
        </div>

        <div className="about-triptych-grid">
          <figure className="about-triptych-card">
            <img
              src="/images/pattern-cutting-studio.jpg"
              alt="Pattern designer inspecting graded CAD garment blocks and fabric bolts"
              width={600}
              height={420}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span className="ticket-label mono">01 · PATTERN &amp; GRADING STUDIO</span>
              <h3>Digital CAD Blocks &amp; Marker Efficiency</h3>
              <p>
                Our Victoria Island and Yaba pattern designers draft master blocks, grade across
                XS–XXL size ratios, and nest markers to achieve 94%+ fabric utilization.
              </p>
            </figcaption>
          </figure>

          <figure className="about-triptych-card">
            <img
              src="/images/sewing-production-line.jpg"
              alt="Master tailors operating industrial sewing machines in Lagos"
              width={600}
              height={420}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span className="ticket-label mono">02 · INDUSTRIAL SEWING LINES</span>
              <h3>Balanced Cut-and-Sew Production</h3>
              <p>
                92+ industrial lockstitch, 5-thread overlock, coverstitch and buttonhole machines
                configured in modular lines for woven tailoring, jersey streetwear and resortwear.
              </p>
            </figcaption>
          </figure>

          <figure className="about-triptych-card">
            <img
              src="/images/qc-finishing-bay.jpg"
              alt="Quality control inspector measuring tailored olive jacket on dress form"
              width={600}
              height={420}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span className="ticket-label mono">03 · AQL 2.5 QUALITY &amp; DISPATCH</span>
              <h3>36-Point Inspection &amp; Export Finishing</h3>
              <p>
                Every garment is measured against approved point-of-measure (POM) tolerances,
                vacuum-steam pressed, tagged, and packed with a printable AQL 2.5 QC Passport.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Three Lagos Facilities — Asymmetrical Flagship Spotlight */}
      <section
        className="section-wrap"
        style={{ paddingTop: 84, paddingBottom: 84, background: "#ebe6dd" }}
      >
        <div className="section-heading">
          <div>
            <div className="section-kicker mono">02 / OUR THREE LAGOS PLANTS</div>
            <h2>
              Purpose-built facilities across
              <br />
              <em>Yaba, Victoria Island &amp; Ikeja.</em>
            </h2>
          </div>
          <p>
            Combined capacity of 35,500+ units per month with dedicated power redundancy and
            climate-controlled fabric stores.
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
                  <span className="facility-location mono">{plant.location}</span>
                  <h3>{plant.name}</h3>
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

      {/* Craftsmanship Department Leads */}
      <section className="section-wrap" style={{ paddingTop: 84, paddingBottom: 96 }}>
        <div className="section-heading">
          <div>
            <div className="section-kicker mono">03 / CRAFTSMANSHIP DEPARTMENT LEADS</div>
            <h2>
              Specialist leads assigned to
              <br />
              <em>every client production run.</em>
            </h2>
          </div>
          <p>
            Every brand order is paired with a dedicated Pattern Designer, Cutting Master, Sewing
            Line Lead and Quality Control Inspector.
          </p>
        </div>

        <div className="artisan-leadership-grid">
          {PUBLIC_CRAFT_LEADS.map((member) => (
            <article key={member.name} className="artisan-leader-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <span className="mkp-badge mkp-badge-olive">{member.role}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {member.metric}
                </span>
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>{member.name}</h3>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--ink)",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {member.facility}
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--muted)",
                  margin: 0,
                  lineHeight: 1.65,
                }}
              >
                {member.focus}
              </p>
            </article>
          ))}
        </div>

        <div className="marketing-bottom-cta-banner">
          <div>
            <span className="section-kicker mono" style={{ color: "#d4af37" }}>
              PARTNER WITH MISS KUDI PRODUCTIONS
            </span>
            <h3>Ready to schedule your collection on our Lagos lines?</h3>
            <p>
              Configure your garment category, unit volume, and XS–XXL grading ratio in our Quote
              Studio for an instant pro-forma estimate.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button hero-fs-btn-gold" href="/quote">
              Open Production Quote Studio <span>↗</span>
            </Link>
            <Link className="button hero-fs-btn-glass" href="/process">
              Inspect 5-Stage Process <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
