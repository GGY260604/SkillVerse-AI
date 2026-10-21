/**
 * Profile intake & diagnostic normalization utilities.
 * Ensures consistent canonical data representation in PostgreSQL/Supabase and FastAPI,
 * regardless of whether input originated from multilingual CV semantic extraction,
 * legacy profile databases, or dynamic multi-lingual UI option selections.
 */

export interface LocalizedText {
  en: string;
  zh: string;
  ms: string;
}

export interface FixedOptionItem {
  id: string;
  label: LocalizedText;
  desc?: LocalizedText;
  sub?: LocalizedText;
}

export const EMPLOYMENT_STATUS_OPTIONS: FixedOptionItem[] = [
  {
    id: "employed_at_risk",
    label: {
      en: "Employed (At Risk)",
      zh: "在职（受AI冲击风险）",
      ms: "Bekerja (Berisiko)",
    },
    desc: {
      en: "Routine workflows facing AI disruption",
      zh: "日常工作面临AI自动化颠覆",
      ms: "Aliran kerja rutin menghadapi gangguan AI",
    },
  },
  {
    id: "fresh_grad_student",
    label: {
      en: "Fresh Graduate / Student",
      zh: "应届毕业生 / 学生",
      ms: "Graduan Baharu / Pelajar",
    },
    desc: {
      en: "Entering labor market & seeking placement",
      zh: "初入劳动力市场寻找合适职位",
      ms: "Memasuki pasaran buruh & mencari penempatan",
    },
  },
  {
    id: "career_switcher",
    label: {
      en: "Career Switcher",
      zh: "职业转型者",
      ms: "Penukar Kerjaya",
    },
    desc: {
      en: "Pivoting across domains or industries",
      zh: "跨领域或跨行业转型",
      ms: "Beralih merentas domain atau industri",
    },
  },
  {
    id: "jobseeker",
    label: {
      en: "Jobseeker",
      zh: "求职者",
      ms: "Pencari Kerja",
    },
    desc: {
      en: "Active candidate seeking opportunities",
      zh: "积极寻找新的就业机会",
      ms: "Calon aktif mencari peluang pekerjaan",
    },
  },
];

export const WORK_ARRANGEMENT_OPTIONS: FixedOptionItem[] = [
  {
    id: "any",
    label: {
      en: "Any",
      zh: "任意",
      ms: "Mana-mana",
    },
  },
  {
    id: "remote",
    label: {
      en: "Full Remote",
      zh: "全远程",
      ms: "Bekerja dari Rumah",
    },
  },
  {
    id: "hybrid",
    label: {
      en: "Hybrid",
      zh: "混合办公",
      ms: "Hibrid",
    },
  },
  {
    id: "onsite",
    label: {
      en: "On-site",
      zh: "现场办公",
      ms: "Di Tapak",
    },
  },
];

export const CAREER_GOAL_OPTIONS: FixedOptionItem[] = [
  {
    id: "upskill",
    label: {
      en: "Upskill",
      zh: "技能提升",
      ms: "Peningkatan Kemahiran",
    },
    desc: {
      en: "Advance in Current Field",
      zh: "在现有专业领域进阶深造",
      ms: "Maju dalam bidang pekerjaan semasa",
    },
  },
  {
    id: "reskill",
    label: {
      en: "Reskill",
      zh: "技能重塑",
      ms: "Latihan Semula",
    },
    desc: {
      en: "Pivot to AI / Tech",
      zh: "全面转型至 AI 及前沿科技",
      ms: "Beralih ke AI dan teknologi baharu",
    },
  },
  {
    id: "explore",
    label: {
      en: "Explore",
      zh: "探索机会",
      ms: "Meneroka Peluang",
    },
    desc: {
      en: "High-Growth Opportunities",
      zh: "探索高增长潜力新兴赛道",
      ms: "Meneroka peluang berpertumbuhan tinggi",
    },
  },
];

