export interface ServiceItem {
  number: string;
  title: string;
  subtitle: string;
  copy: string;
  moqLabel: string;
  leadTimeLabel: string;
  artisanRole: string;
  deliverables: string[];
  image: string;
  alt: string;
}

export const services: ServiceItem[] = [
  {
    number: "01",
    title: "Bulk garment production",
    subtitle: "Industrial Cut-and-Sew Lines, 50 to 5,000+ Units",
    copy: "Full-run manufacturing engineered around your approved tech packs, graded patterns, size ratios and delivery calendar across our 92+ industrial Juki & Brother sewing stations.",
    moqLabel: "MOQ: 50 to 5,000+ pcs",
    leadTimeLabel: "3 to 6 Weeks Turnaround",
    artisanRole: "Master Tailor Lead & Line Supervisors",
    deliverables: [
      "Balanced sewing line allocation by garment operation",
      "In-line seam tolerance & stitch-per-inch (SPI) inspection",
      "Real-time batch tracking via Job Code in Order Tracker",
    ],
    image: "/images/sewing-production-line.jpg",
    alt: "Nigerian master tailors operating industrial lockstitch sewing machines in Lagos garment factory floor",
  },
  {
    number: "02",
    title: "Private-label manufacturing",
    subtitle: "Retail-Ready Branding, Woven Labels & Trim Sourcing",
    copy: "Turnkey garments prepared for direct retail or e-commerce launches under your label. Every unit includes custom woven neck labels, care tags, branded hardware and polybag barcoding.",
    moqLabel: "MOQ: 100 pcs per style",
    leadTimeLabel: "4 to 6 Weeks Turnaround",
    artisanRole: "Trim Procurement & Finishing Specialists",
    deliverables: [
      "Custom woven damask neck labels, satin care labels & swing tags",
      "YKK zippers, horn/corozo buttons & custom-dyed drawcords",
      "Retail steam pressing, folding & size-stickered packaging",
    ],
    image: "/images/private-label-finishing.jpg",
    alt: "Macro flat-lay of custom woven Miss Kudi damask neck labels, corozo buttons, spec tags and folded olive and ecru textiles",
  },
  {
    number: "03",
    title: "Pattern-led development & grading",
    subtitle: "CAD Pattern Drafting, Toiles & XS to XXL Size Grading",
    copy: "Precision pattern engineering in our Surulere CAD Pattern Studio. We translate sketches, physical reference garments or digital tech packs into production-ready graded blocks.",
    moqLabel: "1st Fit Sample + Graded Run",
    leadTimeLabel: "7 to 14 Days Sample Lead",
    artisanRole: "Senior Pattern Designers & Cutting Masters",
    deliverables: [
      "Digital CAD pattern drafting & XS to XXL nest grading",
      "Calico toile / first fit sample with revision round",
      "Zero-waste marker nesting for optimal fabric yield per meter",
    ],
    image: "/images/pattern-cutting-studio.jpg",
    alt: "Nigerian pattern designer inspecting graded CAD garment blocks, brass pattern weights and fabric bolts",
  },
  {
    number: "04",
    title: "AQL 2.5 quality control & export finishing",
    subtitle: "36-Point Measurement Audit & International Dispatch",
    copy: "Every production batch undergoes a strict AQL 2.5 quality inspection against your graded spec sheet before industrial steam finishing, carton packing and local or DHL Air Cargo dispatch.",
    moqLabel: "100% Batch Audit Coverage",
    leadTimeLabel: "48-Hour Final QC Sign-Off",
    artisanRole: "AQL 2.5 Quality Control Inspectors",
    deliverables: [
      "Point-of-measure (POM) verification across XS to XXL size runs",
      "Seam tensile strength, colorfastness & needle-detection checks",
      "Printable AQL 2.5 QC Passport & export carton manifest",
    ],
    image: "/images/qc-finishing-bay.jpg",
    alt: "Quality control inspector measuring a tailored olive blazer on a dress form in the Lagos finishing bay",
  },
];

export interface ProcessStageDetail {
  number: string;
  stageCode: string;
  title: string;
  leadRole: string;
  duration: string;
  copy: string;
  checkpoints: string[];
  image: string;
  alt: string;
}

