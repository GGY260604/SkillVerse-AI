import type { QuizResponseData } from "@/components/analysis/quiz/PhaseQuizModal";

// -------------------------------------------------------------
// Debugging / Testing Only (Quiz)
// -------------------------------------------------------------

// Keep this constant false for live deployments.
export const USE_PHASE_QUIZ_MODAL_TESTING = false;

// Keep this constant false to request quizzes from the API.
export const USE_QUIZ_MOCK_DATA = true;

// -------------------------------------------------------------

// --- Mock Quiz Data ---
// Every mock quiz question uses option A as the correct answer.
export const MOCK_QUIZ_BY_LOCALE: Record<string, QuizResponseData> = {
  en: {
    phaseIndex: 1,
    phaseTitle: "Core Cloud Architecture & Resilient Systems",
    expReward: 35,
    expDifficultyTier: "Phase 1 Mastery (35 EXP)",
    evaluationReason: "Verified technical comprehension of cloud deployment patterns, API idempotency, and distributed resilience.",
    passingScore: 10,
    questions: [
      {
        id: 1,
        question: "Which deployment strategy maintains two identical production environments (one active and one idle) to allow instant traffic switching and zero-downtime updates?",
        options: [
          "Blue-Green Deployment",
          "Rolling Update",
          "Canary Deployment",
          "Recreate Deployment"
        ],
        correctIndex: 0,
        explanation: "Blue-Green deployment provisions two identical environments, routing live traffic from Blue to Green via the load balancer with instantaneous rollback capability."
      },
      {
        id: 2,
        question: "In a RESTful microservice architecture, which HTTP method is guaranteed to be idempotent according to RFC specifications?",
        options: [
          "PUT",
          "POST",
          "PATCH",
          "CONNECT"
        ],
        correctIndex: 0,
        explanation: "HTTP PUT is idempotent; multiple identical requests have the exact same side-effects on server state as a single request."
      },
      {
        id: 3,
        question: "When optimizing relational database queries involving range scans (e.g. BETWEEN or <), which index data structure is standard in PostgreSQL?",
        options: [
          "B-Tree",
          "Hash Index",
          "GIN Index",
          "BRIN with fixed-offset"
        ],
        correctIndex: 0,
        explanation: "B-Tree indexes maintain sorted leaf nodes, making them optimal for equality comparisons as well as range lookups."
      },
      {
        id: 4,
        question: "What problem occurs when a heavily requested cache key expires and hundreds of concurrent requests simultaneously hit the backing database?",
        options: [
          "Cache Stampede (Thundering Herd)",
          "Cache Penetration",
          "Dirty Read",
          "Split-Brain Syndrome"
        ],
        correctIndex: 0,
        explanation: "Cache stampede occurs when a hot cache item expires and multiple concurrent threads bypass cache simultaneously to recalculate or query the database."
      },
      {
        id: 5,
        question: "In JWT (JSON Web Token) authentication, what is the best practice for securely storing refresh tokens in browser clients to prevent XSS attacks?",
        options: [
          "HttpOnly, Secure SameSite Cookie",
          "Browser localStorage",
          "Browser sessionStorage",
          "In-memory Redux state without rotation"
        ],
        correctIndex: 0,
        explanation: "HttpOnly cookies cannot be accessed by client-side JavaScript, effectively neutralizing token theft via Cross-Site Scripting (XSS)."
      },
      {
        id: 6,
        question: "In Kubernetes, which probe is used by the kubelet to determine whether a container is ready to start accepting network traffic?",
        options: [
          "Readiness Probe",
          "Liveness Probe",
          "Startup Probe",
          "Heartbeat Daemon"
        ],
        correctIndex: 0,
        explanation: "Readiness probes signal to the Kubernetes Service whether a pod should receive incoming traffic. Unready pods are excluded from service endpoints."
      },
      {
        id: 7,
        question: "Which SOLID design principle asserts that software entities should be open for extension, but closed for modification?",
        options: [
          "Open-Closed Principle (OCP)",
          "Single Responsibility Principle (SRP)",
          "Liskov Substitution Principle (LSP)",
          "Interface Segregation Principle (ISP)"
        ],
        correctIndex: 0,
        explanation: "The Open-Closed Principle encourages extending component functionality via polymorphism or composition rather than altering existing, verified source code."
      },
      {
        id: 8,
        question: "In an event-driven system, what messaging semantic guarantees that an event is processed at least once, potentially requiring consumer idempotency?",
        options: [
          "At-least-once Delivery",
          "At-most-once Delivery",
          "Exactly-once without deduplication",
          "Best-effort Broadcast"
        ],
        correctIndex: 0,
        explanation: "At-least-once delivery ensures messages are never dropped, but consumers must be idempotent to handle potential duplicate message deliveries safely."
      },
      {
        id: 9,
        question: "In Next.js App Router and modern React architectures, what is the main benefit of React Server Components (RSC)?",
        options: [
          "Reducing client JavaScript bundle size by executing components on the server",
          "Enabling client-side event listeners like onClick directly on the server",
          "Eliminating all CSS requirements across pages",
          "Replacing WebSockets for real-time bidirectional streams"
        ],
        correctIndex: 0,
        explanation: "React Server Components execute exclusively on the server, allowing zero client bundle overhead for large dependencies and database access logic."
      },
      {
        id: 10,
        question: "In distributed tracing (e.g. OpenTelemetry), which identifier connects all spans belonging to a single end-to-end request across multiple microservices?",
        options: [
          "Trace ID",
          "Span ID",
          "Session Hash",
          "Host Node IP"
        ],
        correctIndex: 0,
        explanation: "A Trace ID uniquely identifies an entire distributed transaction across all service boundaries, whereas each individual unit of work has its own Span ID."
      }
    ]
  },
  zh: {
    phaseIndex: 1,
    phaseTitle: "核心云原生架构与弹性分布式系统",
    expReward: 35,
    expDifficultyTier: "阶段 1 熟练认证 (35 EXP)",
    evaluationReason: "已全面验证云架构部署、API 幂等性、缓存防击穿与微服务链路追踪的技术掌握度。",
    passingScore: 10,
    questions: [
      {
        id: 1,
        question: "在现代云原生架构中，哪种部署策略通过维护两组相同的生产环境以实现零停机时间更新？",
        options: [
          "蓝绿部署 (Blue-Green Deployment)",
          "大爆炸式全量切换 (Big Bang Migration)",
          "滚动替换部署 (Rolling Update)",
          "原地重启覆盖 (Recreate Deployment)"
        ],
        correctIndex: 0,
        explanation: "蓝绿部署通过并行运行两个相同的生产集群（Blue 与 Green），借助负载均衡快速切换流量，实现零停机与极速回滚。"
      },
      {
        id: 2,
        question: "在标准 RESTful API 规范中，以下哪个 HTTP 方法被严格定义为具有幂等性（Idempotent）？",
        options: [
          "PUT",
          "POST",
          "PATCH",
          "CONNECT"
        ],
        correctIndex: 0,
        explanation: "HTTP PUT 具有幂等性；连续发送多次相同的 PUT 请求，服务器端资源的状态与单次执行结果完全一致。"
      },
      {
        id: 3,
        question: "在优化涉及范围查询（例如 BETWEEN 或 < 运算）的关系型数据库索引时，PostgreSQL 最核心的标准索引数据结构是什么？",
        options: [
          "B-Tree (B 树索引)",
          "哈希索引 (Hash Index)",
          "GIN 倒排索引",
          "BRIN 块范围索引"
        ],
        correctIndex: 0,
        explanation: "B-Tree 索引保持叶节点双向有序链接，在执行精确匹配以及范围扫描时性能极其出色。"
      },
      {
        id: 4,
        question: "当某个高频访问的热点缓存键瞬间过期，导致海量并发请求瞬间直击底层数据库的现象称为什么？",
        options: [
          "缓存击穿 / 惊群效应 (Cache Stampede)",
          "缓存穿透 (Cache Penetration)",
          "脏读 (Dirty Read)",
          "脑裂现象 (Split-Brain)"
        ],
        correctIndex: 0,
        explanation: "缓存击穿（Cache Stampede）指热点 Key 过期时大量并发线程同时穿透缓存去查询数据库重建缓存，引发数据库过载。"
      },
      {
        id: 5,
        question: "在基于 JWT 的认证架构中，为防止 XSS（跨站脚本攻击）窃取身份凭证，刷新令牌（Refresh Token）的最佳存储实践是什么？",
        options: [
          "带有 HttpOnly、Secure 与 SameSite 标记的 Cookie",
          "浏览器 localStorage",
          "浏览器 sessionStorage",
          "内存 Redux 存储且不进行轮换"
        ],
        correctIndex: 0,
        explanation: "设置了 HttpOnly 属性的 Cookie 无法被客户端 JavaScript 代码直接读取，能彻底防范 XSS 脚本窃取 Token。"
      },
      {
        id: 6,
        question: "在 Kubernetes 集群中，kubelet 使用哪种探针来确认 Pod 容器是否已准备就绪并可接入网络流量？",
        options: [
          "就绪探针 (Readiness Probe)",
          "存活探针 (Liveness Probe)",
          "启动探针 (Startup Probe)",
          "心跳守护进程 (Heartbeat Daemon)"
        ],
        correctIndex: 0,
        explanation: "就绪探针（Readiness Probe）用于向 Service 确认 Pod 是否可以处理业务流量，未就绪的 Pod 不会被分配流量。"
      },
      {
        id: 7,
        question: "面向对象 SOLID 设计原则中，规定“软件实体应当对扩展开放，对修改关闭”的是哪一项原则？",
        options: [
          "开闭原则 (Open-Closed Principle, OCP)",
          "单一职责原则 (SRP)",
          "里氏替换原则 (LSP)",
          "接口隔离原则 (ISP)"
        ],
        correctIndex: 0,
        explanation: "开闭原则（OCP）倡导通过多态和抽象机制进行功能拓展，避免在新增功能时破坏已有已验证的代码。"
      },
      {
        id: 8,
        question: "在事件驱动架构（EDA）中，哪种消息传递语义保证消息绝不会丢失，但要求消费者端必须具备幂等处理能力？",
        options: [
          "至少一次传递 (At-least-once)",
          "至多一次传递 (At-most-once)",
          "无去重的精确一次",
          "尽力而为广播 (Best-effort)"
        ],
        correctIndex: 0,
        explanation: "At-least-once 确保消息即使在网络闪断下也能重试送达，但可能产生重复消息，因此消费端必须实现幂等机制。"
      },
      {
        id: 9,
        question: "在 Next.js App Router 与现代 React 架构中，使用 React 服务端组件（RSC）的最核心优势是什么？",
        options: [
          "在服务端执行组件渲染，大幅减少下载到客户端的 JavaScript 包体积",
          "直接在服务端绑定并执行浏览器 onClick 等客户端交互事件",
          "免去所有 CSS 样式的定义与编写",
          "完全替代 WebSocket 实现双向全双工通信"
        ],
        correctIndex: 0,
        explanation: "React 服务端组件（RSC）代码完全运行在 Node.js 服务端，庞大的渲染依赖库不会打包进客户端 JS Bundle 中。"
      },
      {
        id: 10,
        question: "在微服务分布式链路追踪（如 OpenTelemetry）中，哪一个全局唯一标识符用于串联单次端到端请求跨越所有服务节点的全部 Span？",
        options: [
          "Trace ID",
          "Span ID",
          "Session Hash",
          "Host Node IP"
        ],
        correctIndex: 0,
        explanation: "Trace ID 代表整条跨微服务调用链的唯一链路 ID，所有微服务子调用共享同一 Trace ID，并各自拥有不同的 Span ID。"
      }
    ]
  },
  ms: {
    phaseIndex: 1,
    phaseTitle: "Seni Bina Awan Teras & Sistem Teragih Berdaya Tahan",
    expReward: 35,
    expDifficultyTier: "Penguasaan Fasa 1 (35 EXP)",
    evaluationReason: "Kefahaman teknikal disahkan mengenai corak penggunaan awan, idempotensi API dan kebolehskalaan teragih.",
    passingScore: 10,
    questions: [
      {
        id: 1,
        question: "Strategi penggunaan awan manakah yang mengekalkan dua persekitaran pengeluaran serupa untuk pertukaran trafik pantas tanpa masa henti?",
        options: [
          "Pelaksanaan Biru-Hijau (Blue-Green Deployment)",
          "Kemas Kini Bergolek (Rolling Update)",
          "Pelaksanaan Kenari (Canary Deployment)",
          "Cipta Semula (Recreate Deployment)"
        ],
        correctIndex: 0,
        explanation: "Pelaksanaan Biru-Hijau mengekalkan dua kluster serupa, membolehkan trafik dialihkan secara serta-merta tanpa sebarang gangguan sistem."
      },
      {
        id: 2,
        question: "Dalam seni bina RESTful API, kaedah HTTP manakah yang dijamin bersifat idempoten mengikut piawaian RFC?",
        options: [
          "PUT",
          "POST",
          "PATCH",
          "CONNECT"
        ],
        correctIndex: 0,
        explanation: "Kaedah PUT adalah idempoten; permintaan berulang yang sama menghasilkan kesan sampingan yang serupa dengan satu permintaan."
      },
      {
        id: 3,
        question: "Struktur data indeks manakah yang menjadi piawaian dalam PostgreSQL untuk mengoptimumkan carian julat (seperti BETWEEN)?",
        options: [
          "B-Tree",
          "Indeks Hash",
          "Indeks GIN",
          "Indeks BRIN"
        ],
        correctIndex: 0,
        explanation: "B-Tree menyusun data nod daun secara tersusun, menjadikannya amat pantas untuk pertanyaan julat dan carian kesetaraan."
      },
      {
        id: 4,
        question: "Apakah fenomena yang berlaku apabila kunci cache tamat tempoh dan ratusan permintaan serentak menyerang pangkalan data secara serentak?",
        options: [
          "Cache Stampede (Thundering Herd)",
          "Penembusan Cache (Cache Penetration)",
          "Bacaan Kotor (Dirty Read)",
          "Sindrom Pisah Otak (Split-Brain)"
        ],
        correctIndex: 0,
        explanation: "Cache Stampede berlaku apabila banyak proses serentak cuba membina semula cache yang telah tamat tempoh pada saat yang sama."
      },
      {
        id: 5,
        question: "Dalam pengesahan JWT, apakah amalan terbaik untuk menyimpan token muat semula (refresh token) bagi mengelakkan serangan XSS?",
        options: [
          "Kuki HttpOnly, Secure dan SameSite",
          "localStorage Pelayar",
          "sessionStorage Pelayar",
          "Keadaan Redux dalam memori tanpa penggiliran"
        ],
        correctIndex: 0,
        explanation: "Kuki HttpOnly tidak boleh diakses oleh kod JavaScript dalam pelayar, menghalang kecurian token melalui serangan XSS."
      },
      {
        id: 6,
        question: "Dalam Kubernetes, probe manakah yang digunakan oleh kubelet untuk mengesahkan kontena bersedia menerima trafik rangkaian?",
        options: [
          "Probe Kesediaan (Readiness Probe)",
          "Probe Kelangsungan (Liveness Probe)",
          "Probe Pemula (Startup Probe)",
          "Daemon Degupan Jantung"
        ],
        correctIndex: 0,
        explanation: "Readiness Probe memberitahu Servis sama ada Pod layak menerima trafik pengguna. Pod yang belum bersedia akan dikecualikan daripada servis."
      },
      {
        id: 7,
        question: "Prinsip reka bentuk SOLID manakah yang menyatakan entiti perisian perlu terbuka untuk sambungan tetapi tertutup untuk pengubahsuaian?",
        options: [
          "Prinsip Terbuka-Tertutup (OCP)",
          "Prinsip Tanggungjawab Tunggal (SRP)",
          "Prinsip Penggantian Liskov (LSP)",
          "Prinsip Pengasingan Antara Muka (ISP)"
        ],
        correctIndex: 0,
        explanation: "Prinsip Terbuka-Tertutup (OCP) menggalakkan penambahan ciri melalui polimorfisme tanpa mengubah kod sedia ada yang telah diuji."
      },
      {
        id: 8,
        question: "Dalam sistem didorong peristiwa (EDA), semantik penghantaran manakah yang menjamin mesej tidak akan hilang tetapi memerlukan penerima bersifat idempoten?",
        options: [
          "Penghantaran Sekurang-kurangnya Sekali (At-least-once)",
          "Penghantaran Maksimum Sekali (At-most-once)",
          "Tepat Sekali Tanpa Pengurangan",
          "Siaran Usaha Terbaik"
        ],
        correctIndex: 0,
        explanation: "At-least-once memastikan mesej tidak tercicir dalam apa jua keadaan rangkaian, namun penerima mesti idempoten terhadap mesej pendua."
      },
      {
        id: 9,
        question: "Apakah kelebihan utama Komponen Pelayan React (RSC) dalam Next.js App Router?",
        options: [
          "Mengurangkan saiz ikatan JavaScript pelanggan dengan menjalankan komponen pada pelayan",
          "Membolehkan pendengar acara onClick dijalankan secara langsung pada pelayan",
          "Menghapuskan sepenuhnya keperluan fail CSS",
          "Menggantikan WebSocket untuk komunikasi dua hala"
        ],
        correctIndex: 0,
        explanation: "Komponen Pelayan React (RSC) dieksekusi sepenuhnya pada pelayan, mengelakkan kebergantungan berat dimuat turun ke pelayar pelanggan."
      },
      {
        id: 10,
        question: "Dalam penjejakan teragih (contohnya OpenTelemetry), apakah pengecam yang menyambungkan semua span merentasi pelbagai perkhidmatan mikro?",
        options: [
          "Trace ID",
          "Span ID",
          "Cincangan Sesi",
          "IP Nod Hos"
        ],
        correctIndex: 0,
        explanation: "Trace ID mengenal pasti satu transaksi lengkap merentasi semua perkhidmatan mikro, manakala setiap tugasan kecil mempunyai Span ID tersendiri."
      }
    ]
  }
};

// --- Mock Quiz Data Lookup ---
// Return locale-specific mock quiz data with phase-specific EXP rewards.
export function getMockQuizData(params?: {
  phaseIndex?: number;
  phaseTitle?: string;
  locale?: string;
}): QuizResponseData {
  const loc = params?.locale && MOCK_QUIZ_BY_LOCALE[params.locale] ? params.locale : "en";
  const baseData = MOCK_QUIZ_BY_LOCALE[loc] || MOCK_QUIZ_BY_LOCALE.en;

  const phaseIdx = params?.phaseIndex || baseData.phaseIndex;
  const expBase = phaseIdx === 1 ? 35 : phaseIdx === 2 ? 65 : 85;
  const expReward = Math.max(5, Math.min(100, Math.round(expBase / 5) * 5));

  return {
    ...baseData,
    phaseIndex: phaseIdx,
    phaseTitle: params?.phaseTitle || baseData.phaseTitle,
    expReward,
    expDifficultyTier: `Phase ${phaseIdx} Mastery (${expReward} EXP)`,
  };
}