export const YEARS_OF_EXPERIENCE_OPTIONS: FixedOptionItem[] = [
  {
    id: "0-1",
    label: {
      en: "0 - 1 Year (Entry Level)",
      zh: "0 - 1 年（初级 / 应届）",
      ms: "0 - 1 Tahun (Tahap Permulaan)",
    },
  },
  {
    id: "1-3",
    label: {
      en: "1 - 3 Years (Associate)",
      zh: "1 - 3 年（初中级）",
      ms: "1 - 3 Tahun (Sekutu)",
    },
  },
  {
    id: "3-5",
    label: {
      en: "3 - 5 Years (Mid-Level)",
      zh: "3 - 5 年（中级骨干）",
      ms: "3 - 5 Tahun (Pertengahan)",
    },
  },
  {
    id: "5-10",
    label: {
      en: "5 - 10 Years (Senior)",
      zh: "5 - 10 年（资深）",
      ms: "5 - 10 Tahun (Kanan)",
    },
  },
  {
    id: "10+",
    label: {
      en: "10+ Years (Lead / Director)",
      zh: "10+ 年（总监 / 专家）",
      ms: "10+ Tahun (Ketua / Pengarah)",
    },
  },
];

export const INDUSTRY_OPTIONS: FixedOptionItem[] = [
  {
    id: "Software & Cloud Services",
    label: {
      en: "Software & Cloud Services",
      zh: "软件与云服务",
      ms: "Perisian & Perkhidmatan Awan",
    },
  },
  {
    id: "Banking & Financial Services",
    label: {
      en: "Banking & Financial Services",
      zh: "银行与金融服务",
      ms: "Perbankan & Perkhidmatan Kewangan",
    },
  },
  {
    id: "Clean Energy & ESG",
    label: {
      en: "Clean Energy & ESG",
      zh: "清洁能源与 ESG",
      ms: "Tenaga Bersih & ESG",
    },
  },
  {
    id: "Healthcare & BioTech",
    label: {
      en: "Healthcare & BioTech",
      zh: "医疗健康与生物科技",
      ms: "Penjagaan Kesihatan & Bioteknologi",
    },
  },
  {
    id: "Industrial Automation & Robotics",
    label: {
      en: "Industrial Automation & Robotics",
      zh: "工业自动化与机器人",
      ms: "Automasi Industri & Robotik",
    },
  },
  {
    id: "Smart Logistics & Supply Chain",
    label: {
      en: "Smart Logistics & Supply Chain",
      zh: "智慧物流与供应链",
      ms: "Logistik Pintar & Rantaian Bekalan",
    },
  },
  {
    id: "Clerical & Administrative",
    label: {
      en: "Clerical & Administrative",
      zh: "行政文书与后台支持",
      ms: "Perkeranian & Pentadbiran",
    },
  },
  {
    id: "Marketing & Creative Media",
    label: {
      en: "Marketing & Creative Media",
      zh: "市场营销与创意媒体",
      ms: "Pemasaran & Media Kreatif",
    },
  },
  {
    id: "Public Sector & Education",
    label: {
      en: "Public Sector & Education",
      zh: "公共部门与教育培训",
      ms: "Sektor Awam & Pendidikan",
    },
  },
];

export const EDUCATION_LEVEL_OPTIONS: FixedOptionItem[] = [
  {
    id: "Secondary / High School",
    label: {
      en: "Secondary / High School",
      zh: "中学 / 高中学历 (SPM/STPM)",
      ms: "Sekolah Menengah / SPM",
    },
  },
  {
    id: "Diploma / Vocational (TVET)",
    label: {
      en: "Diploma / Vocational (TVET)",
      zh: "大专 / 职业技术认证 (TVET)",
      ms: "Diploma / Vokasional (TVET)",
    },
  },
  {
    id: "Bachelor's Degree",
    label: {
      en: "Bachelor's Degree",
      zh: "学士学位 / 大学本科",
      ms: "Ijazah Sarjana Muda",
    },
  },
  {
    id: "Master's / Postgraduate",
    label: {
      en: "Master's / Postgraduate",
      zh: "硕士学位 / 研究生",
      ms: "Ijazah Sarjana / Pascasiswazah",
    },
  },
  {
    id: "Doctorate / PhD",
    label: {
      en: "Doctorate / PhD",
      zh: "博士学位 (PhD)",
      ms: "Doktor Falsafah (PhD)",
    },
  },
  {
    id: "Self-Taught / Industry Certified",
    label: {
      en: "Self-Taught / Industry Certified",
      zh: "自学成才 / 行业专业认证",
      ms: "Belajar Sendiri / Pensijilan Industri",
    },
  },
];

