import Link from "next/link";
import { processStages } from "../data";
import { UiIcon } from "../components/UiIcon";

export default function Process() {
  return (
    <main>
      <section className="marketing-stage-hero">
        <img
          src="/images/pattern-cutting-studio.jpg"
          alt="Pattern designer and cutting master inspecting graded CAD garment blueprints and fabric bolts"
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
                From your brief
                <br />
                to bulk production.
              </h1>

              <p className="hero-fs-description">
                Five quality-gated stages from pattern studio and cutting tables to AQL finishing.
              </p>

              <div className="hero-fs-badges" style={{ marginBottom: 20 }}>
                <span className="hero-fs-chip-primary mono">
                  How we work: 5-stage pipeline
                </span>
                <span className="hero-fs-chip-outline mono">
                  Quality-gated milestones
                </span>
              </div>

              <div className="hero-fs-actions">
                <Link className="button hero-fs-btn-gold" href="/quote">
                  Start Stage 01
                </Link>
                <Link className="button hero-fs-btn-glass" href="/size-charts">
                  Size Calculator
                </Link>
              </div>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>Five-stage floor timeline</span>
                <span>3 to 5 weeks total</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">Stages 01 to 02</span>
                  <strong className="mono">Days 1 to 7</strong>
                  <small>Brief Intake, CAD Pattern &amp; Costing</small>
                </div>
                <div>
                  <span className="mono">Stage 03</span>
                  <strong className="mono">Week 2</strong>
                  <small>PPS Sign-Off &amp; Multi-Ply Cutting</small>
                </div>
                <div>
                  <span className="mono">Stages 04 to 05</span>
                  <strong className="mono">Weeks 3 to 5</strong>
                  <small>Bulk Sewing, AQL 2.5 QC &amp; Dispatch</small>
                </div>
              </div>
              <a href="#stage-01" className="marketing-stage-scroll mono">
                <span>Jump to stage-by-stage journey</span>
              </a>
            </div>
          </div>

          <nav className="process-jump-ribbon" aria-label="Jump to production stage">
            {processStages.map((stage) => (
              <a
                key={stage.number}
                href={`#stage-${stage.number}`}
                className="process-jump-pill mono"
              >
                <span>Stage {stage.number}</span>
                <strong>{stage.title}</strong>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="section-wrap" style={{ paddingTop: 84, paddingBottom: 96 }}>
        <div className="section-heading">
          <div>
            <h2>
              Transparent milestones at
              <br />
              every station on the floor.
            </h2>
          </div>
          <p>
            Each stage is signed off by a dedicated specialist before your order advances to the
            next station.
          </p>
        </div>

        <div className="process-journey-timeline">
          {processStages.map((stage, idx) => (
            <article
              key={stage.number}
              id={`stage-${stage.number}`}
              className="process-stage-card"
            >
              <div className="process-stage-copy">
                <h3 style={{ fontSize: "clamp(20px, 2.2vw, 25px)", margin: "0 0 10px" }}>
                  {stage.number}. {stage.title}
                </h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <span className="mkp-badge mkp-badge-olive">{stage.stageCode}</span>
                  <span
                    className="mono"
                    style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)" }}
                  >
                    <UiIcon name="clock" size={14} /> {stage.duration}
                  </span>
                </div>
                <div
                  className="mkp-muted-text"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  Lead Station: {stage.leadRole}
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.8,
                    color: "var(--text-secondary)",
                    marginBottom: 16,
                  }}
                >
                  {stage.copy}
                </p>
                <div className="ticket-label" style={{ marginBottom: 8 }}>
                  Mandatory stage deliverables &amp; QC gates
                </div>
                <ul className="service-deliverables-list">
                  {stage.checkpoints.map((cp) => (
                    <li key={cp}>{cp}</li>
                  ))}
                </ul>
              </div>

              <figure className="process-stage-figure">
                <img
                  src={stage.image}
                  alt={stage.alt}
                  width={640}
                  height={440}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
                <figcaption className="image-caption">
                  <span>{stage.stageCode}</span>
                  <span className="mono">{stage.duration}</span>
                </figcaption>
              </figure>
            </article>
          ))}
        </div>

        <div className="marketing-bottom-cta-banner">
          <div>
            <h3>Generate your instant Job Code &amp; Pro-Forma Quote.</h3>
            <p>
              Includes live MOQ volume discounts, fabric consumption yardage and a printable
              Factory Job Ticket.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button hero-fs-btn-gold" href="/quote">
              Configure Quote
            </Link>
            <Link className="button hero-fs-btn-glass" href="/size-charts">
              Size Calculator
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
