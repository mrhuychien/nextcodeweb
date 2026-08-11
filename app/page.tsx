"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Lang = "vi" | "en";
type LocalText = { vi: string; en: string };

const demos = [
  {
    tab: "migration",
    file: "apps/myapp/patches.txt",
    bad: [
      "# patches.txt",
      "myapp.patches.v1_0.rename_status_field",
      "myapp.patches.v1_0.backfill_totals",
    ],
    good: [
      "# patches.txt",
      "[pre_model_sync]",
      "myapp.patches.v1_0.rename_status_field",
      "",
      "[post_model_sync]",
      "myapp.patches.v1_0.backfill_totals",
    ],
    badNote: {
      vi: "Schema sync chạy trước patch đổi tên. Cột cũ biến mất, site kẹt giữa migration.",
      en: "Schema sync runs before the rename patch. The old column disappears and the site gets stuck mid-migration.",
    },
    goodNote: {
      vi: "Patch đổi tên chạy trước schema sync, backfill chạy sau. Migration hoàn tất đúng thứ tự.",
      en: "The rename patch runs before schema sync and the backfill runs after. Migration completes in the correct order.",
    },
  },
  {
    tab: "permissions",
    file: "apps/myapp/hooks.py",
    bad: [
      "# hooks.py",
      "fixtures = [",
      '  {"doctype": "Custom DocPerm"},',
      '  {"doctype": "Custom Field"}',
      "]",
    ],
    good: [
      "# install.py",
      "def after_install():",
      "  frappe.permissions.add_permission(",
      '    "Chuyen Xe", "Driver", 0',
      "  )",
    ],
    badNote: {
      vi: "Fixture Custom DocPerm thiếu trường name. Cài app trên site mới thất bại.",
      en: "The Custom DocPerm fixture has no name field. App installation fails on a fresh site.",
    },
    goodNote: {
      vi: "Phân quyền được áp bằng code, idempotent và có thể chạy lại an toàn.",
      en: "Permissions are applied in code, remain idempotent, and can be rerun safely.",
    },
  },
  {
    tab: "print format",
    file: "Print Format › Delivery Note",
    bad: [
      '<div class="card hidden">…</div>',
      "",
      "<style>",
      "  .hidden { display: none; }",
      "</style>",
    ],
    good: [
      '<div class="dst-card dst-hidden">…</div>',
      "",
      "<style>",
      "  .dst-hidden { display: none !important; }",
      "</style>",
    ],
    badNote: {
      vi: "Class đụng Bootstrap của ERPNext. Khối cần ẩn vẫn xuất hiện khi in.",
      en: "The classes collide with ERPNext's Bootstrap styles. The hidden block still appears in print.",
    },
    goodNote: {
      vi: "Prefix riêng loại bỏ va chạm cascade với Bootstrap và giữ bản in ổn định.",
      en: "A dedicated prefix prevents Bootstrap cascade collisions and keeps printed output stable.",
    },
  },
] as const;