export const WEEKLY_COMMITMENT_OPTIONS: FixedOptionItem[] = [
  {
    id: "1-3",
    label: {
      en: "1 - 3 Hours",
      zh: "1 - 3 小时",
      ms: "1 - 3 Jam",
    },
    sub: {
      en: "Micro-learning",
      zh: "碎片化学习",
      ms: "Pembelajaran mikro",
    },
  },
  {
    id: "3-5",
    label: {
      en: "3 - 5 Hours",
      zh: "3 - 5 小时",
      ms: "3 - 5 Jam",
    },
    sub: {
      en: "Recommended",
      zh: "推荐进度",
      ms: "Disyorkan",
    },
  },
  {
    id: "5-10",
    label: {
      en: "5 - 10 Hours",
      zh: "5 - 10 小时",
      ms: "5 - 10 Jam",
    },
    sub: {
      en: "Accelerated",
      zh: "加速突破",
      ms: "Dipercepatkan",
    },
  },
  {
    id: "10+",
    label: {
      en: "10+ Hours",
      zh: "10+ 小时",
      ms: "10+ Jam",
    },
    sub: {
      en: "Full Immersion",
      zh: "沉浸式专精",
      ms: "Penyerapan penuh",
    },
  },
];

export const LEARNING_PROVIDER_OPTIONS: FixedOptionItem[] = [
  {
    id: "free_open",
    label: {
      en: "Free & Open-Source",
      zh: "免费与开源资源",
      ms: "Percuma & Sumber Terbuka",
    },
    desc: {
      en: "Coursera Audit, YouTube, edX, MIT OpenCourseWare",
      zh: "Coursera 免费旁听、edX、MIT 公开课及优质开源教程",
      ms: "Audit Coursera, YouTube, edX, MIT OpenCourseWare",
    },
  },
  {
    id: "hrd_corp",
    label: {
      en: "HRD Corp Claimable",
      zh: "HRD Corp 可索赔培训",
      ms: "Tuntutan HRD Corp",
    },
    desc: {
      en: "Certified Malaysian enterprise training programs",
      zh: "马来西亚人力资源发展机构（HRD Corp）认证企业培训",
      ms: "Program latihan perusahaan Malaysia yang diperakui",
    },
  },
  {
    id: "industry_cert",
    label: {
      en: "Vendor Certifications",
      zh: "行业与厂商专业认证",
      ms: "Pensijilan Vendor",
    },
    desc: {
      en: "AWS, Google Cloud, Microsoft, Cisco, NVIDIA",
      zh: "AWS、Google Cloud、Microsoft、Cisco、NVIDIA 厂商认证",
      ms: "AWS, Google Cloud, Microsoft, Cisco, NVIDIA",
    },
  },
  {
    id: "university",
    label: {
      en: "University Micro-Credentials",
      zh: "大学微凭证课程",
      ms: "Mikrokredensial Universiti",
    },
    desc: {
      en: "Accredited modular higher-education credits",
      zh: "高校正规认证模块化学分与专业微凭证",
      ms: "Kredit pendidikan tinggi modular bertauliah",
    },
  },
];

