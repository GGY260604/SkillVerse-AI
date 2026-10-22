// --- Profile Normalization Utilities ---
// Normalize multilingual profile intake fields, taxonomies, and option dictionaries across database records.


// Step 1: Locale Message Catalogs
// Synchronously import localization catalogs to resolve option labels, descriptions, and subtitles.
import enMessages from "../../messages/en.json";
import zhMessages from "../../messages/zh.json";
import msMessages from "../../messages/ms.json";

// Type definitions for localized text attributes and option objects.
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

const messageCatalogs: Record<string, typeof enMessages> = {
  en: enMessages,
  zh: zhMessages,
  ms: msMessages,
};

// Helper function to build localized text dynamically from message catalogs.
function createLocalizedOption(
  category: keyof typeof enMessages.profile.options,
  id: string
): FixedOptionItem {
  return {
    id,
    label: {
      en: (enMessages.profile.options[category] as any)?.[id]?.label || id,
      zh: (zhMessages.profile.options[category] as any)?.[id]?.label || (enMessages.profile.options[category] as any)?.[id]?.label || id,
      ms: (msMessages.profile.options[category] as any)?.[id]?.label || (enMessages.profile.options[category] as any)?.[id]?.label || id,
    },
    desc: (enMessages.profile.options[category] as any)?.[id]?.desc
      ? {
          en: (enMessages.profile.options[category] as any)?.[id]?.desc,
          zh: (zhMessages.profile.options[category] as any)?.[id]?.desc || (enMessages.profile.options[category] as any)?.[id]?.desc,
          ms: (msMessages.profile.options[category] as any)?.[id]?.desc || (enMessages.profile.options[category] as any)?.[id]?.desc,
        }
      : undefined,
    sub: (enMessages.profile.options[category] as any)?.[id]?.sub
      ? {
          en: (enMessages.profile.options[category] as any)?.[id]?.sub,
          zh: (zhMessages.profile.options[category] as any)?.[id]?.sub || (enMessages.profile.options[category] as any)?.[id]?.sub,
          ms: (msMessages.profile.options[category] as any)?.[id]?.sub || (enMessages.profile.options[category] as any)?.[id]?.sub,
        }
      : undefined,
  };
}

// Step 2: Canonical Option Lists
// Standard option arrays backed by message catalog entries.
export const EMPLOYMENT_STATUS_OPTIONS: FixedOptionItem[] = [
  "employed_at_risk",
  "fresh_grad_student",
  "career_switcher",
  "jobseeker",
].map((id) => createLocalizedOption("employmentStatus", id));

export const WORK_ARRANGEMENT_OPTIONS: FixedOptionItem[] = [
  "any",
  "remote",
  "hybrid",
  "onsite",
].map((id) => createLocalizedOption("workArrangement", id));

export const CAREER_GOAL_OPTIONS: FixedOptionItem[] = [
  "upskill",
  "reskill",
  "explore",
].map((id) => createLocalizedOption("careerGoal", id));

export const YEARS_OF_EXPERIENCE_OPTIONS: FixedOptionItem[] = [
  "0-1",
  "1-3",
  "3-5",
  "5-10",
  "10+",
].map((id) => createLocalizedOption("yearsOfExperience", id));

export const INDUSTRY_OPTIONS: FixedOptionItem[] = [
  "Software & Cloud Services",
  "Banking & Financial Services",
  "Clean Energy & ESG",
  "Healthcare & BioTech",
  "Industrial Automation & Robotics",
  "Smart Logistics & Supply Chain",
  "Clerical & Administrative",
  "Marketing & Creative Media",
  "Public Sector & Education",
].map((id) => createLocalizedOption("industry", id));

export const EDUCATION_LEVEL_OPTIONS: FixedOptionItem[] = [
  "Secondary / High School",
  "Diploma / Vocational (TVET)",
  "Bachelor's Degree",
  "Master's / Postgraduate",
  "Doctorate / PhD",
  "Self-Taught / Industry Certified",
].map((id) => createLocalizedOption("educationLevel", id));

export const WEEKLY_COMMITMENT_OPTIONS: FixedOptionItem[] = [
  "1-3",
  "3-5",
  "5-10",
  "10+",
].map((id) => createLocalizedOption("weeklyCommitmentHours", id));

export const LEARNING_PROVIDER_OPTIONS: FixedOptionItem[] = [
  "free_open",
  "hrd_corp",
  "industry_cert",
  "university",
].map((id) => createLocalizedOption("learningProviders", id));

// Step 3: Target Growth Sectors and Aliases
// Taxonomy definition for career transition pathways and semantic matching aliases.
const SECTOR_ALIASES_MAP: Record<string, string[]> = {
  "Artificial Intelligence & Machine Learning": [
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
  "Clean Energy & ESG": [
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
  "Cloud & Infrastructure": [
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
  "Cybersecurity & Zero Trust": [
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
  "Modern Finance & FinTech": [
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
  "Software Engineering": [
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
  "Smart Logistics & Supply Chain": [
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
  "Healthcare & BioTech": [
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
  "Industrial Automation": [
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
};

export const TARGET_SECTORS_DATA: { id: string; label: LocalizedText; aliases?: string[] }[] = [
  "Artificial Intelligence & Machine Learning",
  "Clean Energy & ESG",
  "Cloud & Infrastructure",
  "Cybersecurity & Zero Trust",
  "Modern Finance & FinTech",
  "Software Engineering",
  "Smart Logistics & Supply Chain",
  "Healthcare & BioTech",
  "Industrial Automation",
].map((id) => ({
  id,
  label: createLocalizedOption("targetSectors", id).label,
  aliases: SECTOR_ALIASES_MAP[id] || [],
}));

// Step 4: Locale Resolution Helpers
// Safely retrieve localized string matching the active locale code, defaulting to English.
export function getLocalized(textObj: LocalizedText | undefined, locale: string): string {
  if (!textObj) return "";
  if (locale === "zh") return textObj.zh || textObj.en;
  if (locale === "ms") return textObj.ms || textObj.en;
  return textObj.en;
}

// Find a matching standard sector definition by ID, multilingual label, or registered alias.
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

// Retrieve localized label for any sector string or return original identifier when unmatched.
export function getSectorLocalizedLabel(sectorIdOrName: string, locale: string): string {
  const matched = findSectorDefinition(sectorIdOrName);
  if (matched) {
    return getLocalized(matched.label, locale);
  }
  return sectorIdOrName;
}


// --- Normalization Parsers ---
// Standardize incoming profile form inputs to canonical database identifiers.


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

// Step 1: Normalize Intake Profile
// Convert fixed dropdown options to canonical identifiers while preserving non-fixed fields.
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