export const processStages: ProcessStageDetail[] = [
  {
    number: "01",
    stageCode: "Stage 01: Brief & spec intake",
    title: "Share your brief & size ratio",
    leadRole: "Production Manager & Merchandising Desk",
    duration: "Day 1 to 2",
    copy: "Submit your garment category, target volume, XS to XXL size breakdown and technical specifications via our live Quote Calculator. You receive an instant Job Code and pro-forma cost breakdown.",
    checkpoints: [
      "Instant Job Code generation (e.g. MKP-20261025-841)",
      "Bill of Materials (BOM) & fabric consumption calculation",
      "Volume tier discount lock-in (up to 18% B2B efficiency)",
    ],
    image: "/images/hero-lagos-atelier.jpg",
    alt: "Master tailors and pattern designers reviewing garment tech packs and fabric swatches on timber studio desk",
  },
  {
    number: "02",
    stageCode: "Stage 02: Pattern studio & quotation",
    title: "CAD pattern drafting & costing sign-off",
    leadRole: "Senior Pattern Designer (Surulere Pattern Studio)",
    duration: "Day 3 to 7",
    copy: "Our Pattern Designers draft or validate your master block, grade across XS to XXL sizes, and compute exact marker efficiency so you never overpay for fabric yardage.",
    checkpoints: [
      "Graded measurement spec sheet (inches & cm)",
      "Marker yield optimization (94%+ fabric utilization)",
      "Formal Production Contract & deposit confirmation",
    ],
    image: "/images/pattern-cutting-studio.jpg",
    alt: "Nigerian pattern designer inspecting graded CAD garment patterns and fabric bolts",
  },
  {
    number: "03",
    stageCode: "Stage 03: Pre-production sample & cutting",
    title: "Pre-production approval & precision cutting",
    leadRole: "Cutting Master & Sample Room Lead",
    duration: "Week 2",
    copy: "Once your Pre-Production Sample (PPS) is signed off, our Cutting Masters relax fabric rolls for 24 hours, lay multi-ply stacks, and cut precision bundles tagged by size and shade lot.",
    checkpoints: [
      "24-hour fabric relaxation & shrinkage test",
      "Shade-lot bundling & numbered cut-ticket tagging",
      "100% cut-panel inspection before sewing line entry",
    ],
    image: "/images/private-label-finishing.jpg",
    alt: "Custom woven damask labels, corozo buttons, spec tags and cut textile stacks",
  },
  {
    number: "04",
    stageCode: "Stage 04: Sewing lines & AQL 2.5 QC",
    title: "Bulk sewing & multi-point quality checks",
    leadRole: "Master Tailor Lead & QC Inspector",
    duration: "Week 3 to 4",
    copy: "Garments flow through specialized industrial lockstitch, 5-thread overlock, coverstitch and buttonhole stations while AQL 2.5 QC Inspectors audit units at inline and end-of-line checkpoints.",
    checkpoints: [
      "Dedicated sewing line balanced to your garment type",
      "Live sewn & QC-passed unit counters on Order Tracker",
      "36-point measurement & seam integrity verification",
    ],
    image: "/images/sewing-production-line.jpg",
    alt: "Nigerian master tailors operating industrial sewing machines in the Lagos factory",
  },
  {
    number: "05",
    stageCode: "Stage 05: Finishing & global dispatch",
    title: "Steam finishing, packing & dispatch",
    leadRole: "Finishing & Export Logistics Lead",
    duration: "Week 4 to 5",
    copy: "Approved garments are thread-trimmed, vacuum-steam pressed, tagged with your brand's barcode labels, folded into export-grade cartons, and dispatched across Nigeria or internationally.",
    checkpoints: [
      "Industrial vacuum-table steam pressing & final spotting",
      "Size-ratio carton packing list & AQL 2.5 QC Passport",
      "Lagos courier delivery or international air freight",
    ],
    image: "/images/qc-finishing-bay.jpg",
    alt: "Quality control inspector verifying tailored blazer on dress form before dispatch",
  },
];

export const steps: [string, string, string][] = processStages.map((s) => [
  s.number,
  s.title,
  s.copy,
]);

export interface GarmentCategoryCard {
  title: string;
  tag: string;
  gsmRange: string;
  moq: string;
  description: string;
  image: string;
  alt: string;
}