const skills: Array<[string, string, string, LocalText]> = [
  ["01", "nextcode-kit", "Router", { vi: "Tự đọc yêu cầu và gọi đúng skill chuyên trách.", en: "Reads the request and invokes the right specialist skill." }],
  ["02", "nextcode-design", "Architecture", { vi: "Từ nghiệp vụ tới DocType, ERD và ma trận quyền.", en: "Turns business needs into DocTypes, ERDs, and permission matrices." }],
  ["03", "nextcode-build", "Build", { vi: "Biến spec đã duyệt thành app Frappe đúng chuẩn.", en: "Turns an approved spec into a convention-safe Frappe app." }],
  ["04", "nextcode-xray", "Audit", { vi: "Đọc app kế thừa, dựng bản đồ và tài liệu bàn giao.", en: "Audits inherited apps and produces maps and handover docs." }],
  ["05", "nextcode-debug", "Debug", { vi: "Lần theo traceback, hook, job và lỗi permission.", en: "Traces exceptions, hooks, background jobs, and permission failures." }],
  ["06", "nextcode-qa", "Quality", { vi: "Test, review và regression cho lỗi vừa sửa.", en: "Builds tests, reviews, and regression coverage for fixed bugs." }],
  ["07", "nextcode-perf", "Performance", { vi: "Xử lý report chậm, N+1, index và Jinja nặng.", en: "Finds slow reports, N+1 queries, missing indexes, and heavy Jinja." }],
  ["08", "nextcode-security", "Security", { vi: "Audit quyền, SQL injection và API bị hở.", en: "Audits permissions, SQL injection, and exposed APIs." }],
  ["09", "nextcode-migrate", "Migration", { vi: "Dẫn đường từ v13 qua v14, v15 tới v16.", en: "Guides migrations from v13 through v14 and v15 to v16." }],
  ["10", "frappe-app-build-profile", "Orchestration", { vi: "Spec trước, có gate duyệt, verify trước ship.", en: "Spec first, approval gates, and verification before shipping." }],
  ["11", "frappe-portal-spa", "Portal SPA", { vi: "SPA trên www page, ES modules, cache discipline.", en: "Builds www-page SPAs with ES modules and disciplined caching." }],
  ["12", "frappe-sales-analytics", "Analytics", { vi: "Revenue, aging, DSO, margin và Pareto có gác quyền.", en: "Delivers permission-gated revenue, aging, DSO, margin, and Pareto." }],
  ["13", "frappe-app-shipping-gotchas", "Shipping", { vi: "Chặn lỗi cài app và sai thứ tự bench commands.", en: "Prevents install failures and incorrect bench command order." }],
];

const faqs: Array<{ question: LocalText; answer: LocalText }> = [
  {
    question: { vi: "Hướng dẫn bằng tiếng Việt có ảnh hưởng tới code không?", en: "Do Vietnamese instructions affect the generated code?" },
    answer: {
      vi: "Không. Phần hướng dẫn được viết bằng tiếng Việt để đội ngũ dễ đọc và chỉnh sửa; toàn bộ code, identifier, command và ví dụ kỹ thuật vẫn dùng tiếng Anh.",
      en: "No. The instructions are written in Vietnamese for easier team review and editing, while all code, identifiers, commands, and technical examples remain in English.",
    },
  },
  {
    question: { vi: "Vì sao không bán lẻ skill debug?", en: "Why isn't the debug skill sold separately?" },
    answer: {
      vi: "Nhóm lifecycle định tuyến lẫn nhau: debug có thể chuyển sang design, performance hoặc QA. Tách riêng làm đứt luồng xử lý. Ba skill độc lập vẫn có thể mua lẻ.",
      en: "The lifecycle skills route to one another: debug may hand off to design, performance, or QA. Selling it alone would break that workflow. Three independent skills are still available separately.",
    },
  },
  {
    question: { vi: "Bộ kit hỗ trợ phiên bản nào?", en: "Which versions does the kit support?" },
    answer: {
      vi: "Nội dung được viết cho Frappe Framework v16 và ERPNext v16. Phần lớn quy ước còn phù hợp với v15; skill migration có lộ trình rõ cho v13 và v14 qua bước trung gian v15.",
      en: "The kit targets Frappe Framework v16 and ERPNext v16. Most conventions also apply to v15, while the migration skill covers v13 and v14 through the required v15 intermediate step.",
    },
  },
  {
    question: { vi: "Có thể dùng cho dự án khách hàng không?", en: "Can I use it on client projects?" },
    answer: {
      vi: "Có. Một seat dành cho một developer và được dùng trong dự án thương mại. Bạn có thể chỉnh sửa nội bộ nhưng không phân phối lại hoặc đăng công khai.",
      en: "Yes. One seat covers one developer, including commercial client work. You may modify the skills internally, but may not redistribute or publish them.",
    },
  },
  {
    question: { vi: "Nếu bộ kit không phù hợp thì sao?", en: "What if the kit isn't right for me?" },
    answer: {
      vi: "Bạn có thể yêu cầu hoàn tiền trong 14 ngày. Sản phẩm là các file SKILL.md thuần, không khóa nền tảng và không có runtime riêng.",
      en: "You can request a refund within 14 days. The product is a set of plain SKILL.md files with no platform lock-in or proprietary runtime.",
    },
  },
];