export const TARGET_SECTORS_DATA: { id: string; label: LocalizedText; aliases?: string[] }[] = [
  {
    id: "Artificial Intelligence & Machine Learning",
    label: {
      en: "Artificial Intelligence & Machine Learning",
      zh: "人工智能与机器学习",
      ms: "Kecerdasan Buatan & Pembelajaran Mesin",
    },
    aliases: [
      "artificial intelligence & machine learning",
      "ai & machine learning",
      "ai & ml",
      "ai/ml",
      "artificial intelligence",
      "machine learning",
      "ai",
      "ml",
      "deep learning",
      "genai",
      "generative ai",
      "人工智能",
      "机器学习",
      "深度学习",
      "kecerdasan buatan",
      "pembelajaran mesin",
    ],
  },
  {
    id: "Clean Energy & ESG",
    label: {
      en: "Clean Energy & ESG",
      zh: "清洁能源与 ESG",
      ms: "Tenaga Bersih & ESG",
    },
    aliases: [
      "clean energy & esg",
      "clean energy",
      "esg",
      "green energy",
      "renewable energy",
      "sustainability",
      "清洁能源",
      "绿色能源",
      "可持续发展",
      "tenaga bersih",
      "tenaga boleh diperbaharui",
    ],
  },
  {
    id: "Cloud & Infrastructure",
    label: {
      en: "Cloud & Infrastructure",
      zh: "云计算与基础设施",
      ms: "Awan & Infrastruktur",
    },
    aliases: [
      "cloud & infrastructure",
      "cloud computing",
      "cloud services",
      "infrastructure",
      "cloud",
      "devops",
      "aws",
      "azure",
      "gcp",
      "云计算",
      "云服务",
      "基础设施",
      "perkhidmatan awan",
      "infrastruktur",
    ],
  },
  {
    id: "Cybersecurity & Zero Trust",
    label: {
      en: "Cybersecurity & Zero Trust",
      zh: "网络安全与零信任架构",
      ms: "Keselamatan Siber & Zero Trust",
    },
    aliases: [
      "cybersecurity & zero trust",
      "cybersecurity",
      "cyber security",
      "zero trust",
      "infosec",
      "information security",
      "security",
      "网络安全",
      "信息安全",
      "零信任",
      "keselamatan siber",
    ],
  },
  {
    id: "Modern Finance & FinTech",
    label: {
      en: "Modern Finance & FinTech",
      zh: "现代金融与金融科技 (FinTech)",
      ms: "Kewangan Moden & FinTech",
    },
    aliases: [
      "modern finance & fintech",
      "modern finance",
      "fintech",
      "financial services",
      "banking",
      "finance",
      "financial",
      "金融科技",
      "现代金融",
      "金融服务",
      "银行",
      "kewangan moden",
      "perbankan",
    ],
  },
  {
    id: "Software Engineering",
    label: {
      en: "Software Engineering",
      zh: "软件工程与系统开发",
      ms: "Kejuruteraan Perisian",
    },
    aliases: [
      "software engineering",
      "software development",
      "web development",
      "software & cloud services",
      "software",
      "programming",
      "full stack",
      "软件工程",
      "软件开发",
      "系统开发",
      "kejuruteraan perisian",
      "pembangunan perisian",
    ],
  },
  {
    id: "Smart Logistics & Supply Chain",
    label: {
      en: "Smart Logistics & Supply Chain",
      zh: "智慧物流与供应链",
      ms: "Logistik Pintar & Rantaian Bekalan",
    },
    aliases: [
      "smart logistics & supply chain",
      "smart logistics",
      "logistics",
      "supply chain",
      "procurement",
      "智慧物流",
      "智慧物流与供应链",
      "物流",
      "供应链",
      "logistik pintar",
      "rantaian bekalan",
    ],
  },
  {
    id: "Healthcare & BioTech",
    label: {
      en: "Healthcare & BioTech",
      zh: "医疗健康与生物科技",
      ms: "Penjagaan Kesihatan & Bioteknologi",
    },
    aliases: [
      "healthcare & biotech",
      "healthcare",
      "biotech",
      "healthtech",
      "medical",
      "health",
      "医疗健康与生物科技",
      "医疗健康",
      "生物科技",
      "医疗",
      "penjagaan kesihatan",
      "bioteknologi",
    ],
  },
  {
    id: "Industrial Automation",
    label: {
      en: "Industrial Automation",
      zh: "工业自动化与机器人",
      ms: "Automasi Industri",
    },
    aliases: [
      "industrial automation",
      "industrial automation & robotics",
      "robotics",
      "automation",
      "industry 4.0",
      "iot",
      "工业自动化与机器人",
      "工业自动化",
      "自动化",
      "机器人",
      "工业4.0",
      "automasi industri",
      "robotik",
    ],
  },
];

// Helper to safely get localized text with fallback to English
export function getLocalized(textObj: LocalizedText | undefined, locale: string): string {
  if (!textObj) return "";
  if (locale === "zh") return textObj.zh || textObj.en;
  if (locale === "ms") return textObj.ms || textObj.en;
  return textObj.en;
}

// Find a matching standard sector by ID, label, or aliases
export function findSectorDefinition(val?: string) {
  if (!val || typeof val !== "string") return null;
  const s = val.trim().toLowerCase();
  for (const sec of TARGET_SECTORS_DATA) {
    if (
      sec.id.toLowerCase() === s ||
      sec.label.en.toLowerCase() === s ||
      sec.label.zh.toLowerCase() === s ||
      sec.label.ms.toLowerCase() === s
    ) {
      return sec;
    }
    if (sec.aliases && sec.aliases.some((alias) => alias.toLowerCase() === s || s === alias.toLowerCase())) {
      return sec;
    }
  }
  // Secondary fuzzy check
  for (const sec of TARGET_SECTORS_DATA) {
    if (sec.aliases && sec.aliases.some((alias) => s.includes(alias.toLowerCase()))) {
      return sec;
    }
  }
  return null;
}