export const garmentCategories: GarmentCategoryCard[] = [
  {
    title: "Heavyweight Streetwear & Jersey",
    tag: "Hoodies, tees, sweatshirts",
    gsmRange: "240 to 480 GSM Cotton Fleece & Combed Jersey",
    moq: "50 pcs / style",
    description:
      "Drop-shoulder boxy tees, French terry hoodies, twin-needle coverstitch hems, puff/screen print and high-density embroidery.",
    image: "/images/sewing-production-line.jpg",
    alt: "Heavyweight cotton streetwear t-shirts and hoodies on studio sewing floor",
  },
  {
    title: "Structured Woven Tailoring & Outerwear",
    tag: "Blazers, trousers, trenches",
    gsmRange: "220 to 380 GSM Gabardine, Linen & Wool Blends",
    moq: "50 pcs / style",
    description:
      "Half-canvas and fusible interlining blazers, pleated wide-leg trousers, welt pockets, horn buttons and full cupro/satin linings.",
    image: "/images/qc-finishing-bay.jpg",
    alt: "Tailored structured blazer and menswear suiting craftsmanship in finishing bay",
  },
  {
    title: "Luxury Resortwear & Contemporary Womenswear",
    tag: "Dresses, co-ords, silk sets",
    gsmRange: "90 to 210 GSM Silk Crepe, Viscose, Adire & Linen",
    moq: "50 pcs / style",
    description:
      "French-seamed resort shirts, bias-cut midi dresses, concealed zip closures, baby-locked ruffles and hand-finished artisanal details.",
    image: "/images/lagos-atelier-lookbook.jpg",
    alt: "Contemporary womenswear dresses and resortwear garments on brass atelier rack",
  },
  {
    title: "Corporate Uniforms, Workwear & Denim",
    tag: "Uniforms, cargo, heavy twill",
    gsmRange: "260 to 420 GSM Bull Denim, Ripstop & Poly-Cotton Twill",
    moq: "100 pcs / style",
    description:
      "Bar-tacked stress points, triple-stitched felled seams, industrial hospitality/medical uniforms and custom brass/nickel hardware.",
    image: "/images/private-label-finishing.jpg",
    alt: "Heavyweight denim and utility workwear trims with reinforced stitching",
  },
];

export interface FacilityHighlight {
  code: string;
  name: string;
  location: string;
  focus: string;
  machines: string;
  monthlyCapacity: string;
  image: string;
  alt: string;
}

export const facilityHighlights: FacilityHighlight[] = [
  {
    code: "Division 01: Bulk sewing floor",
    name: "Surulere Cut-and-Sew Production Floor",
    location: "1 Alawode Street, Surulere, Lagos",
    focus: "High-Volume Cut-and-Sew, Knitwear, Streetwear & Structured Tailoring Lines",
    machines: "48 Industrial Sewing & Cutting Stations",
    monthlyCapacity: "18,000+ Units / Month",
    image: "/images/sewing-production-line.jpg",
    alt: "Surulere production floor with Nigerian master tailors at industrial sewing stations",
  },
  {
    code: "Division 02: Pattern & sample studio",
    name: "CAD Pattern, Grading & Sample Atelier",
    location: "1 Alawode Street, Surulere, Lagos",
    focus: "CAD Pattern Drafting, First Fit Samples, Luxury Resortwear & Client Fittings",
    machines: "16 Precision Sample & Draping Stations",
    monthlyCapacity: "3,500+ Sample & Capsule Units / Month",
    image: "/images/lagos-atelier-lookbook.jpg",
    alt: "Surulere fashion atelier showroom with olive linen blazers and resortwear on brass rail",
  },
  {
    code: "Division 03: AQL 2.5 QC & finishing bay",
    name: "Quality Assurance & Export Finishing Bay",
    location: "1 Alawode Street, Surulere, Lagos",
    focus: "36-Point AQL 2.5 Inspection, Vacuum Steam Pressing, Private-Label Tagging & Dispatch",
    machines: "28 Heavy-Duty & Steam Finishing Stations",
    monthlyCapacity: "14,000+ Export-Ready Units / Month",
    image: "/images/qc-finishing-bay.jpg",
    alt: "Surulere quality control and export finishing bay with dress form inspection and garment racks",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const productionFaqs: FaqItem[] = [
  {
    question: "What is your Minimum Order Quantity (MOQ) for bulk production?",
    answer:
      "Our standard MOQ is 50 pieces per style (which can be split across XS to XXL sizes, e.g., 10 S, 20 M, 15 L, 5 XL). For corporate uniforms and private-label woven label runs, we recommend 100+ pieces to unlock volume tier discounts between 3% and 18%.",
  },
  {
    question: "Do I need a digital tech pack before requesting a quote?",
    answer:
      "No. While an approved tech pack or graded pattern speeds up onboarding by 20%, our Surulere Pattern Studio can develop your CAD pattern and graded spec sheet from a physical reference sample, sketch, or detailed design brief.",
  },
  {
    question: "Can I supply my own fabric (CMT), or do you source fabrics and trims (FOB)?",
    answer:
      "We support both Cut-Make-Trim (CMT) using your supplied fabric rolls and Full-Package (FOB) production using our vetted Lagos and international mill inventory (heavyweight combed cotton jersey, French terry, linen, silk crepe, gabardine, and YKK hardware).",
  },
  {
    question: "How do I track my production run once it enters the factory floor?",
    answer:
      "Every inquiry and order receives a unique Job Code (e.g., MKP-20261025-841) along with a printable Production Job Ticket. Our Merchandising & Production Desk provides stage-by-stage milestone updates as your run advances through Pattern Studio, Cutting, Sewing Lines, AQL 2.5 QC, and Dispatch.",
  },
];
