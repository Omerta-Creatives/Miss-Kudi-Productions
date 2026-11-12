import Link from "next/link";
import { facilityHighlights } from "../data";

const PUBLIC_CRAFT_LEADS = [
  {
    role: "Production & Client Strategy",
    name: "Kudi Lasisi",
    facility: "Surulere Manufacturing Hub, 1 Alawode St",
    focus:
      "End-to-end floor capacity planning, private-label collection scheduling and international brand partnerships.",
    metric: "99.6% On-Time Dispatch",
  },
  {
    role: "CAD Pattern & Grading Studio",
    name: "Pattern & Grading Division",
    facility: "CAD Pattern & Sample Studio, Surulere",
    focus:
      "CAD master block drafting, couture draping, first-fit toile development and XS to XXL size grading.",
    metric: "99.4% Fit Approval",
  },
  {
    role: "Master Cutting & Marker Studio",
    name: "Bulk Lay & Marker Division",
    facility: "Cutting & Marker Floor, Surulere",
    focus:
      "24-hour fabric relaxation, zero-waste marker nesting, shade-lot bundling and precision multi-ply cutting.",
    metric: "94.8% Marker Yield",
  },
  {
    role: "Master Tailoring & Sewing Lines",
    name: "Industrial Cut-and-Sew Division",
    facility: "Bulk Cut-and-Sew Floor, Surulere",
    focus:
      "Balanced industrial lockstitch, French-seam resortwear, heavyweight streetwear and structured outerwear lines.",
    metric: "98.9% Inline Pass Rate",
  },
  {
    role: "AQL 2.5 Quality Assurance Bay",
    name: "Quality Inspection & Finishing Team",
    facility: "AQL 2.5 QC & Finishing Bay, Surulere",
    focus:
      "36-point garment measurement verification, seam tensile testing, steam finishing and export carton sign-off.",
    metric: "AQL 2.5 Verified",
  },
  {
    role: "Private-Label & Merchandising Desk",
    name: "Brand Onboarding & Sampling Desk",
    facility: "Client Merchandising Desk, Surulere",
    focus:
      "Tech-pack onboarding, trim & woven label sourcing, and pre-production sample approvals for fashion labels.",
    metric: "7 to 14 Day Sample Lead",
  },
];

export default function About() {
  const [flagshipPlant, ...secondaryPlants] = facilityHighlights;

  return (
    <main>
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
              <h1 className="hero-fs-title">
                Built for brands.
                <br />
                Scaled in Surulere.
              </h1>

              <p className="hero-fs-description">
                Fashion patternmaking and industrial garment manufacturing under one roof in Surulere, Lagos.
              </p>

              <div className="hero-fs-badges" style={{ marginBottom: 20 }}>
                <span className="hero-fs-chip-primary mono">
                  About Miss Kudi Productions
                </span>
                <span className="hero-fs-chip-outline mono">
                  Est. 2018, Surulere, Lagos
                </span>
              </div>

              <div className="hero-fs-actions">
                <Link className="button hero-fs-btn-gold" href="/quote">
                  Request Quote
                </Link>
                <Link className="button hero-fs-btn-glass" href="/services">
                  Explore Capabilities
                </Link>
              </div>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>Surulere facility output</span>
                <span>1 Alawode St</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">Monthly capacity</span>
                  <strong className="mono">35,500+ Pcs</strong>
                  <small>1 Alawode Street, Surulere</small>
                </div>
                <div>
                  <span className="mono">Industrial machines</span>
                  <strong className="mono">92+ Stations</strong>
                  <small>Lockstitch, Overlock &amp; Steam</small>
                </div>
                <div>
                  <span className="mono">Quality benchmark</span>
                  <strong className="mono">99.4% Yield</strong>
                  <small>AQL 2.5 36-Point Audit</small>
                </div>
              </div>
              <a href="#philosophy" className="marketing-stage-scroll mono">
                <span>Explore facility &amp; teams</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="philosophy"
        className="section-wrap"
        style={{ paddingTop: 84, paddingBottom: 84 }}
      >
        <div className="section-heading">
          <div>
            <h2>
              Where pattern precision meets
              <br />
              disciplined floor execution.
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
              <h3>Digital CAD Blocks &amp; Marker Efficiency</h3>
              <span className="ticket-label mono">01: Pattern &amp; grading studio</span>
              <p>
                Our Surulere pattern designers draft master blocks, grade across XS to XXL size
                ratios, and nest markers to achieve 94%+ fabric utilization.
              </p>
            </figcaption>
          </figure>

          <figure className="about-triptych-card">
            <img
              src="/images/sewing-production-line.jpg"
              alt="Master tailors operating industrial sewing machines in Surulere, Lagos"
              width={600}
              height={420}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <h3>Balanced Cut-and-Sew Production</h3>
              <span className="ticket-label mono">02: Industrial sewing lines</span>
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
              <h3>36-Point Inspection &amp; Export Finishing</h3>
              <span className="ticket-label mono">03: AQL 2.5 quality &amp; dispatch</span>
              <p>
                Every garment is measured against approved point-of-measure (POM) tolerances,
                vacuum-steam pressed, tagged, and packed with a printable AQL 2.5 QC Passport.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        className="section-wrap mkp-surface-stone"
        style={{ paddingTop: 84, paddingBottom: 84 }}
      >
        <div className="section-heading">
          <div>
            <h2>
              Three specialized divisions at
              <br />
              1 Alawode Street, Surulere.
            </h2>
          </div>
          <p>
            35,500+ units monthly capacity under one roof in Surulere, Lagos, with dedicated power
            redundancy and climate-controlled fabric stores.
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

      <section className="section-wrap" style={{ paddingTop: 84, paddingBottom: 96 }}>
        <div className="section-heading">
          <div>
            <h2>
              Specialist leads assigned to
              <br />
              every client production run.
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
              <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{member.name}</h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: "wrap",
                }}
              >
                <span className="mkp-badge mkp-badge-olive">{member.role}</span>
                <span className="mono mkp-muted-text" style={{ fontSize: 11 }}>
                  {member.metric}
                </span>
              </div>
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
            <h3>Ready to schedule your collection on our Surulere lines?</h3>
            <p>
              Configure your garment category, unit volume, and XS to XXL grading ratio in our Quote
              Studio for an instant pro-forma estimate.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button hero-fs-btn-gold" href="/quote">
              Open Quote Studio
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