// Get localized label for any sector string (standard ID or alias)
export function getSectorLocalizedLabel(sectorIdOrName: string, locale: string): string {
  const matched = findSectorDefinition(sectorIdOrName);
  if (matched) {
    return getLocalized(matched.label, locale);
  }
  return sectorIdOrName;
}

// ============================================================================
// Normalization Parsers for Intake / Profile / Prefill
// ============================================================================

export function normalizeWorkArrangement(val?: any): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim().toLowerCase();
  if (
    s === "any" ||
    s.includes("flexible") ||
    s.includes("flex") ||
    s.includes("任意") ||
    s.includes("灵活") ||
    s.includes("mana-mana") ||
    s.includes("bebas")
  ) {
    return "any";
  }
  if (
    s.includes("remote") ||
    s.includes("远程") ||
    s.includes("jauh") ||
    s.includes("rumah") ||
    s.includes("wfh")
  ) {
    return "remote";
  }
  if (s.includes("hybrid") || s.includes("混合") || s.includes("hibrid")) {
    return "hybrid";
  }
  if (
    s.includes("onsite") ||
    s.includes("on-site") ||
    s.includes("现场") ||
    s.includes("di tapak") ||
    s.includes("pejabat") ||
    s.includes("office")
  ) {
    return "onsite";
  }
  if (["any", "remote", "hybrid", "onsite"].includes(s)) return s;
  return val;
}

export function normalizeEmploymentStatus(val?: any): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim().toLowerCase();
  if (
    s === "employed_at_risk" ||
    s.includes("at_risk") ||
    s.includes("at risk") ||
    s.includes("冲击") ||
    s.includes("berisiko")
  ) {
    return "employed_at_risk";
  }
  if (
    s === "fresh_grad_student" ||
    s.includes("fresh") ||
    s.includes("grad") ||
    s.includes("student") ||
    s.includes("毕业") ||
    s.includes("学生") ||
    s.includes("pelajar")
  ) {
    return "fresh_grad_student";
  }
  if (
    s === "career_switcher" ||
    s.includes("switch") ||
    s.includes("pivot") ||
    s.includes("转型") ||
    s.includes("penukar")
  ) {
    return "career_switcher";
  }
  if (
    s === "jobseeker" ||
    s.includes("seeker") ||
    s.includes("unemployed") ||
    s.includes("求职") ||
    s.includes("待业") ||
    s.includes("pencari")
  ) {
    return "jobseeker";
  }
  if (s.includes("employed") || s.includes("在职") || s.includes("bekerja")) {
    return "employed_at_risk";
  }
  if (["employed_at_risk", "fresh_grad_student", "career_switcher", "jobseeker"].includes(val)) {
    return val;
  }
  return val;
}

export function normalizeYearsOfExperience(val?: any): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim().toLowerCase();
  if (
    s === "0-1" ||
    s.includes("<1") ||
    s.includes("< 1") ||
    s.includes("entry") ||
    s.includes("应届") ||
    s.includes("0 - 1") ||
    s === "0" ||
    s === "1"
  ) {
    return "0-1";
  }
  if (
    s === "1-3" ||
    s.includes("1-3") ||
    s.includes("1 - 3") ||
    s.includes("associate") ||
    s === "2" ||
    s === "3"
  ) {
    return "1-3";
  }
  if (
    s === "3-5" ||
    s.includes("3-5") ||
    s.includes("3 - 5") ||
    s.includes("mid") ||
    s === "4" ||
    s === "5"
  ) {
    return "3-5";
  }
  if (
    s === "5-10" ||
    s.includes("5-10") ||
    s.includes("5 - 10") ||
    s.includes("5+") ||
    s.includes("senior") ||
    s.includes("资深") ||
    s.includes("5+ years")
  ) {
    return "5-10";
  }
  if (
    s === "10+" ||
    s.includes("10+") ||
    s.includes(">10") ||
    s.includes("10 plus") ||
    s.includes("lead") ||
    s.includes("director") ||
    s.includes("总监") ||
    s.includes("10年以上")
  ) {
    return "10+";
  }
  // Try extracting number
  const numMatch = s.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (num <= 1) return "0-1";
    if (num <= 3) return "1-3";
    if (num <= 5) return "3-5";
    if (num <= 10) return "5-10";
    return "10+";
  }
  return val;
}