const copy = {
  vi: {
    homeAria: "NextCode Kit — về đầu trang",
    navAria: "Điều hướng chính",
    navProblem: "Vấn đề",
    navHow: "Cách hoạt động",
    navCta: "Sở hữu bộ kit",
    langAria: "Chọn ngôn ngữ",
    heroA: "AI biết Python.",
    heroB: "Nhưng chưa",
    heroC: "biết",
    heroLead: "Đừng trả tiền cho những giờ debug lẽ ra không tồn tại. NextCode Kit đưa các quy ước Frappe khó đoán vào thẳng ngữ cảnh làm việc của AI agent — trước khi nó chạm vào production.",
    buy: "Sở hữu trọn bộ — $49",
    seeDemo: "Xem kit sửa code thế nào",
    trustA: "File SKILL.md thuần",
    trustB: "Cập nhật v1.x",
    trustC: "Hoàn tiền 14 ngày",
    modelAria: "Mô hình 3D của hệ thống NextCode Kit",
    proofAria: "Thông tin sản phẩm",
    proofA: "SKILLS CHUYÊN BIỆT",
    proofB: "LỘ TRÌNH MIGRATION",
    proofC: "RUNTIME PHỤ THUỘC",
    proofD: "CÀI MỘT LẦN",
    problemA: "Code trông đúng.",
    problemB: "Review cũng đúng.",
    problemC: "Rồi bench migrate thất bại.",
    problemLead: "LLM có thể viết Python rất tốt. Nhưng Frappe vận hành bằng một lớp quy ước mà codebase không tự giải thích: thứ tự patch, fixture dễ vỡ, quyền truy cập nhiều tầng, hook lifecycle và những va chạm frontend đặc thù.",
    costLabel: "CHI PHÍ THẬT",
    costTitle: "Một lỗi nhỏ → một buổi debug",
    costBody: "Và cùng một lỗi có thể quay lại ở agent, dự án hoặc thành viên tiếp theo.",
    demoA: "Thấy khác biệt",
    demoB: "ngay trong code.",
    demoLead: "Chuyển chế độ để xem cùng một yêu cầu khi agent làm việc thiếu hoặc có ngữ cảnh Frappe chính xác.",
    demoAria: "Tình huống code",
    skillsA: "Mười ba chuyên gia.",
    skillsB: "Một bộ não điều phối.",
    skillsLead: "Bạn không cần nhớ tên skill. Chỉ cần mô tả vấn đề. Router nhận diện ý định, gọi đúng chuyên môn và giữ luồng làm việc không bị đứt đoạn.",
    flowA: "Mô tả như bình thường.",
    flowB: "Kit lo phần còn lại.",
    flowLead: "Không dashboard mới. Không syntax phải học. Không thay đổi cách đội ngũ đang dùng agent.",
    step1Title: "Nói vấn đề",
    step1Body: "“Report này chạy 30 giây, tối ưu giúp.”",
    step2Title: "Router nhận diện",
    step2Body: "Hiểu đây là vấn đề performance trong Frappe.",
    step3Title: "Agent làm đúng",
    step3Body: "Áp quy ước, kiểm tra và trả giải pháp có thể ship.",
    copyAria: "Sao chép lệnh cài đặt",
    pricingA: "Một buổi debug tránh được.",
    pricingB: "Bộ kit đã hoàn vốn.",
    pricingLead: "File SKILL.md thuần. Không runtime. Không tài khoản. Không gọi về server.",
    freeBody: "Một lát cắt đủ để kiểm tra cách kit hoạt động trong workflow của bạn.",
    freeBulletA: "Xử lý lỗi cài app phổ biến",
    freeBulletB: "Không cần email",
    freeCta: "Tải bản dùng thử",
    singleBody: "Dành cho một nhu cầu độc lập, không cần chuỗi lifecycle đầy đủ.",
    singleBullet: "Chọn một skill độc lập",
    singleCta: "Xem skill mua lẻ",
    popular: "LỰA CHỌN TỐI ƯU",
    compare: "Thay vì $117 khi mua lẻ",
    fullBulletA: "Đủ 13 skills, routing nguyên vẹn",
    fullBulletB: "Một seat, dùng vĩnh viễn",
    fullBulletC: "Dùng được cho dự án khách hàng",
    fullBulletD: "Cập nhật miễn phí suốt v1.x",
    fullBulletE: "Hoàn tiền trong 14 ngày",
    fullCta: "Sở hữu NextCode Kit",
    faqA: "Câu hỏi trước",
    faqB: "khi xuống tiền.",
    faqLead: "Thông tin thẳng, gọn và không có chữ nhỏ giấu phía sau.",
    finalA: "Đừng để agent học Frappe",
    finalB: "bằng chính project của bạn.",
    finalLead: "Cài một lần. Ngừng sửa đi sửa lại những lỗi đáng ra agent phải biết từ đầu.",
    finalMeta: "13 skills · 1 seat · vĩnh viễn · hoàn tiền 14 ngày",
    footerDisclaimer: "Không liên kết với Frappe Technologies.",
  },
  en: {
    homeAria: "NextCode Kit — back to top",
    navAria: "Primary navigation",
    navProblem: "The problem",
    navHow: "How it works",
    navCta: "Get the kit",
    langAria: "Choose language",
    heroA: "AI knows Python.",
    heroB: "But it doesn't",
    heroC: "know",
    heroLead: "Stop paying for debugging hours that should never exist. NextCode Kit puts hard-to-infer Frappe conventions directly into your AI agent's working context — before it touches production.",
    buy: "Get the full kit — $49",
    seeDemo: "See how the kit fixes code",
    trustA: "Plain SKILL.md files",
    trustB: "Free v1.x updates",
    trustC: "14-day refund",
    modelAria: "3D model of the NextCode Kit system",
    proofAria: "Product details",
    proofA: "SPECIALIST SKILLS",
    proofB: "MIGRATION PATH",
    proofC: "RUNTIME DEPENDENCIES",
    proofD: "ONE-TIME INSTALL",
    problemA: "The code looks right.",
    problemB: "The review passes.",
    problemC: "Then bench migrate fails.",
    problemLead: "LLMs can write excellent Python. But Frappe runs on a layer of conventions your codebase does not explain: patch ordering, fragile fixtures, multi-layer permissions, lifecycle hooks, and framework-specific frontend collisions.",
    costLabel: "THE REAL COST",
    costTitle: "One small mistake → one debugging session",
    costBody: "And the same mistake can return with the next agent, project, or team member.",
    demoA: "See the difference",
    demoB: "inside the code.",
    demoLead: "Switch modes to compare the same request when the agent works with or without precise Frappe context.",
    demoAria: "Code scenarios",
    skillsA: "Thirteen specialists.",
    skillsB: "One routing brain.",
    skillsLead: "You don't need to remember skill names. Describe the problem. The router identifies intent, invokes the right expertise, and keeps the workflow intact.",
    flowA: "Describe the problem.",
    flowB: "The kit handles the rest.",
    flowLead: "No new dashboard. No syntax to learn. No change to how your team already works with agents.",
    step1Title: "State the problem",
    step1Body: "“This report takes 30 seconds. Optimize it.”",
    step2Title: "The router identifies it",
    step2Body: "It recognizes a Frappe performance problem.",
    step3Title: "The agent gets it right",
    step3Body: "It applies the conventions, verifies the work, and returns a shippable solution.",
    copyAria: "Copy installation command",
    pricingA: "Avoid one debugging session.",
    pricingB: "The kit has paid for itself.",
    pricingLead: "Plain SKILL.md files. No runtime. No account. No phone-home.",
    freeBody: "A focused sample that lets you test how the kit fits your workflow.",
    freeBulletA: "Covers common app install failures",
    freeBulletB: "No email required",
    freeCta: "Download the taster",
    singleBody: "For one independent need that does not require the full lifecycle chain.",
    singleBullet: "Choose one standalone skill",
    singleCta: "Browse single skills",
    popular: "BEST VALUE",
    compare: "$117 when purchased separately",
    fullBulletA: "All 13 skills with routing intact",
    fullBulletB: "One seat, perpetual use",
    fullBulletC: "Use on commercial client work",
    fullBulletD: "Free updates throughout v1.x",
    fullBulletE: "14-day refund",
    fullCta: "Get NextCode Kit",
    faqA: "Questions before",
    faqB: "you buy.",
    faqLead: "Straight answers, clear terms, and no fine print hiding below.",
    finalA: "Don't let your agent learn Frappe",
    finalB: "on your production project.",
    finalLead: "Install once. Stop correcting the mistakes your agent should have known from the start.",
    finalMeta: "13 skills · 1 seat · perpetual · 14-day refund",
    footerDisclaimer: "Not affiliated with Frappe Technologies.",
  },
} as const;