export function normalizeEducationLevel(val?: any): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim().toLowerCase();
  if (s.includes("doctor") || s.includes("phd") || s.includes("博士") || s.includes("falsafah")) {
    return "Doctorate / PhD";
  }
  if (
    s.includes("master") ||
    s.includes("postgrad") ||
    s.includes("硕士") ||
    s.includes("研究生") ||
    s.includes("sarjana")
  ) {
    return "Master's / Postgraduate";
  }
  if (
    s.includes("bachelor") ||
    s.includes("degree") ||
    s.includes("undergrad") ||
    s.includes("学士") ||
    s.includes("本科") ||
    s.includes("ijazah")
  ) {
    return "Bachelor's Degree";
  }
  if (
    s.includes("diploma") ||
    s.includes("vocation") ||
    s.includes("tvet") ||
    s.includes("大专") ||
    s.includes("专科") ||
    s.includes("sijil")
  ) {
    return "Diploma / Vocational (TVET)";
  }
  if (
    s.includes("high school") ||
    s.includes("secondary") ||
    s.includes("spm") ||
    s.includes("stpm") ||
    s.includes("高中") ||
    s.includes("中五") ||
    s.includes("menengah")
  ) {
    return "Secondary / High School";
  }
  if (
    s.includes("self") ||
    s.includes("cert") ||
    s.includes("自学") ||
    s.includes("认证") ||
    s.includes("sendiri")
  ) {
    return "Self-Taught / Industry Certified";
  }
  return val;
}

export function normalizeIndustry(val?: any): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim().toLowerCase();
  if (
    s.includes("software") ||
    s.includes("cloud") ||
    s.includes("软件") ||
    s.includes("perisian") ||
    s.includes("tech") ||
    s.includes("it")
  ) {
    return "Software & Cloud Services";
  }
  if (
    s.includes("bank") ||
    s.includes("financ") ||
    s.includes("金融") ||
    s.includes("银行") ||
    s.includes("perbankan") ||
    s.includes("kewangan")
  ) {
    return "Banking & Financial Services";
  }
  if (
    s.includes("clean energy") ||
    s.includes("esg") ||
    s.includes("清洁能源") ||
    s.includes("green") ||
    s.includes("tenaga bersih")
  ) {
    return "Clean Energy & ESG";
  }
  if (
    s.includes("health") ||
    s.includes("biotech") ||
    s.includes("医疗") ||
    s.includes("生物") ||
    s.includes("kesihatan") ||
    s.includes("perubatan")
  ) {
    return "Healthcare & BioTech";
  }
  if (
    s.includes("robot") ||
    s.includes("automat") ||
    s.includes("自动化") ||
    s.includes("机器人") ||
    s.includes("robotik")
  ) {
    return "Industrial Automation & Robotics";
  }
  if (
    s.includes("logistic") ||
    s.includes("supply") ||
    s.includes("物流") ||
    s.includes("供应链") ||
    s.includes("rantaian bekalan")
  ) {
    return "Smart Logistics & Supply Chain";
  }
  if (
    s.includes("cleric") ||
    s.includes("admin") ||
    s.includes("行政") ||
    s.includes("文职") ||
    s.includes("perkeranian") ||
    s.includes("pentadbiran")
  ) {
    return "Clerical & Administrative";
  }
  if (
    s.includes("market") ||
    s.includes("media") ||
    s.includes("creative") ||
    s.includes("营销") ||
    s.includes("媒体") ||
    s.includes("pemasaran")
  ) {
    return "Marketing & Creative Media";
  }
  if (
    s.includes("public") ||
    s.includes("educat") ||
    s.includes("政府") ||
    s.includes("公共") ||
    s.includes("教育") ||
    s.includes("pendidikan")
  ) {
    return "Public Sector & Education";
  }
  return val;
}

export function normalizeCareerGoal(val?: any): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim().toLowerCase();
  if (
    s === "upskill" ||
    s.includes("up") ||
    s.includes("提升") ||
    s.includes("进阶") ||
    s.includes("peningkatan")
  ) {
    return "upskill";
  }
  if (
    s === "reskill" ||
    s.includes("re") ||
    s.includes("重塑") ||
    s.includes("转型") ||
    s.includes("semula")
  ) {
    return "reskill";
  }
  if (
    s === "explore" ||
    s.includes("ex") ||
    s.includes("探索") ||
    s.includes("meneroka")
  ) {
    return "explore";
  }
  if (["upskill", "reskill", "explore"].includes(val)) return val;
  return val;
}

export function normalizeWeeklyCommitmentHours(val?: any): string {
  if (!val || typeof val !== "string") return "";
  const s = val.trim().toLowerCase();
  if (s === "1-3" || s.includes("1-3") || s.includes("1 - 3") || s.includes("1-3小时") || s.includes("1-3 jam")) {
    return "1-3";
  }
  if (s === "3-5" || s.includes("3-5") || s.includes("3 - 5") || s.includes("3-5小时") || s.includes("3-5 jam")) {
    return "3-5";
  }
  if (s === "5-10" || s.includes("5-10") || s.includes("5 - 10") || s.includes("5-10小时") || s.includes("5-10 jam")) {
    return "5-10";
  }
  if (s === "10+" || s.includes("10+") || s.includes(">10") || s.includes("10+小时") || s.includes("10+ jam")) {
    return "10+";
  }
  return val;
}

export function normalizeLearningProviders(vals?: any[]): string[] {
  if (!Array.isArray(vals)) return [];
  const set = new Set<string>();
  for (const v of vals) {
    if (!v || typeof v !== "string") continue;
    const s = v.trim().toLowerCase();
    if (s.includes("free") || s.includes("open") || s.includes("免费") || s.includes("开源") || s.includes("percuma")) {
      set.add("free_open");
    } else if (s.includes("hrd") || s.includes("corp") || s.includes("政府补贴")) {
      set.add("hrd_corp");
    } else if (s.includes("cert") || s.includes("vendor") || s.includes("认证") || s.includes("industri")) {
      set.add("industry_cert");
    } else if (s.includes("univ") || s.includes("academic") || s.includes("大学") || s.includes("kolej")) {
      set.add("university");
    } else {
      set.add(v);
    }
  }
  return Array.from(set);
}

export function normalizeTargetSectors(vals?: any[]): string[] {
  if (!Array.isArray(vals)) return [];
  const result: string[] = [];
  for (const item of vals) {
    if (!item || typeof item !== "string") continue;
    const s = item.trim().toLowerCase();

    // Special case for combined strings like "Cloud & Cybersecurity"
    if (s.includes("cloud") && (s.includes("cyber") || s.includes("security"))) {
      if (!result.includes("Cloud & Infrastructure")) result.push("Cloud & Infrastructure");
      if (!result.includes("Cybersecurity & Zero Trust")) result.push("Cybersecurity & Zero Trust");
      continue;
    }

    const matched = findSectorDefinition(item);
    if (matched) {
      if (!result.includes(matched.id)) result.push(matched.id);
    } else {
      if (!result.includes(item)) result.push(item);
    }
  }
  return result;
}

/**
 * Normalizes an entire incoming profile object (whether from semantic extraction,
 * DB fetch, or external payload) so that fixed options are converted to standard IDs
 * and non-fixed fields retain their exact values.
 */
export function normalizeProfileForForm(raw: any): any {
  if (!raw) return raw;
  return {
    ...raw,
    employmentStatus: normalizeEmploymentStatus(raw.employmentStatus),
    industry: normalizeIndustry(raw.industry),
    educationLevel: normalizeEducationLevel(raw.educationLevel),
    yearsOfExperience: normalizeYearsOfExperience(raw.yearsOfExperience),
    careerGoal: normalizeCareerGoal(raw.careerGoal),
    workArrangement: normalizeWorkArrangement(raw.workArrangement),
    weeklyCommitmentHours: normalizeWeeklyCommitmentHours(raw.weeklyCommitmentHours),
    learningProviders: normalizeLearningProviders(raw.learningProviders),
    targetSectors: normalizeTargetSectors(raw.targetSectors),
    // Non-fixed / freeform fields are kept directly as existing results
    currentJobTitle: raw.currentJobTitle ?? "",
    targetJobTitle: raw.targetJobTitle ?? "",
    casualDescription: raw.casualDescription ?? "",
    skills: raw.skills ?? [],
    toolsAndSoftware: raw.toolsAndSoftware ?? [],
    languages: raw.languages ?? [],
  };
}