function CodeLine({ line, good }: { line: string; good: boolean }) {
  const isComment = line.trim().startsWith("#");
  const isSignal = line.includes("pre_model_sync") || line.includes("post_model_sync") || line.includes("add_permission") || line.includes("dst-");
  return <span className={isComment ? "code-comment" : isSignal && good ? "code-signal" : ""}>{line || " "}</span>;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("vi");
  const [demoIndex, setDemoIndex] = useState(0);
  const [protectedMode, setProtectedMode] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const t = copy[lang];
  const demo = demos[demoIndex];
  const code = protectedMode ? demo.good : demo.bad;

  useEffect(() => {
    const saved = window.localStorage.getItem("nextcode-language");
    if (saved === "vi" || saved === "en") setLang(saved);
    else if (!window.navigator.language.toLowerCase().startsWith("vi")) setLang("en");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === "vi"
      ? "NextCode Kit — 13 Agent Skills cho Frappe / ERPNext v16"
      : "NextCode Kit — 13 Agent Skills for Frappe / ERPNext v16";
    window.localStorage.setItem("nextcode-language", lang);
  }, [lang]);

  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const revealHashTarget = (hash = window.location.hash) => {
      if (!hash || hash === "#top") return;
      const target = document.querySelector<HTMLElement>(hash);
      target?.querySelectorAll<HTMLElement>("[data-reveal]").forEach((item) => item.classList.add("is-visible", "reveal-immediate"));
    };
    const revealClickedTarget = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (anchor) revealHashTarget(anchor.getAttribute("href") || "");
    };
    const revealCurrentHash = () => revealHashTarget();
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.04, rootMargin: "0px 0px 18% 0px" },
    );
    revealItems.forEach((item) => observer.observe(item));
    revealHashTarget();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty("--scroll-progress", max > 0 ? String(window.scrollY / max) : "0");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", revealCurrentHash);
    document.addEventListener("click", revealClickedTarget);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", revealCurrentHash);
      document.removeEventListener("click", revealClickedTarget);
    };
  }, []);

  const changeLanguage = (next: Lang) => {
    setLang(next);
    window.localStorage.setItem("nextcode-language", next);
  };

  const moveHero = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    heroRef.current?.style.setProperty("--mx", `${(event.clientX - rect.left) / rect.width - 0.5}`);
    heroRef.current?.style.setProperty("--my", `${(event.clientY - rect.top) / rect.height - 0.5}`);
  };

  const resetHero = () => {
    heroRef.current?.style.setProperty("--mx", "0");
    heroRef.current?.style.setProperty("--my", "0");
  };

  return (
    <main className={`lang-${lang}`}>
      <div className="scroll-progress" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#top" aria-label={t.homeAria}>
          <span className="brand-orb" /><span>nextcode</span><b>kit</b>
        </a>
        <nav className="desktop-nav" aria-label={t.navAria}>
          <a href="#problem">{t.navProblem}</a>
          <a href="#skills">13 Skills</a>
          <a href="#how">{t.navHow}</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="lang-switch" role="group" aria-label={t.langAria}>
          <button className={lang === "vi" ? "active" : ""} aria-pressed={lang === "vi"} onClick={() => changeLanguage("vi")}>VI</button>
          <button className={lang === "en" ? "active" : ""} aria-pressed={lang === "en"} onClick={() => changeLanguage("en")}>EN</button>
        </div>
        <a className="nav-cta magnetic" href="#pricing">{t.navCta} <span>↗</span></a>
      </header>

      <section className="hero" id="top" ref={heroRef} onPointerMove={moveHero} onPointerLeave={resetHero}>
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-aurora aurora-one" aria-hidden="true" />
        <div className="hero-aurora aurora-two" aria-hidden="true" />
        <div className="hero-copy">
          <div className="signal-pill" data-reveal><span className="signal-dot" />13 AGENT SKILLS · FRAPPE / ERPNEXT V16</div>
          <h1 data-reveal>
            {t.heroA}<br /><span>{t.heroB}</span><br />{t.heroC} <em>Frappe.</em>
          </h1>
          <p className="hero-lede" data-reveal>{t.heroLead}</p>
          <div className="hero-actions" data-reveal>
            <a className="primary-cta magnetic" href="#pricing"><span>{t.buy}</span><i>↗</i></a>
            <a className="text-cta" href="#live-demo">{t.seeDemo} <span>↓</span></a>
          </div>
          <div className="trust-row" data-reveal>
            <span><b>✓</b> {t.trustA}</span><span><b>✓</b> {t.trustB}</span><span><b>✓</b> {t.trustC}</span>
          </div>
        </div>

        <div className="hero-machine" aria-label={t.modelAria}>
          <div className="machine-stage">
            <div className="orbit orbit-a"><span /></div><div className="orbit orbit-b"><span /></div><div className="core-glow" />
            <div className="skill-stack">
              <div className="skill-card layer-three"><span>13</span><small>shipping gotchas</small><b>READY</b></div>
              <div className="skill-card layer-two"><span>08</span><small>security audit</small><b>ARMED</b></div>
              <div className="skill-card layer-one">
                <div className="card-top"><span>NX / 01</span><b>ACTIVE</b></div>
                <div className="card-core"><i>&lt;/&gt;</i><strong>NEXTCODE<br />ROUTER</strong></div>
                <div className="card-route"><span>REQUEST</span><i /><span>RIGHT SKILL</span></div>
              </div>
            </div>
            <div className="float-chip chip-a"><i /> v16 context loaded</div><div className="float-chip chip-b">13 / 13 online</div><div className="float-chip chip-c">migration protected</div>
          </div>
        </div>
        <div className="hero-index" aria-hidden="true"><span>SCROLL TO INSPECT</span><i /><b>01</b></div>
      </section>

      <section className="proof-strip" aria-label={t.proofAria}>
        <div><strong>13</strong><span>{t.proofA}</span></div><i />
        <div><strong>v13→v16</strong><span>{t.proofB}</span></div><i />
        <div><strong>0</strong><span>{t.proofC}</span></div><i />
        <div><strong>1×</strong><span>{t.proofD}</span></div>
      </section>

      <section className="problem section-shell" id="problem">
        <div className="section-3d problem-prism" aria-hidden="true"><span /><span /><span /></div>
        <div className="section-kicker" data-reveal><span>01</span> / THE HIDDEN COST</div>
        <div className="problem-grid">
          <div><h2 data-reveal>{t.problemA}<br />{t.problemB}<br /><em>{t.problemC}</em></h2></div>
          <div className="problem-copy" data-reveal>
            <p>{t.problemLead}</p>
            <div className="cost-card"><span>{t.costLabel}</span><strong>{t.costTitle}</strong><p>{t.costBody}</p></div>
          </div>
        </div>
      </section>

      <section className="demo-section" id="live-demo">
        <div className="section-3d demo-sphere" aria-hidden="true"><span /><i /></div>
        <div className="section-shell">
          <div className="section-kicker light" data-reveal><span>02</span> / LIVE INTELLIGENCE</div>
          <div className="demo-heading"><h2 data-reveal>{t.demoA}<br />{t.demoB}</h2><p data-reveal>{t.demoLead}</p></div>
          <div className="code-console" data-reveal>
            <div className="console-topbar">
              <div className="console-lights"><i /><i /><i /></div>
              <div className="demo-tabs" role="tablist" aria-label={t.demoAria}>
                {demos.map((item, index) => <button key={item.tab} role="tab" aria-selected={demoIndex === index} onClick={() => setDemoIndex(index)}>{item.tab}</button>)}
              </div>
              <span className="console-path">{demo.file}</span>
            </div>
            <div className="console-body">
              <div className="mode-rail">
                <span>AGENT CONTEXT</span>
                <div className={`mode-switch ${protectedMode ? "on" : "off"}`}>
                  <button className={!protectedMode ? "active" : ""} onClick={() => setProtectedMode(false)} aria-pressed={!protectedMode}>RAW</button>
                  <button className={protectedMode ? "active" : ""} onClick={() => setProtectedMode(true)} aria-pressed={protectedMode}>KIT ON</button>
                </div>
                <div className={`verdict-badge ${protectedMode ? "pass" : "fail"}`}><i /> {protectedMode ? "SAFE TO SHIP" : "FAILS AT RUNTIME"}</div>
              </div>
              <div className="code-window" aria-live="polite">
                <div className="line-numbers">{code.map((_, index) => <span key={index}>{String(index + 1).padStart(2, "0")}</span>)}</div>
                <pre key={`${demoIndex}-${protectedMode}`}>{code.map((line, index) => <CodeLine key={index} line={line} good={protectedMode} />)}</pre>
              </div>
              <div className={`diagnostic ${protectedMode ? "pass" : "fail"}`}>
                <span>{protectedMode ? "01 / PREVENTED" : "01 / DETECTED"}</span>
                <p>{protectedMode ? demo.goodNote[lang] : demo.badNote[lang]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="skills-section section-shell" id="skills">
        <div className="section-3d skills-helix" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="section-kicker" data-reveal><span>03</span> / THE SYSTEM</div>
        <div className="skills-heading"><h2 data-reveal>{t.skillsA}<br /><em>{t.skillsB}</em></h2><p data-reveal>{t.skillsLead}</p></div>
        <div className="skill-grid" data-reveal>
          {skills.map(([number, name, category, description], index) => (
            <article className={index === 0 ? "router-card" : ""} key={name}>
              <div className="skill-number">{number}</div>
              <div className="skill-icon">{index === 0 ? "⌘" : ["◫", "⌁", "⌕", "↯", "✓", "⌁", "◇", "⇅", "◎", "◈", "▥", "⬡"][index - 1]}</div>
              <span>{category}</span><h3>{name}</h3><p>{description[lang]}</p><i className="card-corner" />
            </article>
          ))}
        </div>
      </section>

      <section className="flow-section" id="how">
        <div className="section-3d flow-lens" aria-hidden="true"><span /><span /></div>
        <div className="section-shell">
          <div className="section-kicker light" data-reveal><span>04</span> / HOW IT WORKS</div>
          <div className="flow-heading"><h2 data-reveal>{t.flowA}<br />{t.flowB}</h2><p data-reveal>{t.flowLead}</p></div>
          <div className="flow-track" data-reveal>
            <div className="flow-step"><span>01</span><i>“</i><h3>{t.step1Title}</h3><p>{t.step1Body}</p></div>
            <div className="flow-line"><i /><b>ROUTING</b></div>
            <div className="flow-step active"><span>02</span><i>⌘</i><h3>{t.step2Title}</h3><p>{t.step2Body}</p></div>
            <div className="flow-line"><i /><b>CONTEXT</b></div>
            <div className="flow-step"><span>03</span><i>✓</i><h3>{t.step3Title}</h3><p>{t.step3Body}</p></div>
          </div>
          <div className="install-line" data-reveal>
            <div><span>$</span> cp -r nextcode-kit/skills/* ~/.claude/skills/</div>
            <button onClick={() => navigator.clipboard?.writeText("cp -r nextcode-kit/skills/* ~/.claude/skills/")} aria-label={t.copyAria}>COPY</button>
          </div>
        </div>
      </section>

      <section className="pricing-section section-shell" id="pricing">
        <div className="section-3d pricing-cube" aria-hidden="true"><span /><span /><span /></div>
        <div className="section-kicker" data-reveal><span>05</span> / OWN THE CONTEXT</div>
        <div className="pricing-heading"><h2 data-reveal>{t.pricingA}<br /><em>{t.pricingB}</em></h2><p data-reveal>{t.pricingLead}</p></div>
        <div className="price-grid" data-reveal>
          <article className="price-card">
            <div className="price-label">TASTER</div><div className="price-value"><sup>$</sup>0</div><p>{t.freeBody}</p>
            <ul><li><b>✓</b> frappe-app-shipping-gotchas</li><li><b>✓</b> {t.freeBulletA}</li><li><b>✓</b> {t.freeBulletB}</li></ul>
            <a href="#final-cta">{t.freeCta} <span>↗</span></a>
          </article>
          <article className="price-card">
            <div className="price-label">SINGLE SKILL</div><div className="price-value"><sup>$</sup>9</div><p>{t.singleBody}</p>
            <ul><li><b>✓</b> frappe-portal-spa</li><li><b>✓</b> frappe-sales-analytics</li><li><b>✓</b> {t.singleBullet}</li></ul>
            <a href="#final-cta">{t.singleCta} <span>↗</span></a>
          </article>
          <article className="price-card featured">
            <div className="popular">{t.popular}</div><div className="price-label">FULL KIT</div><div className="price-value"><sup>$</sup>49</div><p className="compare">{t.compare}</p>
            <ul><li><b>✓</b> {t.fullBulletA}</li><li><b>✓</b> {t.fullBulletB}</li><li><b>✓</b> {t.fullBulletC}</li><li><b>✓</b> {t.fullBulletD}</li><li><b>✓</b> {t.fullBulletE}</li></ul>
            <a className="buy-main" href="#final-cta">{t.fullCta} <span>↗</span></a>
          </article>
        </div>
      </section>

      <section className="faq-section section-shell" id="faq">
        <div className="section-3d faq-globe" aria-hidden="true"><span /><i /></div>
        <div className="section-kicker" data-reveal><span>06</span> / BEFORE YOU BUY</div>
        <div className="faq-layout">
          <div><h2 data-reveal>{t.faqA}<br />{t.faqB}</h2><p data-reveal>{t.faqLead}</p></div>
          <div className="faq-list" data-reveal>
            {faqs.map((item, index) => (
              <article className={openFaq === index ? "open" : ""} key={item.question.en}>
                <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{item.question[lang]}</strong><i>{openFaq === index ? "−" : "+"}</i>
                </button>
                <div className="faq-answer"><p>{item.answer[lang]}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta" id="final-cta">
        <div className="cta-grid" aria-hidden="true" /><div className="cta-orb" aria-hidden="true"><span>⌘</span></div>
        <div className="final-content" data-reveal>
          <span>SHIP WITH CONTEXT</span><h2>{t.finalA}<br />{t.finalB}</h2><p>{t.finalLead}</p>
          <a className="primary-cta light magnetic" href="#pricing"><span>{t.buy}</span><i>↗</i></a><small>{t.finalMeta}</small>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-orb" /><span>nextcode</span><b>kit</b></a>
        <p>Agent Skills for Frappe / ERPNext v16</p>
        <div><span>© 2026 NEXTCODE KIT</span><span>{t.footerDisclaimer}</span></div>
      </footer>
    </main>
  );
}
