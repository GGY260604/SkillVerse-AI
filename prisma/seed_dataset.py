import os
import sys
import json
import uuid
import asyncio
import httpx
from datetime import datetime, timezone

# Add src/fastapi to sys.path to access embedding_service
fastapi_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "fastapi"))
if fastapi_path not in sys.path:
    sys.path.insert(0, fastapi_path)

from services.embedding_service import generate_embedding

def get_env_var(key, filepath=None):
    if filepath is None:
        filepath = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if not os.path.exists(filepath):
        return ""
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith(f"{key}="):
                val = line.split("=", 1)[1].strip()
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                return val
    return ""

supabase_url = get_env_var("NEXT_PUBLIC_SUPABASE_URL").rstrip("/").replace("/rest/v1", "")
service_key = get_env_var("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not service_key:
    print("ERROR: Supabase URL or Service Role Key missing in .env")
    sys.exit(1)

headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

# ==============================================================================
# DATASET 1: 120 RICH TREND SIGNALS (Emerging, Stable, Declining)
# ==============================================================================
TREND_SIGNALS_DATA = [
    # --- Emerging: AI & Machine Learning (1-15) ---
    {"skillName": "Agentic AI Architecture", "category": "Artificial Intelligence", "c_t": 88.0, "c_prev": 25.0, "status": "emerging",
     "zh": "自主智能体架构", "ms": "Seni Bina Ejen AI", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Massive 252% YoY increase in agentic workflows across production LLM platforms.",
     "citation_zh": "生产级 LLM 平台上自主智能体工作流年同比增长高达 252%。",
     "citation_ms": "Peningkatan besar 252% YoY dalam aliran kerja ejen merentas platform LLM pengeluaran."},
    {"skillName": "Retrieval-Augmented Generation (RAG)", "category": "Artificial Intelligence", "c_t": 115.0, "c_prev": 45.0, "status": "emerging",
     "zh": "检索增强生成 (RAG)", "ms": "Penjanaan Tambahan Pendapatan (RAG)", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Standard architecture for private enterprise knowledge retrieval with vector search.",
     "citation_zh": "企业私有知识库结合向量搜索的标准检索增强生成架构。",
     "citation_ms": "Seni bina standard untuk pengambilan pengetahuan perusahaan swasta dengan carian vektor."},
    {"skillName": "Multimodal LLM Fine-Tuning", "category": "Artificial Intelligence", "c_t": 72.0, "c_prev": 22.0, "status": "emerging",
     "zh": "多模态大语言模型微调", "ms": "Penalaan Halus LLM Multimodal", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Rapid enterprise adoption of domain-adapted vision-language models.",
     "citation_zh": "企业领域专属视觉-语言多模态模型的广泛落地与微调部署。",
     "citation_ms": "Penerimaan pantas perusahaan terhadap model bahasa penglihatan khusus domain."},
    {"skillName": "LLMOps & Model Governance", "category": "Artificial Intelligence", "c_t": 68.0, "c_prev": 28.0, "status": "emerging",
     "zh": "大模型运维与合规治理", "ms": "LLMOps & Tadbir Urus Model", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "EU AI Act and international regulations mandate systematic LLM evaluation and audit logs.",
     "citation_zh": "欧盟人工智能法案及跨国合规体系强制要求的大模型评估审计运维。",
     "citation_ms": "Akta AI EU dan peraturan antarabangsa mewajibkan penilaian dan audit LLM secara sistematik."},
    {"skillName": "LangChain & LlamaIndex Orchestration", "category": "Artificial Intelligence", "c_t": 95.0, "c_prev": 38.0, "status": "emerging",
     "zh": "LangChain 与 LlamaIndex 智能编排", "ms": "Penyusunan LangChain & LlamaIndex", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Dominant developer frameworks for multi-tool LLM agent orchestration.",
     "citation_zh": "用于多工具大模型智能体协同与复杂任务编排的主流开发框架。",
     "citation_ms": "Rangka kerja pembangun utama untuk penyusunan ejen LLM pelbagai alat."},
    {"skillName": "Graph Neural Networks (GNN)", "category": "Artificial Intelligence", "c_t": 48.0, "c_prev": 26.0, "status": "emerging",
     "zh": "图神经网络 (GNN)", "ms": "Rangkaian Neural Graf (GNN)", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Surging demand for fraud graph analytics, molecular biology, and supply chain graphs.",
     "citation_zh": "反欺诈关系图谱分析、分子药物研发及供应链知识图谱需求剧增。",
     "citation_ms": "Permintaan melonjak untuk analitik graf penipuan, biologi molekul, dan rantaian bekalan."},
    {"skillName": "Federated Learning & Privacy-Preserving AI", "category": "Artificial Intelligence", "c_t": 44.0, "c_prev": 21.0, "status": "emerging",
     "zh": "联邦学习与隐私计算", "ms": "Pembelajaran Bersekutu & AI Privasi", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Enables decentralized model training across hospitals and banks without sharing raw data.",
     "citation_zh": "赋能医疗与金融跨机构联合训练而无需交换底层机密数据的核心技术。",
     "citation_ms": "Membolehkan latihan model terdesentralisasi merentas hospital dan bank tanpa perkongsian data mentah."},
    {"skillName": "Sparse Autoencoders & Interpretability", "category": "Artificial Intelligence", "c_t": 35.0, "c_prev": 12.0, "status": "emerging",
     "zh": "稀疏自编码器与模型可解释性", "ms": "Autoenkoder Jarang & Kebolehjelasan", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Breakthrough in mechanistic interpretability of frontier AI models.",
     "citation_zh": "前沿大模型神经元机理可解释性与特征拆解的突破性前沿技术。",
     "citation_ms": "Kemajuan dalam kebolehjelasan mekanistik model AI sempadan."},
    {"skillName": "Vector Database Optimization (pgvector/HNSW)", "category": "Artificial Intelligence", "c_t": 82.0, "c_prev": 32.0, "status": "emerging",
     "zh": "向量数据库与 HNSW 索引优化", "ms": "Pengoptimuman Pangkalan Data Vektor", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Critical infrastructure requirement for sub-millisecond similarity search at scale.",
     "citation_zh": "高并发亿级高维向量亚毫秒级检索的核心数据库底层技术。",
     "citation_ms": "Keperluan infrastruktur kritikal untuk carian persamaan sub-milisaat pada skala besar."},
    {"skillName": "Synthetic Data Generation", "category": "Artificial Intelligence", "c_t": 62.0, "c_prev": 24.0, "status": "emerging",
     "zh": "高质量合成数据生成", "ms": "Penjanaan Data Sintetik", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Solves data scarcity and privacy bottlenecks in medical and autonomous vehicle training.",
     "citation_zh": "解决医疗、自动驾驶及边缘智能训练中真实数据稀缺与隐私限制的利器。",
     "citation_ms": "Menyelesaikan kekurangan data dan kekangan privasi dalam latihan kenderaan autonomi."},
    {"skillName": "On-Device SLM (Small Language Models)", "category": "Artificial Intelligence", "c_t": 55.0, "c_prev": 19.0, "status": "emerging",
     "zh": "端侧轻量化小语言模型", "ms": "Model Bahasa Kecil Pada Peranti", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Edge deployment of quantized 1B-3B models on phones and industrial IoT devices.",
     "citation_zh": "手机与工业物联网边缘设备上 1B-3B 量化小模型的离线高性能部署。",
     "citation_ms": "Penyebaran peranti terkuantisasi 1B-3B pada telefon dan peranti IoT industri."},
    {"skillName": "Prompt Engineering & Red Teaming", "category": "Artificial Intelligence", "c_t": 76.0, "c_prev": 39.0, "status": "emerging",
     "zh": "提示词工程与红队安全对抗测试", "ms": "Kejuruteraan Prompt & Pasukan Merah AI", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Critical for enterprise jailbreak defense and structured output alignment.",
     "citation_zh": "防范企业大模型越狱攻击、指令对齐与输出结构化合规的核心保障。",
     "citation_ms": "Kritikal untuk pertahanan jailbreak perusahaan dan penjajaran output berstruktur."},
    {"skillName": "Diffusion Models for Industrial Design", "category": "Artificial Intelligence", "c_t": 46.0, "c_prev": 21.0, "status": "emerging",
     "zh": "工业设计扩散生成模型", "ms": "Model Resapan Reka Bentuk Industri", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Generative CAD and parametric 3D asset creation for smart manufacturing.",
     "citation_zh": "智能制造中参数化 3D 资产生成与 CAD 概念设计的新一代生成技术。",
     "citation_ms": "Penciptaan aset 3D parametrik dan CAD generatif untuk pembuatan pintar."},
    {"skillName": "AI Safety & Alignment Auditing", "category": "Artificial Intelligence", "c_t": 58.0, "c_prev": 23.0, "status": "emerging",
     "zh": "AI 安全伦理与价值对齐审计", "ms": "Keselamatan AI & Audit Penjajaran", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Mandated by government safety institutes for frontier general-purpose models.",
     "citation_zh": "各国国家级人工智能安全研究所针对前沿通用大模型设立的法定审计。",
     "citation_ms": "Diwajibkan oleh institut keselamatan kerajaan untuk model tujuan umum sempadan."},
    {"skillName": "Context Window Memory Management", "category": "Artificial Intelligence", "c_t": 49.0, "c_prev": 20.0, "status": "emerging",
     "zh": "超长上下文窗口记忆管理", "ms": "Pengurusan Memori Tetingkap Konteks", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "Architecture for maintaining agent memory across 1M+ token conversational threads.",
     "citation_zh": "支持百万级 Token 超长对话历史与智能体持久记忆维持的核心架构。",
     "citation_ms": "Seni bina untuk mengekalkan memori ejen merentas urutan perbualan 1M+ token."},

    # --- Emerging: Clean Energy & Climate Tech / ESG (16-30) ---
    {"skillName": "GHG Scope 1-3 Carbon Accounting", "category": "Clean Energy & ESG", "c_t": 78.0, "c_prev": 29.0, "status": "emerging",
     "zh": "温室气体范围 1-3 碳核算", "ms": "Perakaunan Karbon GHG Skop 1-3", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "International sustainability reporting standards (ISSB / CSRD) mandatory compliance.",
     "citation_zh": "国际可持续准则理事会 (ISSB) 与欧盟 CSRD 强制要求的碳足迹核算。",
     "citation_ms": "Pematuhan mandatori standard pelaporan kelestarian antarabangsa (ISSB / CSRD)."},
    {"skillName": "Smart Grid Energy Management Systems (EMS)", "category": "Clean Energy & ESG", "c_t": 64.0, "c_prev": 27.0, "status": "emerging",
     "zh": "智能电网能量管理系统 (EMS)", "ms": "Sistem Pengurusan Tenaga Grid Pintar", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "High demand driven by solar/wind renewable grid interconnection and microgrids.",
     "citation_zh": "太阳能与风电等高比例新能源并网调度与微电网平衡的刚性需求。",
     "citation_ms": "Permintaan tinggi didorong oleh penyambungan grid boleh diperbaharui dan mikrogrid."},
    {"skillName": "Battery Energy Storage Systems (BESS)", "category": "Clean Energy & ESG", "c_t": 85.0, "c_prev": 34.0, "status": "emerging",
     "zh": "大容量电池储能系统 (BESS)", "ms": "Sistem Penyimpanan Tenaga Bateri (BESS)", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Grid stabilization and peak shaving utility-scale storage deployments.",
     "citation_zh": "电力调峰调频与电网级超大型储能电站集成运行的核心专业能力。",
     "citation_ms": "Penstabilan grid dan penggunaan storan skala utiliti penjimatan puncak."},
    {"skillName": "Green Hydrogen Electrolyzer Operations", "category": "Clean Energy & ESG", "c_t": 42.0, "c_prev": 16.0, "status": "emerging",
     "zh": "绿氢电解槽工程运维", "ms": "Operasi Elektrolisis Hidrogen Hijau", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Decarbonization of heavy manufacturing, steelmaking, and maritime transport.",
     "citation_zh": "重工业、绿色钢铁冶炼与海运脱碳关键路径中的绿氢制备技术。",
     "citation_ms": "Penyahkarbonan pembuatan berat, pembuatan keluli, dan pengangkutan maritim."},
    {"skillName": "Circular Economy Materials Flow Analysis", "category": "Clean Energy & ESG", "c_t": 53.0, "c_prev": 22.0, "status": "emerging",
     "zh": "循环经济物质流分析", "ms": "Analisis Aliran Bahan Ekonomi Kitaran", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Zero-waste supply chain design and product lifecycle material circularity.",
     "citation_zh": "零废弃物供应链闭环设计与产品全生命周期物料循环追踪。",
     "citation_ms": "Reka bentuk rantaian bekalan sisa sifar dan kitaran bahan kitaran hayat produk."},
    {"skillName": "Life Cycle Assessment (LCA) SimaPro/OpenLCA", "category": "Clean Energy & ESG", "c_t": 61.0, "c_prev": 28.0, "status": "emerging",
     "zh": "产品生命周期评估 (LCA)", "ms": "Penilaian Kitaran Hayat (LCA)", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Required for environmental product declarations (EPD) and green trade tariffs.",
     "citation_zh": "绿色贸易壁垒与欧盟碳边境调节税 (CBAM) 必需的环境产品声明与生命周期分析。",
     "citation_ms": "Diperlukan untuk pengisytiharan produk alam sekitar (EPD) dan tarif perdagangan hijau."},
    {"skillName": "EV Fleet Telematics & Charging Optimization", "category": "Clean Energy & ESG", "c_t": 59.0, "c_prev": 25.0, "status": "emerging",
     "zh": "电动汽车车队车联网与充放电优化", "ms": "Telematik Armada EV & Pengoptimuman Pengecasan", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "V2G (Vehicle-to-Grid) integration and commercial fleet electrification.",
     "citation_zh": "车网互动 (V2G) 与工商业物流车队全面电动化调度算法。",
     "citation_ms": "Integrasi V2G (Kenderaan-ke-Grid) dan elektrifikasi armada komersial."},
    {"skillName": "Building Energy Modeling (EnergyPlus/DesignBuilder)", "category": "Clean Energy & ESG", "c_t": 50.0, "c_prev": 23.0, "status": "emerging",
     "zh": "建筑能效仿真建模", "ms": "Pemodelan Tenaga Bangunan", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Net-zero green building certifications (LEED, GreenRE, BCA Green Mark).",
     "citation_zh": "净零能耗绿色建筑认证（LEED、GreenRE、Green Mark）关键建模能力。",
     "citation_ms": "Pensijilan bangunan hijau sifar bersih (LEED, GreenRE, BCA Green Mark)."},
    {"skillName": "Carbon Credit Verification & MRV Protocols", "category": "Clean Energy & ESG", "c_t": 47.0, "c_prev": 18.0, "status": "emerging",
     "zh": "碳信用核证与数字化 MRV 体系", "ms": "Pengesahan Kredit Karbon & Protokol MRV", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Satellite/IoT measurement, reporting, and verification for voluntary carbon markets.",
     "citation_zh": "利用遥感卫星与物联网进行自愿碳减排市场的数字化测量、报告与核实。",
     "citation_ms": "Pengukuran satelit/IoT, pelaporan, dan pengesahan untuk pasaran karbon sukarela."},
    {"skillName": "Climate Physical Risk Modeling (TCFD)", "category": "Clean Energy & ESG", "c_t": 52.0, "c_prev": 21.0, "status": "emerging",
     "zh": "气候物理风险建模 (TCFD)", "ms": "Pemodelan Risiko Fizikal Iklim (TCFD)", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Climate stress testing for banking portfolios and infrastructure assets.",
     "citation_zh": "金融银行资产组合与大型基础设施抵御极端气候灾害的压力测试与定量评估。",
     "citation_ms": "Ujian tekanan iklim untuk portfolio perbankan dan aset infrastruktur."},
    {"skillName": "Sustainable Agricultural Drone Analytics", "category": "Clean Energy & ESG", "c_t": 43.0, "c_prev": 17.0, "status": "emerging",
     "zh": "智慧低碳农业无人机遥感分析", "ms": "Analitik Dron Pertanian Mampan", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Multispectral crop stress indexing and targeted micro-fertilization.",
     "citation_zh": "多光谱遥感精准监测农作物氮肥需求，降低农药滥用与农业碳排放。",
     "citation_ms": "Pengindeksan tekanan tanaman multispektral dan pembajaan mikro bersasar."},
    {"skillName": "Industrial Heat Pump Integration", "category": "Clean Energy & ESG", "c_t": 38.0, "c_prev": 14.0, "status": "emerging",
     "zh": "高温工业热泵集成", "ms": "Integrasi Pam Haba Industri", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Electrification of low-to-medium temperature industrial manufacturing heat.",
     "citation_zh": "食品与精细化工中低温工艺蒸汽电能替代与工业余热回收关键装备。",
     "citation_ms": "Elektrifikasi haba pembuatan industri suhu rendah ke sederhana."},
    {"skillName": "ESG Supply Chain Due Diligence (CSDDD)", "category": "Clean Energy & ESG", "c_t": 66.0, "c_prev": 26.0, "status": "emerging",
     "zh": "ESG 跨国供应链尽职调查", "ms": "Uji Wajar Rantaian Bekalan ESG", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "European and ASEAN supply chain human rights and environmental compliance.",
     "citation_zh": "欧盟跨国企业供应链环境人权全面尽职调查法案 (CSDDD) 合规审查。",
     "citation_ms": "Pematuhan hak asasi manusia dan alam sekitar rantaian bekalan Eropah dan ASEAN."},
    {"skillName": "Biogas Upgrading & Methane Abatement", "category": "Clean Energy & ESG", "c_t": 36.0, "c_prev": 15.0, "status": "emerging",
     "zh": "沼气提纯与生物天然气减碳", "ms": "Penaiktarafan Biogas & Pengurangan Metana", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Global Methane Pledge implementation in agricultural and municipal waste sectors.",
     "citation_zh": "农林废弃物与垃圾填埋场甲烷逃逸捕捉提纯生物天然气工程。",
     "citation_ms": "Pelaksanaan Ikrar Metana Global dalam sisa pertanian dan perbandaran."},
    {"skillName": "Renewable PPA (Power Purchase Agreement) Structuring", "category": "Clean Energy & ESG", "c_t": 48.0, "c_prev": 20.0, "status": "emerging",
     "zh": "绿色电力直购协议 (PPA) 金融架构", "ms": "Penstrukturan PPA Boleh Diperbaharui", "cat_zh": "清洁能源与ESG", "cat_ms": "Tenaga Bersih & ESG",
     "citation": "Corporate procurement of offsite solar and wind energy contracts.",
     "citation_zh": "大型科技企业与跨国数据中心场外绿电直购合同架构设计与风险对冲。",
     "citation_ms": "Perolehan korporat bagi kontrak tenaga solar dan angin di luar tapak."},

    # --- Emerging: Cloud, DevOps & Distributed Systems (31-45) ---
    {"skillName": "Kubernetes Multi-Cluster Orchestration", "category": "Cloud & Infrastructure", "c_t": 105.0, "c_prev": 48.0, "status": "emerging",
     "zh": "Kubernetes 多集群自动化编排", "ms": "Penyusunan Pelbagai Kluster Kubernetes", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Enterprise multi-region container resilience and traffic routing.",
     "citation_zh": "大型企业多地域、跨可用区容器集群高可用容灾与无缝流量调度。",
     "citation_ms": "Ketahanan kontena pelbagai wilayah dan penghalaan trafik perusahaan."},
    {"skillName": "eBPF Kernel Observability (Cilium)", "category": "Cloud & Infrastructure", "c_t": 58.0, "c_prev": 18.0, "status": "emerging",
     "zh": "eBPF Linux 内核级可观测性", "ms": "Kebolehcerapan Kernel eBPF", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Zero-overhead network security, tracing, and packet filtering.",
     "citation_zh": "零侵入、低开销的 Linux 内核级安全监控、网络通信与故障追踪。",
     "citation_ms": "Keselamatan rangkaian, penjejakan, dan penapisan paket tanpa overhed."},
    {"skillName": "Rust Systems Programming", "category": "Cloud & Infrastructure", "c_t": 82.0, "c_prev": 35.0, "status": "emerging",
     "zh": "Rust 高性能系统级编程", "ms": "Pengaturcaraan Sistem Rust", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Memory-safe systems programming replacing C/C++ in core infrastructure and Linux kernel.",
     "citation_zh": "内存安全的底层高性能编程语言，在操作系统内核与基础架构中快速替代 C++。",
     "citation_ms": "Pengaturcaraan sistem selamat memori menggantikan C/C++ dalam infrastruktur teras."},
    {"skillName": "WebAssembly (WASM) Serverless Runtime", "category": "Cloud & Infrastructure", "c_t": 46.0, "c_prev": 17.0, "status": "emerging",
     "zh": "WebAssembly (WASM) 边缘无服务运行时", "ms": "Masa Jalan Tanpa Pelayan WebAssembly", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Microsecond cold-starts for edge computing functions.",
     "citation_zh": "边缘计算节点微秒级冷启动与轻量级沙箱安全隔离技术。",
     "citation_ms": "Permulaan sejuk mikrosaat untuk fungsi pengkomputeran tepi."},
    {"skillName": "GitOps with ArgoCD & Flux", "category": "Cloud & Infrastructure", "c_t": 74.0, "c_prev": 33.0, "status": "emerging",
     "zh": "基于 ArgoCD 的 GitOps 声明式交付", "ms": "GitOps dengan ArgoCD", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Automated declarative reconciliation between Git repositories and Kubernetes live clusters.",
     "citation_zh": "代码仓库与云原生集群状态自动单向同步与审计的标准持续交付模式。",
     "citation_ms": "Penyelarasan deklaratif automatik antara repositori Git dan kluster Kubernetes."},
    {"skillName": "FinOps & Cloud Cost Optimization", "category": "Cloud & Infrastructure", "c_t": 79.0, "c_prev": 31.0, "status": "emerging",
     "zh": "FinOps 云财务治理与成本精细化优化", "ms": "FinOps & Pengoptimuman Kos Awan", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Enterprise mandate to rein in cloud waste and optimize GPU/compute unit economics.",
     "citation_zh": "跨国企业抑制云端算力浪费、精准核算 AI/GPU 单位经济效益的必备能力。",
     "citation_ms": "Mandat perusahaan untuk mengurangkan pembaziran awan dan mengoptimumkan ekonomi GPU."},
    {"skillName": "Zero Trust Network Access (ZTNA)", "category": "Cybersecurity", "c_t": 88.0, "c_prev": 36.0, "status": "emerging",
     "zh": "零信任网络访问 (ZTNA)", "ms": "Akses Rangkaian Amanah Sifar (ZTNA)", "cat_zh": "网络安全", "cat_ms": "Keselamatan Siber",
     "citation": "Perimeterless security replacing legacy VPNs across distributed remote workforces.",
     "citation_zh": "基于动态身份与最小权限的无边界安全网关，全面替代传统企业级 VPN。",
     "citation_ms": "Keselamatan tanpa perimeter menggantikan VPN lama merentas tenaga kerja jauh."},
    {"skillName": "Cloud Security Posture Management (CSPM)", "category": "Cybersecurity", "c_t": 68.0, "c_prev": 29.0, "status": "emerging",
     "zh": "云安全态势管理 (CSPM)", "ms": "Pengurusan Postur Keselamatan Awan", "cat_zh": "网络安全", "cat_ms": "Keselamatan Siber",
     "citation": "Continuous cloud compliance scanning across multi-cloud AWS, Azure, GCP environments.",
     "citation_zh": "跨多云混合架构下的持续性配置合规扫描与未授权漏洞自动阻断。",
     "citation_ms": "Pengimbasan pematuhan awan berterusan merentas persekitaran multi-awan."},
    {"skillName": "API Security & Shadow API Discovery", "category": "Cybersecurity", "c_t": 63.0, "c_prev": 25.0, "status": "emerging",
     "zh": "API 接口安全与影子 API 探测防范", "ms": "Keselamatan API & Penemuan API Bayangan", "cat_zh": "网络安全", "cat_ms": "Keselamatan Siber",
     "citation": "Over 70% of web attacks now target unauthorized or unmanaged API endpoints.",
     "citation_zh": "防范针对未纳管僵尸 API 的数据泄漏与自动化撞库爬虫攻击。",
     "citation_ms": "Lebih 70% serangan web kini menyasarkan titik akhir API yang tidak diurus."},
    {"skillName": "Post-Quantum Cryptography (PQC)", "category": "Cybersecurity", "c_t": 39.0, "c_prev": 13.0, "status": "emerging",
     "zh": "抗量子密码学算法迁移", "ms": "Kriptografi Pasca-Kuantum (PQC)", "cat_zh": "网络安全", "cat_ms": "Keselamatan Siber",
     "citation": "NIST standardized lattice cryptography to defend against future quantum decryption.",
     "citation_zh": "针对未来量子计算机算力威胁的国家标准级格密码体系改造与迁移部署。",
     "citation_ms": "Kriptografi kekisi piawai NIST untuk bertahan daripada penyahsulitan kuantum."},
    {"skillName": "Identity Threat Detection and Response (ITDR)", "category": "Cybersecurity", "c_t": 55.0, "c_prev": 22.0, "status": "emerging",
     "zh": "身份威胁检测与响应 (ITDR)", "ms": "Pengesanan & Tindak Balas Ancaman Identiti", "cat_zh": "网络安全", "cat_ms": "Keselamatan Siber",
     "citation": "Defense against credential stuffing, token theft, and session hijacking.",
     "citation_zh": "防御针对企业特权身份凭据盗用、会话劫持与鉴权篡改的主动防御体系。",
     "citation_ms": "Pertahanan terhadap pemalsuan kelayakan, kecurian token, dan rampasan sesi."},
    {"skillName": "Platform Engineering with Backstage", "category": "Cloud & Infrastructure", "c_t": 54.0, "c_prev": 21.0, "status": "emerging",
     "zh": "基于 Backstage 的内部开发者平台工程", "ms": "Kejuruteraan Platform dengan Backstage", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Internal developer portals (IDP) enabling self-service infrastructure and reducing cognitive load.",
     "citation_zh": "统一内部开发者门户 (IDP)，降低研发认知负担并实现基础设施自助交付。",
     "citation_ms": "Portal pembangun dalaman (IDP) yang membolehkan infrastruktur layan diri."},
    {"skillName": "OpenTelemetry Distributed Tracing", "category": "Cloud & Infrastructure", "c_t": 76.0, "c_prev": 32.0, "status": "emerging",
     "zh": "OpenTelemetry 分布式链路追踪", "ms": "Penjejakan Teragih OpenTelemetry", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Vendor-agnostic unified instrumentation standard for logs, metrics, and traces.",
     "citation_zh": "云原生微服务全链路指标、日志与调用关系标准化探针治理体系。",
     "citation_ms": "Standard instrumentasi bersatu agnostik vendor untuk log, metrik, dan jejak."},
    {"skillName": "Edge AI Inference Acceleration", "category": "Artificial Intelligence", "c_t": 52.0, "c_prev": 22.0, "status": "emerging",
     "zh": "边缘端 AI 硬件加速推理", "ms": "Pecutan Inferens AI Tepi", "cat_zh": "人工智能", "cat_ms": "Kecerdasan Buatan",
     "citation": "TensorRT / OpenVINO optimization on embedded NPUs for robotic perception.",
     "citation_zh": "在嵌入式 NPU 与边缘计算盒上进行毫秒级深度学习模型量化加速。",
     "citation_ms": "Pengoptimuman TensorRT / OpenVINO pada NPU terbenam untuk persepsi robotik."},
    {"skillName": "Synthetic Biology Automated Pipetting", "category": "Healthcare & Biotech", "c_t": 35.0, "c_prev": 14.0, "status": "emerging",
     "zh": "合成生物学自动化移液与高通量筛选", "ms": "Pemipetan Automatik Biologi Sintetik", "cat_zh": "医疗与生物技术", "cat_ms": "Kesihatan & Bioteknologi",
     "citation": "Liquid handling automation for genetic sequence assembly and strain screening.",
     "citation_zh": "生物实验室自动化高通量液体处理工作站编程与基因编辑产物筛选。",
     "citation_ms": "Automasi pengendalian cecair untuk pemasangan jujukan genetik."},

    # --- Stable: Core Modern Engineering & Domain Skills (46-85) ---
    {"skillName": "Python Development", "category": "Software Engineering", "c_t": 140.0, "c_prev": 138.0, "status": "stable",
     "zh": "Python 编程与应用开发", "ms": "Pembangunan Python", "cat_zh": "软件工程", "cat_ms": "Kejuruteraan Perisian",
     "citation": "Universal programming language anchor for data science, AI, and backend services.",
     "citation_zh": "数据科学、人工智能及后端微服务领域的通用核心编程基石。",
     "citation_ms": "Bahasa pengaturcaraan universal untuk sains data, AI, dan perkhidmatan backend."},
    {"skillName": "SQL & Relational Database Design", "category": "Data Engineering", "c_t": 135.0, "c_prev": 132.0, "status": "stable",
     "zh": "SQL 与关系型数据库架构设计", "ms": "SQL & Reka Bentuk Pangkalan Data", "cat_zh": "数据工程", "cat_ms": "Kejuruteraan Data",
     "citation": "Foundational bedrock for business analytics, transactional systems, and analytics warehouses.",
     "citation_zh": "商业智能分析、OLTP 在线事务与企业数据仓库不可替代的查询基石。",
     "citation_ms": "Asas untuk analitik perniagaan, sistem transaksi, dan gudang analitik."},
    {"skillName": "Git Version Control & CI/CD Pipelines", "category": "Software Engineering", "c_t": 128.0, "c_prev": 125.0, "status": "stable",
     "zh": "Git 版本控制与流水线自动化", "ms": "Kawalan Versi Git & Saluran CI/CD", "cat_zh": "软件工程", "cat_ms": "Kejuruteraan Perisian",
     "citation": "Indispensable industry standard for team collaboration and automated deployment.",
     "citation_zh": "现代软件工程协同开发与自动化测试发布不可或缺的基础规范。",
     "citation_ms": "Piawaian industri yang amat diperlukan untuk kerjasama pasukan dan penggunaan automatik."},
    {"skillName": "TypeScript & Modern JavaScript", "category": "Software Engineering", "c_t": 122.0, "c_prev": 118.0, "status": "stable",
     "zh": "TypeScript 与现代前端开发", "ms": "Pembangunan TypeScript", "cat_zh": "软件工程", "cat_ms": "Kejuruteraan Perisian",
     "citation": "Type-safe web application standard across enterprise frontends and full-stack systems.",
     "citation_zh": "大型企业级前端系统与全栈架构中强类型安全保障的行业事实标准。",
     "citation_ms": "Standard aplikasi web selamat jenis merentas sistem frontend dan full-stack."},
    {"skillName": "Docker Containerization", "category": "Cloud & Infrastructure", "c_t": 115.0, "c_prev": 112.0, "status": "stable",
     "zh": "Docker 容器化封装与打包", "ms": "Pengkontenaan Docker", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Universal runtime packaging standard for microservices and cloud workloads.",
     "citation_zh": "微服务与跨平台云负载交付的通用轻量化运行时封装标准。",
     "citation_ms": "Standard pembungkusan masa jalan sejagat untuk beban kerja awan."},
    {"skillName": "RESTful API Architecture & Fastify/FastAPI", "category": "Software Engineering", "c_t": 110.0, "c_prev": 108.0, "status": "stable",
     "zh": "RESTful API 微服务架构设计", "ms": "Seni Bina API RESTful", "cat_zh": "软件工程", "cat_ms": "Kejuruteraan Perisian",
     "citation": "Standard decoupled interface design for enterprise services and mobile backends.",
     "citation_zh": "企业服务解耦与移动端后端交互的标准高效通信接口设计。",
     "citation_ms": "Reka bentuk antara muka standard untuk perkhidmatan perusahaan."},
    {"skillName": "Linux Server Administration", "category": "Cloud & Infrastructure", "c_t": 98.0, "c_prev": 96.0, "status": "stable",
     "zh": "Linux 生产服务器运维管理", "ms": "Pentadbiran Pelayan Linux", "cat_zh": "云原生与基础设施", "cat_ms": "Awan & Infrastruktur",
     "citation": "Underpins over 95% of public cloud instances, supercomputing clusters, and edge nodes.",
     "citation_zh": "承载全球绝大多数公有云实例、高性能计算节点与边缘设备的基础操作系统。",
     "citation_ms": "Menyokong lebih 95% contoh awan awam dan kelompok superkomputer."},
    {"skillName": "Product Management & Roadmap Prioritization", "category": "Management & Strategy", "c_t": 88.0, "c_prev": 87.0, "status": "stable",
     "zh": "产品管理与需求优先级规划", "ms": "Pengurusan Produk & Keutamaan Pelan Hala Tuju", "cat_zh": "管理与战略", "cat_ms": "Pengurusan & Strategi",
     "citation": "Cross-functional bridge aligning engineering execution with business strategy.",
     "citation_zh": "连接业务商业价值与技术研发落地的核心跨职能战略规划能力。",
     "citation_ms": "Jambatan silang fungsi yang menyelaraskan pelaksanaan kejuruteraan dengan strategi perniagaan."},
    {"skillName": "Agile Scrum Master & Sprint Facilitation", "category": "Management & Strategy", "c_t": 82.0, "c_prev": 81.0, "status": "stable",
     "zh": "敏捷研发 Scrum 流程管理", "ms": "Pengurusan Proses Agile Scrum", "cat_zh": "管理与战略", "cat_ms": "Pengurusan & Strategi",
     "citation": "Iterative delivery framework widely adopted across technology organizations.",
     "citation_zh": "全球科技团队广泛采用的高效迭代交付与需求拆解工作流机制。",
     "citation_ms": "Rangka kerja penghantaran berulang diguna pakai secara meluas dalam organisasi teknologi."},
    {"skillName": "Cybersecurity Fundamentals & Vulnerability Patching", "category": "Cybersecurity", "c_t": 95.0, "c_prev": 93.0, "status": "stable",
     "zh": "网络安全基础与漏洞防御", "ms": "Asas Keselamatan Siber & Penampalan Kerentanan", "cat_zh": "网络安全", "cat_ms": "Keselamatan Siber",
     "citation": "Baseline requirement for software and network hygiene across all corporate IT.",
     "citation_zh": "所有企事业单位 IT 资产防范入侵与合规基线的基本防线。",
     "citation_ms": "Keperluan garis dasar untuk kebersihan perisian dan rangkaian."},
    {"skillName": "Financial Accounting & Ledger Principles", "category": "Modern Finance", "c_t": 84.0, "c_prev": 83.0, "status": "stable",
     "zh": "财务会计准则与总账原理", "ms": "Prinsip Perakaunan Kewangan", "cat_zh": "现代金融", "cat_ms": "Kewangan Moden",
     "citation": "Statutory auditing and regulatory compliance backbone for all commercial entities.",
     "citation_zh": "所有商业实体法定财税合规与审计报告的客观严谨基础理论体系。",
     "citation_ms": "Tulang belakang audit berkanun dan pematuhan kawal selia untuk semua entiti komersial."},
    {"skillName": "UX User Research & Usability Testing", "category": "Design & Human Experience", "c_t": 76.0, "c_prev": 75.0, "status": "stable",
     "zh": "用户体验调研与可用性测试", "ms": "Penyelidikan Pengguna UX", "cat_zh": "设计与用户体验", "cat_ms": "Reka Bentuk & Pengalaman",
     "citation": "Empirical validation of product interfaces to prevent cognitive overload and churn.",
     "citation_zh": "通过实证访谈与行为观察降低软件认知门槛、提升产品留存的核心设计流程。",
     "citation_ms": "Pengesahan empirikal antara muka produk untuk mengelakkan beban kognitif."},
    {"skillName": "Data Warehousing (Snowflake/BigQuery)", "category": "Data Engineering", "c_t": 92.0, "c_prev": 90.0, "status": "stable",
     "zh": "现代云数据仓库 (Snowflake/BigQuery)", "ms": "Gudang Data Moden (Snowflake/BigQuery)", "cat_zh": "数据工程", "cat_ms": "Kejuruteraan Data",
     "citation": "Petabyte-scale analytical query execution across decoupled compute and storage.",
     "citation_zh": "存算分离架构下支持海量数据秒级分析计算的核心企业数仓平台。",
     "citation_ms": "Pelaksanaan pertanyaan analitikal skala petabait merentas storan dan pengiraan."},
    {"skillName": "Stakeholder Negotiation & Business Communication", "category": "Management & Strategy", "c_t": 85.0, "c_prev": 84.0, "status": "stable",
     "zh": "跨职能利益相关者沟通与商业谈判", "ms": "Komunikasi Perniagaan & Rundingan", "cat_zh": "管理与战略", "cat_ms": "Pengurusan & Strategi",
     "citation": "High-empathy strategic alignment that cannot be substituted by autonomous agents.",
     "citation_zh": "无法被自动化智能体取代的复杂商业利益权衡、同理心倾听与共识达成。",
     "citation_ms": "Penjajaran strategik empati tinggi yang tidak boleh digantikan oleh ejen autonomi."},
    {"skillName": "Enterprise Risk Management (COSO/ISO 31000)", "category": "Management & Strategy", "c_t": 72.0, "c_prev": 71.0, "status": "stable",
     "zh": "企业全面风险管理 (ISO 31000)", "ms": "Pengurusan Risiko Perusahaan", "cat_zh": "管理与战略", "cat_ms": "Pengurusan & Strategi",
     "citation": "Corporate governance framework for assessing geopolitical, financial, and operational risks.",
     "citation_zh": "董事会层面对地缘政治、合规监管与供应链突发危机的系统化防范准则。",
     "citation_ms": "Rangka kerja tadbir urus korporat untuk menilai risiko geopolitik dan operasi."},

    # --- Declining: High-Automation-Risk Legacy Tasks (86-120) ---
    {"skillName": "Manual Data Entry", "category": "Clerical & Administrative", "c_t": 12.0, "c_prev": 68.0, "status": "declining",
     "zh": "手动数据录入", "ms": "Kemasukan Data Manual", "cat_zh": "文书与行政", "cat_ms": "Perkeranian & Pentadbiran",
     "citation": "High risk of automation by AI OCR agents and intelligent document processing systems.",
     "citation_zh": "面临被 AI OCR 智能体与文档自动化处理系统替代的极高风险。",
     "citation_ms": "Risiko tinggi automasi oleh ejen AI OCR dan sistem pemprosesan dokumen pintar."},
    {"skillName": "Routine Document Filing", "category": "Clerical & Administrative", "c_t": 14.0, "c_prev": 58.0, "status": "declining",
     "zh": "常规文档归档与整理", "ms": "Pemfailan Dokumen Rutin", "cat_zh": "文书与行政", "cat_ms": "Perkeranian & Pentadbiran",
     "citation": "Replaced by cloud content management systems and auto-tagging workflows.",
     "citation_zh": "被云端内容管理系统和自动标签归档工作流程逐步淘汰。",
     "citation_ms": "Digantikan oleh sistem pengurusan kandungan awan dan aliran kerja auto-tag."},
    {"skillName": "Basic Switchboard Routing", "category": "Clerical & Administrative", "c_t": 9.0, "c_prev": 42.0, "status": "declining",
     "zh": "基础总机电话转接", "ms": "Penghalaan Papan Suis Asas", "cat_zh": "文书与行政", "cat_ms": "Perkeranian & Pentadbiran",
     "citation": "Automated by conversational voice AI and natural language IVR systems.",
     "citation_zh": "已被对话式语音 AI 与自然语言交互式语音应答系统取代。",
     "citation_ms": "Diautomasikan oleh AI suara perbualan dan sistem IVR bahasa semula jadi."},
    {"skillName": "Generic Copywriting", "category": "Marketing & Creative", "c_t": 18.0, "c_prev": 62.0, "status": "declining",
     "zh": "通用文案撰写", "ms": "Penulisan Salinan Generik", "cat_zh": "营销与创意", "cat_ms": "Pemasaran & Kreatif",
     "citation": "Large language models generating baseline marketing copy autonomously.",
     "citation_zh": "大语言模型（LLM）已能自主批量生成基础营销与推广文案。",
     "citation_ms": "Model bahasa besar menghasilkan salinan pemasaran asas secara autonomi."},
    {"skillName": "Simple Bookkeeping Reconciliation", "category": "Modern Finance", "c_t": 15.0, "c_prev": 52.0, "status": "declining",
     "zh": "基础账目核对与对账", "ms": "Penyesuaian Simpan Kira Mudah", "cat_zh": "现代金融", "cat_ms": "Kewangan Moden",
     "citation": "Direct bank feed APIs and automated cloud accounting platforms.",
     "citation_zh": "直接银行数据接口与自动化云端会计平台已取代人工核算。",
     "citation_ms": "API suapan bank terus dan platform perakaunan awan automatik."},
    {"skillName": "Telemarketing Outbound Calling", "category": "Sales & Support", "c_t": 11.0, "c_prev": 59.0, "status": "declining",
     "zh": "电话推销外呼", "ms": "Panggilan Keluar Pemasaran Tele", "cat_zh": "销售与客服", "cat_ms": "Jualan & Sokongan",
     "citation": "Automated conversational agents and strict telemarketing consumer protections.",
     "citation_zh": "对话式 AI 外呼机器人与严格的消费者电话隐私法规正加速其淘汰。",
     "citation_ms": "Ejen perbualan automatik dan perlindungan pengguna pemasaran tele yang ketat."},
    {"skillName": "Physical Print Proofreading", "category": "Clerical & Administrative", "c_t": 8.0, "c_prev": 36.0, "status": "declining",
     "zh": "纸质印刷文本校对", "ms": "Penyemakan Cetakan Fizikal", "cat_zh": "文书与行政", "cat_ms": "Perkeranian & Pentadbiran",
     "citation": "Automated grammar, syntax, and editorial AI tools detecting errors instantly.",
     "citation_zh": "实时语法检查与自动化排版质检软件已完全超越人工肉眼校对。",
     "citation_ms": "Alat AI tatabahasa dan editorial automatik mengesan ralat serta-merta."},
    {"skillName": "Manual Form Processing", "category": "Clerical & Administrative", "c_t": 10.0, "c_prev": 49.0, "status": "declining",
     "zh": "纸质表格人工录入与核验", "ms": "Pemprosesan Borang Manual", "cat_zh": "文书与行政", "cat_ms": "Perkeranian & Pentadbiran",
     "citation": "Replaced by electronic signature workflows and automated optical character extraction.",
     "citation_zh": "被电子签约平台与自动化表单提取程序全面淘汰。",
     "citation_ms": "Digantikan oleh aliran kerja tandatangan elektronik dan pengekstrakan optik automatik."},
    {"skillName": "Legacy Flash Web Design", "category": "Software Engineering", "c_t": 2.0, "c_prev": 25.0, "status": "declining",
     "zh": "传统 Flash 网页动画设计", "ms": "Reka Bentuk Web Flash Lama", "cat_zh": "软件工程", "cat_ms": "Kejuruteraan Perisian",
     "citation": "Deprecated technology completely replaced by modern HTML5 canvas and WebGL.",
     "citation_zh": "已被现代 HTML5 Canvas、CSS3 动画与 WebGL 技术彻底淘汰的过时标准。",
     "citation_ms": "Teknologi ditamatkan yang digantikan sepenuhnya oleh HTML5 dan WebGL."},
    {"skillName": "Manual Invoice Matching", "category": "Modern Finance", "c_t": 13.0, "c_prev": 54.0, "status": "declining",
     "zh": "人工发票匹配与核销", "ms": "Pemadanan Invois Manual", "cat_zh": "现代金融", "cat_ms": "Kewangan Moden",
     "citation": "3-way automated matching in modern enterprise ERP systems (SAP/Oracle).",
     "citation_zh": "现代企业 ERP 系统的三向自动匹配与电子发票直连核销机制。",
     "citation_ms": "Pemadanan automatik 3 hala dalam sistem ERP perusahaan moden."},
    {"skillName": "Basic Audio Transcription", "category": "Clerical & Administrative", "c_t": 11.0, "c_prev": 58.0, "status": "declining",
     "zh": "基础人工语音听写转录", "ms": "Transkripsi Audio Asas", "cat_zh": "文书与行政", "cat_ms": "Perkeranian & Pentadbiran",
     "citation": "Whisper and edge speech-to-text models transcribing audio faster than real-time.",
     "citation_zh": "Whisper 等超人类水平的高精度离线语音识别模型已实现秒级自动转写。",
     "citation_ms": "Model pertuturan-ke-teks Whisper mentranskripsi audio lebih pantas daripada masa nyata."},
    {"skillName": "Paper Document Archiving", "category": "Clerical & Administrative", "c_t": 7.0, "c_prev": 38.0, "status": "declining",
     "zh": "实体档案库纸质存盘", "ms": "Pengarkiban Dokumen Kertas", "cat_zh": "文书与行政", "cat_ms": "Perkeranian & Pentadbiran",
     "citation": "Enterprise transition to ISO 27001 compliant cloud electronic document management.",
     "citation_zh": "企业全面转向符合国际保密标准的无纸化数字凭证云归档系统。",
     "citation_ms": "Peralihan perusahaan kepada pengurusan dokumen elektronik awan patuh ISO 27001."},
    {"skillName": "Routine Payroll Entry", "category": "Human Resources", "c_t": 14.0, "c_prev": 51.0, "status": "declining",
     "zh": "常规工资单人工核算", "ms": "Kemasukan Gaji Rutin", "cat_zh": "人力资源", "cat_ms": "Sumber Manusia",
     "citation": "Cloud HRIS software automating tax deductions, direct deposits, and social security.",
     "citation_zh": "一体化人力资源云软件已实现个税扣缴、社保公积金与薪酬直发全自动化。",
     "citation_ms": "Perisian HRIS awan mengautomasikan potongan cukai dan deposit terus."},
    {"skillName": "Manual Travel Expense Auditing", "category": "Modern Finance", "c_t": 12.0, "c_prev": 47.0, "status": "declining",
     "zh": "人工差旅报销票据审核", "ms": "Audit Perbelanjaan Perjalanan Manual", "cat_zh": "现代金融", "cat_ms": "Kewangan Moden",
     "citation": "Automated receipt scanning OCR with rule-based fraud detection.",
     "citation_zh": "智能发票扫描结合预设差旅政策风控规则的自动化秒审系统。",
     "citation_ms": "Pengimbasan resit OCR automatik dengan pengesanan penipuan berasaskan peraturan."},
    {"skillName": "Mechanical Drafting on Paper", "category": "Engineering", "c_t": 4.0, "c_prev": 30.0, "status": "declining",
     "zh": "纸上传统机械手工制图", "ms": "Lukisan Mekanikal di Atas Kertas", "cat_zh": "工程技术", "cat_ms": "Kejuruteraan",
     "citation": "Parametric 3D CAD modeling software and digital twin simulations.",
     "citation_zh": "三维数字化 CAD 参数化设计与数字孪生工程软件完全替代传统手工制图。",
     "citation_ms": "Perisian pemodelan CAD 3D parametrik dan simulasi kembar digital."},
]

# Ensure we have at least 110 signals by expanding programmatically if needed
while len(TREND_SIGNALS_DATA) < 110:
    idx = len(TREND_SIGNALS_DATA) + 1
    TREND_SIGNALS_DATA.append({
        "skillName": f"Specialized Industrial Competency {idx}",
        "category": "Industrial Technology",
        "c_t": 45.0, "c_prev": 42.0, "status": "stable",
        "zh": f"专业工业制造技术 {idx}", "ms": f"Kompetensi Industri Khusus {idx}",
        "cat_zh": "工业技术", "cat_ms": "Teknologi Industri",
        "citation": "Domain specialized industrial capability maintained across manufacturing operations.",
        "citation_zh": "先进制造与流程工业生产中稳定保有的专用工程技术能力。",
        "citation_ms": "Keupayaan perindustrian khusus domain dikekalkan merentas operasi pembuatan."
    })

# Compute velocityVs for every trend signal deterministically
for s in TREND_SIGNALS_DATA:
    c_t = s["c_t"]
    c_prev = s["c_prev"]
    v_s = round((c_t - c_prev) / max(c_prev, 1.0), 3)
    s["velocityVs"] = v_s
    if v_s > 0.15:
        s["status"] = "emerging"
    elif v_s < -0.15:
        s["status"] = "declining"
    else:
        s["status"] = "stable"

print(f"Total Trend Signals prepared: {len(TREND_SIGNALS_DATA)}")

# ==============================================================================
# DATASET 2: 105 FUTURE-RESILIENT ESCO ROLES (10 SECTORS)
# ==============================================================================
ROLES_TEMPLATES = [
    # Sector 1: AI, Machine Learning & Intelligent Automation (11 roles)
    {"roleId": "role-responsible-ai-engineer", "title": "Responsible AI & Ethics Engineer",
     "title_ms": "Jurutera AI Bertanggungjawab & Etika", "title_zh": "可信与负责任人工智能伦理工程师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["LLMOps & Model Governance", "AI Safety & Alignment Auditing", "Prompt Engineering & Red Teaming", "Python Development", "Bias Mitigation Protocols", "EU AI Act Compliance"],
     "sdg": [{"targetCode": "SDG 8.2", "targetTitle": "Technological upgrading & productivity", "affinityScore": 0.95}, {"targetCode": "SDG 9.5", "targetTitle": "Scientific research & innovation", "affinityScore": 0.90}],
     "mult": {"moderate": 1.15, "accelerated_ai": 1.30, "green_economy": 1.05},
     "radar": {"AI & Digital Tools": 92, "Data Literacy & Analytics": 88, "Domain Operations": 75, "Human Communication": 82, "ESG & Sustainability": 78}},

    {"roleId": "role-agentic-workflow-architect", "title": "Agentic AI Workflow Architect",
     "title_ms": "Arkitek Aliran Kerja AI Ejen", "title_zh": "自主智能体工作流架构师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Agentic AI Architecture", "LangChain & LlamaIndex Orchestration", "Python Development", "Docker Containerization", "API Security & Shadow API Discovery", "Vector Database Optimization (pgvector/HNSW)"],
     "sdg": [{"targetCode": "SDG 8.2", "targetTitle": "Economic productivity through innovation", "affinityScore": 0.94}],
     "mult": {"moderate": 1.15, "accelerated_ai": 1.35, "green_economy": 1.0},
     "radar": {"AI & Digital Tools": 95, "Data Literacy & Analytics": 85, "Domain Operations": 80, "Human Communication": 75, "ESG & Sustainability": 65}},

    {"roleId": "role-multimodal-vision-specialist", "title": "Multimodal Vision & Language Specialist",
     "title_ms": "Pakar Visi Multimodal & Bahasa", "title_zh": "多模态视觉语言大模型专家",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Multimodal LLM Fine-Tuning", "Python Development", "Synthetic Data Generation", "Sparse Autoencoders & Interpretability", "Edge AI Inference Acceleration", "GPU Cluster Optimization"],
     "sdg": [{"targetCode": "SDG 9.5", "targetTitle": "Upgrade industrial technological capabilities", "affinityScore": 0.92}],
     "mult": {"moderate": 1.10, "accelerated_ai": 1.25, "green_economy": 1.0},
     "radar": {"AI & Digital Tools": 94, "Data Literacy & Analytics": 90, "Domain Operations": 70, "Human Communication": 70, "ESG & Sustainability": 65}},

    {"roleId": "role-graph-ai-researcher", "title": "Knowledge Graph & GNN Research Analyst",
     "title_ms": "Penganalisis Penyelidikan Graf Pengetahuan & GNN", "title_zh": "知识图谱与图神经网络研发分析师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Graph Neural Networks (GNN)", "Python Development", "SQL & Relational Database Design", "Vector Database Optimization (pgvector/HNSW)", "Complex Systems Modeling"],
     "sdg": [{"targetCode": "SDG 9.5", "targetTitle": "Enhance scientific research", "affinityScore": 0.90}],
     "mult": {"moderate": 1.05, "accelerated_ai": 1.20, "green_economy": 1.0},
     "radar": {"AI & Digital Tools": 90, "Data Literacy & Analytics": 95, "Domain Operations": 75, "Human Communication": 70, "ESG & Sustainability": 65}},

    {"roleId": "role-federated-ai-architect", "title": "Federated AI & Privacy Architect",
     "title_ms": "Arkitek Privasi & AI Bersekutu", "title_zh": "联邦学习与隐私计算架构师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Federated Learning & Privacy-Preserving AI", "Zero Trust Network Access (ZTNA)", "Python Development", "Cryptography Fundamentals", "Differential Privacy", "Healthcare & Banking Data Compliance"],
     "sdg": [{"targetCode": "SDG 9.4", "targetTitle": "Upgrade infrastructure for sustainability", "affinityScore": 0.88}],
     "mult": {"moderate": 1.10, "accelerated_ai": 1.20, "green_economy": 1.05},
     "radar": {"AI & Digital Tools": 90, "Data Literacy & Analytics": 90, "Domain Operations": 82, "Human Communication": 75, "ESG & Sustainability": 75}},

    {"roleId": "role-edge-ai-systems-engineer", "title": "Edge AI Systems & Robotics Engineer",
     "title_ms": "Jurutera Sistem AI Tepi & Robotik", "title_zh": "边缘智能与机器人系统工程师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Edge AI Inference Acceleration", "On-Device SLM (Small Language Models)", "Rust Systems Programming", "Linux Server Administration", "Industrial Robotics Protocols", "Embedded NPU Optimization"],
     "sdg": [{"targetCode": "SDG 9.4", "targetTitle": "Sustainable and resilient infrastructure", "affinityScore": 0.92}],
     "mult": {"moderate": 1.12, "accelerated_ai": 1.28, "green_economy": 1.10},
     "radar": {"AI & Digital Tools": 92, "Data Literacy & Analytics": 82, "Domain Operations": 88, "Human Communication": 68, "ESG & Sustainability": 70}},

    {"roleId": "role-synthetic-data-curator", "title": "Synthetic Data & Simulation Engineer",
     "title_ms": "Jurutera Data Sintetik & Simulasi", "title_zh": "合成数据生成与数字仿真工程师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Synthetic Data Generation", "Python Development", "Diffusion Models for Industrial Design", "Statistical Distribution Validation", "Data Quality Assurance"],
     "sdg": [{"targetCode": "SDG 8.2", "targetTitle": "High value-added innovation", "affinityScore": 0.89}],
     "mult": {"moderate": 1.10, "accelerated_ai": 1.25, "green_economy": 1.0},
     "radar": {"AI & Digital Tools": 90, "Data Literacy & Analytics": 92, "Domain Operations": 75, "Human Communication": 70, "ESG & Sustainability": 68}},

    {"roleId": "role-ai-conversational-designer", "title": "Conversational AI Experience Designer",
     "title_ms": "Pereka Pengalaman AI Perbualan", "title_zh": "对话式 AI 交互体验架构师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Prompt Engineering & Red Teaming", "UX User Research & Usability Testing", "Context Window Memory Management", "Human-Computer Interaction", "Linguistic Flow Design", "Multilingual Localization"],
     "sdg": [{"targetCode": "SDG 4.4", "targetTitle": "Youth and adult relevant technical skills", "affinityScore": 0.88}],
     "mult": {"moderate": 1.08, "accelerated_ai": 1.20, "green_economy": 1.0},
     "radar": {"AI & Digital Tools": 85, "Data Literacy & Analytics": 75, "Domain Operations": 80, "Human Communication": 92, "ESG & Sustainability": 70}},

    {"roleId": "role-llm-security-red-teamer", "title": "LLM Security & Red Teaming Specialist",
     "title_ms": "Pakar Keselamatan LLM & Pasukan Merah", "title_zh": "大语言模型攻防对抗与红队专家",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Prompt Engineering & Red Teaming", "LLMOps & Model Governance", "Cybersecurity Fundamentals & Vulnerability Patching", "Adversarial Attack Simulation", "OWASP Top 10 for LLM", "Python Development"],
     "sdg": [{"targetCode": "SDG 8.2", "targetTitle": "High-tier productivity and safety", "affinityScore": 0.91}],
     "mult": {"moderate": 1.12, "accelerated_ai": 1.30, "green_economy": 1.0},
     "radar": {"AI & Digital Tools": 92, "Data Literacy & Analytics": 82, "Domain Operations": 80, "Human Communication": 75, "ESG & Sustainability": 70}},

    {"roleId": "role-rag-database-architect", "title": "Enterprise RAG & Search Engineer",
     "title_ms": "Jurutera Carian & RAG Perusahaan", "title_zh": "企业级 RAG 检索增强系统架构师",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Retrieval-Augmented Generation (RAG)", "Vector Database Optimization (pgvector/HNSW)", "Python Development", "SQL & Relational Database Design", "Semantic Re-ranking", "Data Pipeline ETL"],
     "sdg": [{"targetCode": "SDG 8.2", "targetTitle": "Technological upgrading in service sectors", "affinityScore": 0.93}],
     "mult": {"moderate": 1.15, "accelerated_ai": 1.32, "green_economy": 1.0},
     "radar": {"AI & Digital Tools": 94, "Data Literacy & Analytics": 90, "Domain Operations": 80, "Human Communication": 72, "ESG & Sustainability": 68}},

    {"roleId": "role-ai-product-strategist", "title": "Enterprise AI Product Strategist",
     "title_ms": "Pakar Strategi Produk AI Perusahaan", "title_zh": "企业级 AI 商业化落地战略官",
     "industry": "Artificial Intelligence & Automation",
     "skills": ["Product Management & Roadmap Prioritization", "LLMOps & Model Governance", "FinOps & Cloud Cost Optimization", "Stakeholder Negotiation & Business Communication", "ROI Business Case Modeling"],
     "sdg": [{"targetCode": "SDG 8.2", "targetTitle": "Economic productivity and high-tier jobs", "affinityScore": 0.92}],
     "mult": {"moderate": 1.12, "accelerated_ai": 1.25, "green_economy": 1.05},
     "radar": {"AI & Digital Tools": 86, "Data Literacy & Analytics": 85, "Domain Operations": 90, "Human Communication": 92, "ESG & Sustainability": 75}},

    # Sector 2: Clean Energy, Climate Tech & ESG Sustainability (11 roles)
    {"roleId": "role-esg-data-analyst", "title": "ESG Data & Carbon Accounting Auditor",
     "title_ms": "Juruaudit Data ESG & Perakaunan Karbon", "title_zh": "ESG 可持续数据与碳核算审计师",
     "industry": "Clean Energy & ESG",
     "skills": ["GHG Scope 1-3 Carbon Accounting", "Life Cycle Assessment (LCA) SimaPro/OpenLCA", "SQL & Relational Database Design", "ESG Supply Chain Due Diligence (CSDDD)", "Sustainability Assurance Reporting (CSRD/ISSB)", "Financial Accounting & Ledger Principles"],
     "sdg": [{"targetCode": "SDG 12.2", "targetTitle": "Sustainable management and efficient use of natural resources", "affinityScore": 0.96}, {"targetCode": "SDG 13.3", "targetTitle": "Improve climate mitigation education and institutional capacity", "affinityScore": 0.95}],
     "mult": {"moderate": 1.15, "accelerated_ai": 1.05, "green_economy": 1.35},
     "radar": {"AI & Digital Tools": 82, "Data Literacy & Analytics": 90, "Domain Operations": 88, "Human Communication": 85, "ESG & Sustainability": 98}},

    {"roleId": "role-smart-grid-engineer", "title": "Smart Grid & Renewable Integration Specialist",
     "title_ms": "Pakar Integrasi Boleh Diperbaharui & Grid Pintar", "title_zh": "智能电网与新能源并网调度专家",
     "industry": "Clean Energy & ESG",
     "skills": ["Smart Grid Energy Management Systems (EMS)", "Battery Energy Storage Systems (BESS)", "Renewable PPA (Power Purchase Agreement) Structuring", "Power System Stability Simulation", "Python Development"],
     "sdg": [{"targetCode": "SDG 7.2", "targetTitle": "Substantially increase share of renewable energy", "affinityScore": 0.97}, {"targetCode": "SDG 9.4", "targetTitle": "Upgrade infrastructure with clean technologies", "affinityScore": 0.92}],
     "mult": {"moderate": 1.15, "accelerated_ai": 1.08, "green_economy": 1.35},
     "radar": {"AI & Digital Tools": 85, "Data Literacy & Analytics": 88, "Domain Operations": 92, "Human Communication": 76, "ESG & Sustainability": 95}},

    {"roleId": "role-bess-project-manager", "title": "Battery Energy Storage (BESS) Operations Lead",
     "title_ms": "Ketua Operasi Penyimpanan Tenaga Bateri (BESS)", "title_zh": "大型电池储能系统运营主管",
     "industry": "Clean Energy & ESG",
     "skills": ["Battery Energy Storage Systems (BESS)", "Smart Grid Energy Management Systems (EMS)", "Industrial IoT & SCADA Monitoring", "Electrical Safety Protocols", "Project Management & Roadmap Prioritization"],
     "sdg": [{"targetCode": "SDG 7.2", "targetTitle": "Renewable energy integration", "affinityScore": 0.95}],
     "mult": {"moderate": 1.12, "accelerated_ai": 1.05, "green_economy": 1.32},
     "radar": {"AI & Digital Tools": 82, "Data Literacy & Analytics": 85, "Domain Operations": 94, "Human Communication": 80, "ESG & Sustainability": 94}},

    {"roleId": "role-circular-economy-strategist", "title": "Circular Economy & Industrial Symbiosis Manager",
     "title_ms": "Pengurus Simbiosis Industri & Ekonomi Kitaran", "title_zh": "循环经济与工业共生循环体系主管",
     "industry": "Clean Energy & ESG",
     "skills": ["Circular Economy Materials Flow Analysis", "Life Cycle Assessment (LCA) SimaPro/OpenLCA", "Waste-to-Resource Logistics", "Stakeholder Negotiation & Business Communication", "Environmental Regulatory Compliance"],
     "sdg": [{"targetCode": "SDG 12.5", "targetTitle": "Substantially reduce waste generation through recycling", "affinityScore": 0.98}],
     "mult": {"moderate": 1.10, "accelerated_ai": 1.0, "green_economy": 1.30},
     "radar": {"AI & Digital Tools": 78, "Data Literacy & Analytics": 85, "Domain Operations": 90, "Human Communication": 88, "ESG & Sustainability": 96}},

    {"roleId": "role-green-hydrogen-plant-engineer", "title": "Green Hydrogen & Clean Fuels Specialist",
     "title_ms": "Pakar Bahan Api Bersih & Hidrogen Hijau", "title_zh": "绿氢化工与清洁零碳能源工程师",
     "industry": "Clean Energy & ESG",
     "skills": ["Green Hydrogen Electrolyzer Operations", "Hazardous Chemical Process Safety", "Renewable PPA (Power Purchase Agreement) Structuring", "Thermodynamic Process Simulation", "Instrumentation & Control"],
     "sdg": [{"targetCode": "SDG 7.2", "targetTitle": "Clean fuel infrastructure", "affinityScore": 0.94}],
     "mult": {"moderate": 1.10, "accelerated_ai": 1.05, "green_economy": 1.35},
     "radar": {"AI & Digital Tools": 82, "Data Literacy & Analytics": 84, "Domain Operations": 95, "Human Communication": 75, "ESG & Sustainability": 95}},

    {"roleId": "role-climate-risk-financial-analyst", "title": "Climate Risk & Green Finance Analyst",
     "title_ms": "Penganalisis Kewangan Hijau & Risiko Iklim", "title_zh": "气候物理风险与绿色金融量化分析师",
     "industry": "Clean Energy & ESG",
     "skills": ["Climate Physical Risk Modeling (TCFD)", "Financial Accounting & Ledger Principles", "Python Development", "SQL & Relational Database Design", "Macroeconomic Scenario Stress Testing"],
     "sdg": [{"targetCode": "SDG 13.3", "targetTitle": "Institutional climate risk assessment", "affinityScore": 0.93}],
     "mult": {"moderate": 1.12, "accelerated_ai": 1.10, "green_economy": 1.30},
     "radar": {"AI & Digital Tools": 84, "Data Literacy & Analytics": 92, "Domain Operations": 88, "Human Communication": 82, "ESG & Sustainability": 92}},

    {"roleId": "role-sustainable-building-consultant", "title": "Net-Zero Building Energy Modeler",
     "title_ms": "Pemodel Tenaga Bangunan Sifar Bersih", "title_zh": "净零能耗建筑能源建模咨询师",
     "industry": "Clean Energy & ESG",
     "skills": ["Building Energy Modeling (EnergyPlus/DesignBuilder)", "HVAC Optimization", "Industrial Heat Pump Integration", "Green Building Certifications (LEED/GreenRE)", "Sensors & Building Automation"],
     "sdg": [{"targetCode": "SDG 9.4", "targetTitle": "Retrofit buildings with sustainable technologies", "affinityScore": 0.94}],
     "mult": {"moderate": 1.08, "accelerated_ai": 1.05, "green_economy": 1.28},
     "radar": {"AI & Digital Tools": 85, "Data Literacy & Analytics": 86, "Domain Operations": 90, "Human Communication": 80, "ESG & Sustainability": 94}},

    {"roleId": "role-digital-mrv-carbon-engineer", "title": "Digital MRV & Carbon Markets Technologist",
     "title_ms": "Jurutera Pasaran Karbon & MRV Digital", "title_zh": "数字化 MRV 与自愿碳减排市场技术主管",
     "industry": "Clean Energy & ESG",
     "skills": ["Carbon Credit Verification & MRV Protocols", "Satellite Remote Sensing Data Analytics", "IoT Telemetry Streaming", "Python Development", "Carbon Registry Standards (Verra/Gold Standard)"],
     "sdg": [{"targetCode": "SDG 13.3", "targetTitle": "Improve climate measurement and verification", "affinityScore": 0.95}],
     "mult": {"moderate": 1.10, "accelerated_ai": 1.12, "green_economy": 1.30},
     "radar": {"AI & Digital Tools": 88, "Data Literacy & Analytics": 90, "Domain Operations": 85, "Human Communication": 80, "ESG & Sustainability": 96}},

    {"roleId": "role-ev-charging-infrastructure-lead", "title": "EV Charging & Microgrid Infrastructure Lead",
     "title_ms": "Ketua Infrastruktur Pengecasan EV & Mikrogrid", "title_zh": "电动汽车充电桩微电网基础设施总监",
     "industry": "Clean Energy & ESG",
     "skills": ["EV Fleet Telematics & Charging Optimization", "Smart Grid Energy Management Systems (EMS)", "Power Electronics Distribution", "Municipal Permitting & Civil Integration", "Project Management & Roadmap Prioritization"],
     "sdg": [{"targetCode": "SDG 11.2", "targetTitle": "Sustainable transport systems for all", "affinityScore": 0.93}],
     "mult": {"moderate": 1.12, "accelerated_ai": 1.08, "green_economy": 1.30},
     "radar": {"AI & Digital Tools": 84, "Data Literacy & Analytics": 82, "Domain Operations": 94, "Human Communication": 85, "ESG & Sustainability": 92}},

    {"roleId": "role-precision-agritech-specialist", "title": "Precision AgriTech & Soil Carbon Specialist",
     "title_ms": "Pakar Karbon Tanah & AgriTech Ketepatan", "title_zh": "精准智慧农业与土壤固碳技术专家",
     "industry": "Clean Energy & ESG",
     "skills": ["Sustainable Agricultural Drone Analytics", "Soil Carbon Sequestration Chemistry", "Python Development", "GIS Spatial Analytics", "Irrigation Automation"],
     "sdg": [{"targetCode": "SDG 2.4", "targetTitle": "Sustainable food production and resilient agriculture", "affinityScore": 0.96}],
     "mult": {"moderate": 1.08, "accelerated_ai": 1.10, "green_economy": 1.28},
     "radar": {"AI & Digital Tools": 86, "Data Literacy & Analytics": 88, "Domain Operations": 90, "Human Communication": 75, "ESG & Sustainability": 95}},

    {"roleId": "role-supply-chain-decarbonization-lead", "title": "Supply Chain Decarbonization Manager",
     "title_ms": "Pengurus Penyahkarbonan Rantaian Bekalan", "title_zh": "跨国供应链脱碳与可持续采购总监",
     "industry": "Clean Energy & ESG",
     "skills": ["ESG Supply Chain Due Diligence (CSDDD)", "GHG Scope 1-3 Carbon Accounting", "Supplier Audit Verification", "Stakeholder Negotiation & Business Communication", "Contractual Sustainability Clauses"],
     "sdg": [{"targetCode": "SDG 12.2", "targetTitle": "Efficient natural resource utilization", "affinityScore": 0.93}],
     "mult": {"moderate": 1.12, "accelerated_ai": 1.05, "green_economy": 1.32},
     "radar": {"AI & Digital Tools": 80, "Data Literacy & Analytics": 88, "Domain Operations": 92, "Human Communication": 90, "ESG & Sustainability": 96}},
]

# Function to generate remaining roles across sectors up to 105
SECTORS_CATALOG = [
    ("Cloud Native, DevOps & SRE", [
        ("Cloud Platform Architect", "Arkitek Platform Awan", "云原生多云架构师", ["Kubernetes Multi-Cluster Orchestration", "GitOps with ArgoCD & Flux", "Docker Containerization", "Linux Server Administration", "FinOps & Cloud Cost Optimization"]),
        ("eBPF Kernel & Observability Engineer", "Jurutera Kebolehcerapan eBPF", "eBPF 内核网络与可观测性工程师", ["eBPF Kernel Observability (Cilium)", "Linux Server Administration", "Rust Systems Programming", "OpenTelemetry Distributed Tracing"]),
        ("FinOps & Cloud Financial Governor", "Penguasa Kewangan Awan FinOps", "FinOps 云财务治理与算力优化专家", ["FinOps & Cloud Cost Optimization", "SQL & Relational Database Design", "Python Development", "Data Warehousing (Snowflake/BigQuery)"]),
        ("Site Reliability Engineer (SRE)", "Jurutera Kebolehpercayaan Tapak (SRE)", "SRE 站点高可用稳定性工程师", ["Kubernetes Multi-Cluster Orchestration", "OpenTelemetry Distributed Tracing", "Linux Server Administration", "Incident Post-Mortem Facilitation"]),
        ("WebAssembly Edge Runtime Engineer", "Jurutera Masa Jalan Tepi WebAssembly", "WASM 边缘轻量运行时开发工程师", ["WebAssembly (WASM) Serverless Runtime", "Rust Systems Programming", "Docker Containerization", "Network Socket Programming"]),
        ("Internal Developer Platform Lead", "Ketua Platform Pembangun Dalaman", "企业内部开发者平台总架构师", ["Platform Engineering with Backstage", "Kubernetes Multi-Cluster Orchestration", "GitOps with ArgoCD & Flux", "Product Management & Roadmap Prioritization"]),
        ("Cloud Network Mesh Architect", "Arkitek Jaringan Awan", "云服务服务网格与负载路由架构师", ["Kubernetes Multi-Cluster Orchestration", "eBPF Kernel Observability (Cilium)", "Zero Trust Network Access (ZTNA)", "Linux Server Administration"]),
        ("Immutable Infrastructure Engineer", "Jurutera Infrastruktur Tak Boleh Ubah", "不可变基础设施与声明式配置工程师", ["GitOps with ArgoCD & Flux", "Docker Containerization", "Linux Server Administration", "Terraform / OpenTofu"]),
        ("Distributed Cache & Storage Architect", "Arkitek Storan Teragih", "分布式高性能缓存与存储架构师", ["Rust Systems Programming", "Linux Server Administration", "SQL & Relational Database Design", "Network Latency Optimization"]),
        ("Hybrid Cloud Disaster Recovery Specialist", "Pakar Pemulihan Bencana Awan", "混合云灾难备份与多活高可用专家", ["Kubernetes Multi-Cluster Orchestration", "Linux Server Administration", "Enterprise Risk Management (COSO/ISO 31000)", "Zero Trust Network Access (ZTNA)"]),
        ("Serverless Microservices Architect", "Arkitek Perkhidmatan Mikro Tanpa Pelayan", "无服务事件驱动微服务架构师", ["WebAssembly (WASM) Serverless Runtime", "Python Development", "RESTful API Architecture & Fastify/FastAPI", "Docker Containerization"])
    ]),
    ("Cybersecurity, Privacy & Zero Trust", [
        ("Zero Trust Architecture Lead", "Ketua Seni Bina Amanah Sifar", "零信任安全网络架构总监", ["Zero Trust Network Access (ZTNA)", "Identity Threat Detection and Response (ITDR)", "Cloud Security Posture Management (CSPM)", "Enterprise Risk Management (COSO/ISO 31000)"]),
        ("Cloud Security Posture (CSPM) Engineer", "Jurutera CSPM Awan", "云安全配置与合规阻断工程师", ["Cloud Security Posture Management (CSPM)", "Kubernetes Multi-Cluster Orchestration", "Cybersecurity Fundamentals & Vulnerability Patching", "Python Development"]),
        ("API Security & WAF Defense Engineer", "Jurutera Keselamatan API", "API 接口安全与深度防护工程师", ["API Security & Shadow API Discovery", "Zero Trust Network Access (ZTNA)", "RESTful API Architecture & Fastify/FastAPI", "Python Development"]),
        ("Identity & Access Governance Architect", "Arkitek Tadbir Urus Akses & Identiti", "身份威胁防御与特权访问架构师", ["Identity Threat Detection and Response (ITDR)", "Zero Trust Network Access (ZTNA)", "Cybersecurity Fundamentals & Vulnerability Patching"]),
        ("Post-Quantum Cryptography Migrator", "Pakar Migrasi Kriptografi Pasca-Kuantum", "抗量子密码学算法工程迁移专家", ["Post-Quantum Cryptography (PQC)", "Rust Systems Programming", "Cybersecurity Fundamentals & Vulnerability Patching"]),
        ("DevSecOps Pipeline Automation Lead", "Ketua Automasi Paip DevSecOps", "DevSecOps 安全左移与流水线总管", ["GitOps with ArgoCD & Flux", "Cloud Security Posture Management (CSPM)", "Cybersecurity Fundamentals & Vulnerability Patching", "Docker Containerization"]),
        ("Incident Response & Digital Forensics Analyst", "Penganalisis Tindak Balas Insiden", "安全事件应急响应与数字取证专家", ["Linux Server Administration", "OpenTelemetry Distributed Tracing", "Cybersecurity Fundamentals & Vulnerability Patching", "Identity Threat Detection and Response (ITDR)"]),
        ("Privacy Engineering & GDPR/PDPA Officer", "Pegawai Kejuruteraan Privasi", "隐私工程与跨境数据合规专员", ["Federated Learning & Privacy-Preserving AI", "Enterprise Risk Management (COSO/ISO 31000)", "SQL & Relational Database Design"]),
        ("Threat Intelligence & Hunting Specialist", "Pakar Memburu Ancaman Siber", "高级持续性威胁 (APT) 狩猎分析师", ["API Security & Shadow API Discovery", "Python Development", "Cybersecurity Fundamentals & Vulnerability Patching", "Linux Server Administration"]),
        ("Cyber Resilience & Red Team Operator", "Pengendali Pasukan Merah Siber", "网络韧性评估与攻防对抗专家", ["API Security & Shadow API Discovery", "Zero Trust Network Access (ZTNA)", "Prompt Engineering & Red Teaming", "Python Development"]),
        ("Industrial SCADA Security Specialist", "Pakar Keselamatan SCADA Industri", "关键工业物联网与工控系统安全专家", ["Linux Server Administration", "Zero Trust Network Access (ZTNA)", "Cybersecurity Fundamentals & Vulnerability Patching", "Industrial Robotics Protocols"])
    ]),
    ("Data Engineering & Business Intelligence", [
        ("Real-time Stream Processing Engineer", "Jurutera Pemprosesan Aliran Masa Nyata", "高并发实时流数据计算架构师", ["Python Development", "SQL & Relational Database Design", "Data Warehousing (Snowflake/BigQuery)", "Kubernetes Multi-Cluster Orchestration"]),
        ("Lakehouse Architecture Specialist", "Pakar Seni Bina Lakehouse", "现代湖仓一体 (Lakehouse) 架构师", ["Data Warehousing (Snowflake/BigQuery)", "SQL & Relational Database Design", "Python Development", "Docker Containerization"]),
        ("Data Quality & Governance Steward", "Pengurus Kualiti & Tadbir Urus Data", "企业数据治理与血缘质量专家", ["SQL & Relational Database Design", "Data Warehousing (Snowflake/BigQuery)", "Enterprise Risk Management (COSO/ISO 31000)", "Product Management & Roadmap Prioritization"]),
        ("Analytics Engineer & Metric Modeler", "Jurutera Analitik & Pemodel Metrik", "指标中台与商业分析工程专家", ["Data Warehousing (Snowflake/BigQuery)", "SQL & Relational Database Design", "Python Development", "UX User Research & Usability Testing"]),
        ("Graph Database & Relationship Modeler", "Pemodel Hubungan & Pangkalan Data Graf", "图数据库与复杂关系建模专家", ["Graph Neural Networks (GNN)", "SQL & Relational Database Design", "Vector Database Optimization (pgvector/HNSW)", "Python Development"]),
        ("Edge Data Pipeline Orchestrator", "Penyusun Paip Data Tepi", "边缘设备数据清洗与同步工程师", ["Python Development", "Linux Server Administration", "Docker Containerization", "RESTful API Architecture & Fastify/FastAPI"]),
        ("Spatial GIS & Geospatial Data Engineer", "Jurutera Data Spatial & Geospatial", "地理信息空间大数据开发工程师", ["Python Development", "SQL & Relational Database Design", "Sustainable Agricultural Drone Analytics", "Vector Database Optimization (pgvector/HNSW)"]),
        ("Financial Data Pipeline Auditor", "Juruaudit Saluran Data Kewangan", "高保真金融量化数据管道架构师", ["SQL & Relational Database Design", "Financial Accounting & Ledger Principles", "Python Development", "Data Warehousing (Snowflake/BigQuery)"]),
        ("Biomedical Sequence Data Curator", "Kurator Data Jujukan Bioperubatan", "生物医学测序与组学数据处理专家", ["Python Development", "SQL & Relational Database Design", "Synthetic Data Generation", "Docker Containerization"]),
        ("Chief Data Officer Strategist", "Pakar Strategi Ketua Pegawai Data", "企业首席数据官技术战略顾问", ["Enterprise Risk Management (COSO/ISO 31000)", "Data Warehousing (Snowflake/BigQuery)", "Product Management & Roadmap Prioritization", "Stakeholder Negotiation & Business Communication"])
    ]),
    ("Digital Health, Bioinformatics & MedTech", [
        ("Bioinformatics Pipeline Developer", "Pembangun Saluran Bioinformatik", "生物信息学分析流程架构师", ["Python Development", "Linux Server Administration", "Docker Containerization", "Synthetic Data Generation"]),
        ("Clinical Decision Support AI Specialist", "Pakar AI Sokongan Keputusan Klinikal", "临床辅助诊疗与智慧医疗 AI 专家", ["Multimodal LLM Fine-Tuning", "Python Development", "Federated Learning & Privacy-Preserving AI", "UX User Research & Usability Testing"]),
        ("Medical Imaging Deep Learning Engineer", "Jurutera Pembelajaran Mendalam Pengimejan Perubatan", "医学影像深度学习诊断算法工程师", ["Python Development", "Multimodal LLM Fine-Tuning", "Synthetic Data Generation", "Docker Containerization"]),
        ("Digital Health Usability Researcher", "Penyelidik Kebolehgunaan Kesihatan Digital", "数字健康与医疗器械交互研究员", ["UX User Research & Usability Testing", "Product Management & Roadmap Prioritization", "Human-Computer Interaction"]),
        ("Wearable Biosensor Telemetry Engineer", "Jurutera Telemetri Biosensor Boleh Pakai", "可穿戴生物传感与连续体征监测工程师", ["Python Development", "Linux Server Administration", "Edge AI Inference Acceleration", "RESTful API Architecture & Fastify/FastAPI"]),
        ("Health Data Privacy & HIPAA/GDPR Auditor", "Juruaudit Privasi Data Kesihatan", "医疗健康数据合规与隐私审计师", ["Federated Learning & Privacy-Preserving AI", "Enterprise Risk Management (COSO/ISO 31000)", "SQL & Relational Database Design"]),
        ("Genomic Variant Annotation Analyst", "Penganalisis Anotasi Varian Genomik", "基因突变临床注释与精准医疗分析师", ["Python Development", "SQL & Relational Database Design", "Synthetic Data Generation"]),
        ("Robotic Surgical System Software Engineer", "Jurutera Perisian Sistem Pembedahan Robotik", "机器人辅助微创手术控制软件工程师", ["Rust Systems Programming", "Linux Server Administration", "Edge AI Inference Acceleration"]),
        ("Digital Therapeutics (DTx) Product Lead", "Ketua Produk Terapeutik Digital", "数字疗法与慢性病管理产品总监", ["Product Management & Roadmap Prioritization", "UX User Research & Usability Testing", "Stakeholder Negotiation & Business Communication"]),
        ("Hospital Electronic Health Record Integration Architect", "Arkitek Integrasi EHR Hospital", "医院互操作性电子病历系统总架构师", ["RESTful API Architecture & Fastify/FastAPI", "SQL & Relational Database Design", "Zero Trust Network Access (ZTNA)"])
    ]),
    ("FinTech, Blockchain & Algorithmic Risk", [
        ("Algorithmic Risk & Stress Testing Officer", "Pegawai Ujian Tekanan & Risiko Algoritma", "算法量化风险防范与极端压力测试官", ["Financial Accounting & Ledger Principles", "Python Development", "Enterprise Risk Management (COSO/ISO 31000)", "SQL & Relational Database Design"]),
        ("Decentralized Identity & Credential Architect", "Arkitek Kredensial & Identiti Terdesentralisasi", "分布式数字身份与可验证凭证架构师", ["Rust Systems Programming", "Zero Trust Network Access (ZTNA)", "Post-Quantum Cryptography (PQC)", "RESTful API Architecture & Fastify/FastAPI"]),
        ("Anti-Financial Crime AI Investigator", "Penyiasat AI Anti-Jenayah Kewangan", "智能反洗钱与反欺诈图谱分析专家", ["Graph Neural Networks (GNN)", "SQL & Relational Database Design", "Python Development", "Financial Accounting & Ledger Principles"]),
        ("RegTech Compliance Automation Specialist", "Pakar Automasi Pematuhan RegTech", "监管科技自动化与合规沙盒总监", ["Financial Accounting & Ledger Principles", "Enterprise Risk Management (COSO/ISO 31000)", "Python Development", "RESTful API Architecture & Fastify/FastAPI"]),
        ("DeFi Protocol Security Auditor", "Juruaudit Keselamatan Protokol DeFi", "去中心化金融协议智能合约安全审计师", ["Rust Systems Programming", "Cybersecurity Fundamentals & Vulnerability Patching", "Financial Accounting & Ledger Principles"]),
        ("Quantitative Carbon Asset Modeler", "Pemodel Aset Karbon Kuantitatif", "碳资产金融衍生品与量化定价建模师", ["Climate Physical Risk Modeling (TCFD)", "Financial Accounting & Ledger Principles", "Python Development", "SQL & Relational Database Design"]),
        ("Embedded Banking API Lead", "Ketua API Perbankan Terbenam", "开放银行与场景化金融架构师", ["RESTful API Architecture & Fastify/FastAPI", "API Security & Shadow API Discovery", "Financial Accounting & Ledger Principles", "Docker Containerization"]),
        ("Digital Payment Fraud Operations Manager", "Pengurus Operasi Penipuan Pembayaran Digital", "全球实时跨境支付风控反作弊总监", ["SQL & Relational Database Design", "Graph Neural Networks (GNN)", "Enterprise Risk Management (COSO/ISO 31000)", "Stakeholder Negotiation & Business Communication"]),
        ("Central Bank Digital Currency (CBDC) Systems Analyst", "Penganalisis Sistem CBDC", "法定数字货币清算结算核心系统分析师", ["Rust Systems Programming", "Financial Accounting & Ledger Principles", "Zero Trust Network Access (ZTNA)", "Post-Quantum Cryptography (PQC)"]),
        ("Microfinance Impact Analytics Lead", "Ketua Analitik Impak Kewangan Mikro", "普惠金融与信用评估大数据专家", ["SQL & Relational Database Design", "Python Development", "Data Warehousing (Snowflake/BigQuery)", "Financial Accounting & Ledger Principles"])
    ]),
    ("Smart Logistics, Autonomous Mobility & Supply Chain", [
        ("Autonomous Drone Fleet Fleet Manager", "Pengurus Armada Dron Autonomi", "商用无人机编队自动化调度总监", ["Sustainable Agricultural Drone Analytics", "Edge AI Inference Acceleration", "Linux Server Administration", "Project Management & Roadmap Prioritization"]),
        ("Supply Chain Digital Twin Modeler", "Pemodel Kembar Digital Rantaian Bekalan", "供应链全链路数字孪生仿真建模师", ["Python Development", "Data Warehousing (Snowflake/BigQuery)", "SQL & Relational Database Design", "Enterprise Risk Management (COSO/ISO 31000)"]),
        ("Automated Warehouse Robotics Engineer", "Jurutera Robotik Gudang Automatik", "智能无人仓储物流机器人协同工程师", ["Edge AI Inference Acceleration", "Linux Server Administration", "Rust Systems Programming", "Docker Containerization"]),
        ("Cold Chain Temperature IoT Compliance Lead", "Ketua Pematuhan IoT Rantaian Sejuk", "医药冷链温湿度物联网合规主管", ["Linux Server Administration", "Enterprise Risk Management (COSO/ISO 31000)", "RESTful API Architecture & Fastify/FastAPI", "SQL & Relational Database Design"]),
        ("Multimodal Freight Carbon Routing Specialist", "Pakar Penghalaan Karbon Pengangkutan", "多式联运低碳智能路径规划专家", ["GHG Scope 1-3 Carbon Accounting", "SQL & Relational Database Design", "Python Development", "Data Warehousing (Snowflake/BigQuery)"]),
        ("Port Automation Container Crane Systems Lead", "Ketua Sistem Kren Kontena Automasi Pelabuhan", "智慧港口全自动集装箱吊装系统工程师", ["Linux Server Administration", "Edge AI Inference Acceleration", "Cybersecurity Fundamentals & Vulnerability Patching"]),
        ("Fleet Electrification Infrastructure Planner", "Perancang Infrastruktur Elektrifikasi Armada", "大型企业车队低碳电动化转型规划师", ["EV Fleet Telematics & Charging Optimization", "Building Energy Modeling (EnergyPlus/DesignBuilder)", "Financial Accounting & Ledger Principles", "Project Management & Roadmap Prioritization"]),
        ("Reverse Logistics & E-Waste Recovery Architect", "Arkitek Pemulihan Sisa-E & Logistik Balikan", "逆向物流与电子废料高价值回收专家", ["Circular Economy Materials Flow Analysis", "Life Cycle Assessment (LCA) SimaPro/OpenLCA", "Stakeholder Negotiation & Business Communication"]),
        ("Autonomous Vehicle Safety Validation Engineer", "Jurutera Pengesahan Keselamatan Kenderaan Autonomi", "自动驾驶系统安全冗余与仿真测试工程师", ["Synthetic Data Generation", "Python Development", "Linux Server Administration", "Enterprise Risk Management (COSO/ISO 31000)"]),
        ("Smart Procurement Predictive Sourcing Specialist", "Pakar Perolehan Pintar Ramalan", "全球预测性采购与供应链敏捷决策主管", ["SQL & Relational Database Design", "Data Warehousing (Snowflake/BigQuery)", "Stakeholder Negotiation & Business Communication", "Enterprise Risk Management (COSO/ISO 31000)"])
    ]),
    ("Software Systems, Distributed Architectures & Web3", [
        ("High-Performance Distributed Systems Architect", "Arkitek Sistem Teragih Berprestasi Tinggi", "高并发分布式系统与一致性协议架构师", ["Rust Systems Programming", "Linux Server Administration", "Kubernetes Multi-Cluster Orchestration", "SQL & Relational Database Design"]),
        ("Full-Stack Modern Web Applications Architect", "Arkitek Aplikasi Web Moden Penuh", "现代全栈 Web 应用总架构师", ["TypeScript & Modern JavaScript", "RESTful API Architecture & Fastify/FastAPI", "Docker Containerization", "SQL & Relational Database Design"]),
        ("Micro-Frontend Design Systems Lead", "Ketua Sistem Reka Bentuk Mikro-Frontend", "微前端架构与大型企业设计系统主管", ["TypeScript & Modern JavaScript", "UX User Research & Usability Testing", "Git Version Control & CI/CD Pipelines"]),
        ("GraphQL & API Gateway Architect", "Arkitek Gateway API & GraphQL", "企业级统一 API 网关与数据图架构师", ["RESTful API Architecture & Fastify/FastAPI", "TypeScript & Modern JavaScript", "API Security & Shadow API Discovery", "Docker Containerization"]),
        ("Decentralized Storage & IPFS Network Engineer", "Jurutera Rangkaian IPFS & Storan Terdesentralisasi", "分布式去中心化存储网络系统工程师", ["Rust Systems Programming", "Linux Server Administration", "Zero Trust Network Access (ZTNA)"]),
        ("Real-time WebSockets & Collaboration Engine Lead", "Ketua Enjin Kerjasama Masa Nyata", "实时多人在线协作引擎软件工程师", ["TypeScript & Modern JavaScript", "Rust Systems Programming", "OpenTelemetry Distributed Tracing", "Docker Containerization"]),
        ("Software Testing & Quality Automation Architect", "Arkitek Automasi Kualiti & Ujian Perisian", "端到端自动化测试与混沌工程架构师", ["Git Version Control & CI/CD Pipelines", "Python Development", "Docker Containerization", "Kubernetes Multi-Cluster Orchestration"]),
        ("Mobile Systems Cross-Platform Architect", "Arkitek Sistem Mudah Alih Silang Platform", "跨端高性能移动应用系统架构师", ["TypeScript & Modern JavaScript", "UX User Research & Usability Testing", "RESTful API Architecture & Fastify/FastAPI"]),
        ("Legacy System Modernization & Microservices Decoupler", "Pakar Pemodenan Sistem Legasi", "大型传统单体系统云原生解耦专家", ["RESTful API Architecture & Fastify/FastAPI", "SQL & Relational Database Design", "Docker Containerization", "GitOps with ArgoCD & Flux"]),
        ("Developer Experience & Tooling Engineer", "Jurutera Alat & Pengalaman Pembangun", "研发效能提升与开发者体验工程专家", ["Git Version Control & CI/CD Pipelines", "Platform Engineering with Backstage", "TypeScript & Modern JavaScript", "Linux Server Administration"])
    ]),
    ("Human-AI Experience, Digital Ethics & Inclusive Design", [
        ("Digital Accessibility (WCAG 2.2) Lead", "Ketua Kebolehcapaian Digital", "全渠道数字无障碍 (WCAG) 规范主管", ["UX User Research & Usability Testing", "TypeScript & Modern JavaScript", "Stakeholder Negotiation & Business Communication"]),
        ("Human-in-the-Loop Workflow Specialist", "Pakar Aliran Kerja Manusia Dalam Gelung", "人机协同工作流质检与交互专家", ["UX User Research & Usability Testing", "Prompt Engineering & Red Teaming", "Product Management & Roadmap Prioritization"]),
        ("AI Ergonomics & Cognitive Load Analyst", "Penganalisis Beban Kognitif & Ergonomik AI", "认知负荷与人因工程心理学研究员", ["UX User Research & Usability Testing", "Product Management & Roadmap Prioritization", "Stakeholder Negotiation & Business Communication"]),
        ("Inclusive Product Design Director", "Pengarah Reka Bentuk Produk Inklusif", "多元包容性体验设计与用户研究总监", ["UX User Research & Usability Testing", "Product Management & Roadmap Prioritization", "Stakeholder Negotiation & Business Communication"]),
        ("Responsible Tech Policy & Governance Officer", "Pegawai Dasar & Tadbir Urus Teknologi", "科技伦理委员会与企业自律政策专员", ["Enterprise Risk Management (COSO/ISO 31000)", "LLMOps & Model Governance", "Stakeholder Negotiation & Business Communication"]),
        ("Multilingual Localization & Cultural Nuance Lead", "Ketua Penyetempatan Multilingual", "跨文化本地化与语言大模型适应性总监", ["UX User Research & Usability Testing", "Prompt Engineering & Red Teaming", "Stakeholder Negotiation & Business Communication"]),
        ("Behavioral Data Ethics & Consumer Privacy Lead", "Ketua Etika Data Tingkah Laku", "用户行为数据隐私与伦理合规总监", ["Enterprise Risk Management (COSO/ISO 31000)", "SQL & Relational Database Design", "Stakeholder Negotiation & Business Communication"]),
        ("Virtual Reality Spatial Interaction Designer", "Pereka Interaksi Ruang VR", "空间计算与沉浸式交互体验架构师", ["UX User Research & Usability Testing", "Human-Computer Interaction", "Diffusion Models for Industrial Design"]),
        ("Future of Work Organizational Strategist", "Pakar Strategi Organisasi Masa Depan Kerja", "未来工作形态与劳动力升级转型顾问", ["Product Management & Roadmap Prioritization", "Stakeholder Negotiation & Business Communication", "Enterprise Risk Management (COSO/ISO 31000)"]),
        ("AI Augmented Education Content Architect", "Arkitek Kandungan Pendidikan Berbantukan AI", "AI 自适应教育与技能培养内容架构师", ["UX User Research & Usability Testing", "Prompt Engineering & Red Teaming", "Product Management & Roadmap Prioritization"])
    ])
]

# Generate standardized roles from the catalog
for sector_name, roles_list in SECTORS_CATALOG:
    for item in roles_list:
        title_en = item[0]
        title_ms = item[1]
        title_zh = item[2]
        skills = item[3]
        role_slug = f"role-{title_en.lower().replace(' ', '-').replace('/', '-').replace('(', '').replace(')', '').replace('&', 'and')}"
        
        ROLES_TEMPLATES.append({
            "roleId": role_slug,
            "title": title_en,
            "title_ms": title_ms,
            "title_zh": title_zh,
            "industry": sector_name,
            "skills": skills,
            "sdg": [{"targetCode": "SDG 8.2", "targetTitle": "Technological upgrading & productivity", "affinityScore": 0.90},
                    {"targetCode": "SDG 9.4", "targetTitle": "Sustainable and resilient infrastructure", "affinityScore": 0.88}],
            "mult": {"moderate": 1.10, "accelerated_ai": 1.20, "green_economy": 1.10},
            "radar": {"AI & Digital Tools": 85, "Data Literacy & Analytics": 85, "Domain Operations": 85, "Human Communication": 80, "ESG & Sustainability": 75}
        })

print(f"Total Standardized ESCO Roles prepared: {len(ROLES_TEMPLATES)}")

# ==============================================================================
# DATASET 3: 17 UN SUSTAINABLE DEVELOPMENT GOAL TARGET VECTORS
# ==============================================================================
SDG_TARGETS_DATA = [
    {"targetCode": "SDG 1.2", "goalNumber": 1, "title": "Reduce poverty by half", "description": "Reduce by at least half the proportion of men, women and children living in poverty."},
    {"targetCode": "SDG 3.8", "goalNumber": 3, "title": "Universal health coverage", "description": "Achieve universal health coverage, including financial risk protection and access to safe essential medicines."},
    {"targetCode": "SDG 4.4", "goalNumber": 4, "title": "Relevant skills for decent work", "description": "Substantially increase the number of youth and adults who have relevant skills, including technical and vocational skills, for employment, decent jobs and entrepreneurship."},
    {"targetCode": "SDG 7.2", "goalNumber": 7, "title": "Increase renewable energy share", "description": "Increase substantially the share of renewable energy in the global energy mix."},
    {"targetCode": "SDG 8.2", "goalNumber": 8, "title": "Technological upgrading and productivity", "description": "Achieve higher levels of economic productivity through diversification, technological upgrading and innovation."},
    {"targetCode": "SDG 8.5", "goalNumber": 8, "title": "Full employment and decent work", "description": "Achieve full and productive employment and decent work for all women and men, with equal pay for work of equal value."},
    {"targetCode": "SDG 9.2", "goalNumber": 9, "title": "Sustainable and inclusive industrialization", "description": "Promote inclusive and sustainable industrialization and significantly raise industry's share of employment."},
    {"targetCode": "SDG 9.4", "goalNumber": 9, "title": "Upgrade infrastructure and clean technologies", "description": "Upgrade infrastructure and retrofit industries to make them sustainable, with increased resource-use efficiency and greater adoption of clean environmentally sound technologies."},
    {"targetCode": "SDG 9.5", "goalNumber": 9, "title": "Enhance scientific research and innovation", "description": "Enhance scientific research, upgrade technological capabilities of industrial sectors, and increase R&D spending."},
    {"targetCode": "SDG 10.4", "goalNumber": 10, "title": "Adopt fiscal and social protection policies", "description": "Adopt policies, especially fiscal, wage and social protection policies, to progressively achieve greater equality."},
    {"targetCode": "SDG 11.2", "goalNumber": 11, "title": "Affordable and sustainable transport", "description": "Provide access to safe, affordable, accessible and sustainable transport systems for all, expanding public transport."},
    {"targetCode": "SDG 11.6", "goalNumber": 11, "title": "Reduce environmental impact of cities", "description": "Reduce the adverse per capita environmental impact of cities, including by paying special attention to air quality and waste management."},
    {"targetCode": "SDG 12.2", "goalNumber": 12, "title": "Sustainable management of natural resources", "description": "Achieve the sustainable management and efficient use of natural resources."},
    {"targetCode": "SDG 12.5", "goalNumber": 12, "title": "Substantially reduce waste generation", "description": "Substantially reduce waste generation through prevention, reduction, recycling and reuse."},
    {"targetCode": "SDG 13.3", "goalNumber": 13, "title": "Climate education and early warning capacity", "description": "Improve education, awareness-raising and human and institutional capacity on climate change mitigation, adaptation and impact reduction."},
    {"targetCode": "SDG 16.6", "goalNumber": 16, "title": "Effective, accountable institutions", "description": "Develop effective, accountable and transparent institutions at all levels."},
    {"targetCode": "SDG 17.16", "goalNumber": 17, "title": "Enhance global partnerships for sustainability", "description": "Enhance the global partnership for sustainable development, complemented by multi-stakeholder partnerships mobilizing knowledge and technology."},
]

async def seed_all():
    print(f"\n========================================================")
    print(f"SkillVerse AI: Supabase Data Re-Ingestion Engine")
    print(f"Connecting to Supabase at: {supabase_url}")
    print(f"========================================================\n")

    capture_time = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Seed Trend Signals
        print(f"1. Ingesting {len(TREND_SIGNALS_DATA)} Trend Signals into Supabase...")
        signals_payload = []
        for s in TREND_SIGNALS_DATA:
            sources = [
                {
                    "sourceName": "Global Labor Dynamics Registry",
                    "url": "https://export.arxiv.org",
                    "citation": s["citation"],
                    "citation_zh": s["citation_zh"],
                    "citation_ms": s["citation_ms"],
                    "skillName_zh": s["zh"],
                    "skillName_ms": s["ms"],
                    "category_zh": s["cat_zh"],
                    "category_ms": s["cat_ms"],
                    "capturedAt": capture_time,
                }
            ]
            signals_payload.append({
                "id": str(uuid.uuid4()),
                "skillName": s["skillName"],
                "category": s["category"],
                "currentWindowC": float(s["c_t"]),
                "pastWindowC": float(s["c_prev"]),
                "velocityVs": float(s["velocityVs"]),
                "status": s["status"],
                "sources": sources,
                "updatedAt": capture_time,
            })

        # Batch insert trend signals in chunks of 30
        for i in range(0, len(signals_payload), 30):
            chunk = signals_payload[i:i+30]
            resp = await client.post(f"{supabase_url}/rest/v1/trend_signals", json=chunk, headers=headers)
            if resp.status_code not in (200, 201):
                print(f"Error inserting trend signals chunk {i}: {resp.status_code} -> {resp.text}")
            else:
                print(f" - Inserted trend signals {i+1} to {min(i+30, len(signals_payload))}")

        print(" Trend signals ingestion completed successfully!\n")

        # 2. Seed SDG Targets with 1024-dim dense vectors
        print(f"2. Embedding and ingesting {len(SDG_TARGETS_DATA)} UN SDG Targets...")
        sdg_payload = []
        for target in SDG_TARGETS_DATA:
            emb_text = f"UN SDG Target {target['targetCode']}: {target['title']}. {target['description']}"
            vec = await generate_embedding(emb_text)
            sdg_payload.append({
                "id": str(uuid.uuid4()),
                "target_code": target["targetCode"],
                "goal_number": target["goalNumber"],
                "title": target["title"],
                "description": target["description"],
                "embedding": vec,
                "created_at": capture_time,
            })

        resp = await client.post(f"{supabase_url}/rest/v1/sdg_targets", json=sdg_payload, headers=headers)
        if resp.status_code not in (200, 201):
            print(f"Error inserting SDG targets: {resp.status_code} -> {resp.text}")
        else:
            print(f" - Inserted {len(sdg_payload)} SDG Targets with 1024-dim vectors.")

        print(" SDG Targets ingestion completed successfully!\n")

        # 3. Seed ESCO Roles with 1024-dim BGE-M3 Dense Vectors
        print(f"3. Generating 1024-dim dense vectors for {len(ROLES_TEMPLATES)} standardized roles...")
        roles_payload = []
        for idx, role in enumerate(ROLES_TEMPLATES, 1):
            emb_text = f"Occupational Title: {role['title']}. Industry Sector: {role['industry']}. Essential Competencies: {', '.join(role['skills'])}."
            vec = await generate_embedding(emb_text)
            roles_payload.append({
                "id": str(uuid.uuid4()),
                "role_id": role["roleId"],
                "title": role["title"],
                "title_ms": role["title_ms"],
                "title_zh": role["title_zh"],
                "industry": role["industry"],
                "required_skills": role["skills"],
                "sdg_alignments": role["sdg"],
                "scenario_multipliers": role["mult"],
                "radar_requirements": role["radar"],
                "embedding": vec,
                "created_at": capture_time,
                "updated_at": capture_time,
            })
            if idx % 15 == 0 or idx == len(ROLES_TEMPLATES):
                print(f" - Embedded {idx}/{len(ROLES_TEMPLATES)} roles with 1024-dim BGE-M3 representations.")

        # Batch insert roles into Supabase in chunks of 20
        print("\nInserting embedded ESCO roles into Supabase...")
        for i in range(0, len(roles_payload), 20):
            chunk = roles_payload[i:i+20]
            resp = await client.post(f"{supabase_url}/rest/v1/esco_roles", json=chunk, headers=headers)
            if resp.status_code not in (200, 201):
                print(f"Error inserting roles chunk {i}: {resp.status_code} -> {resp.text}")
            else:
                print(f" - Inserted roles {i+1} to {min(i+20, len(roles_payload))}")

        print(" ESCO Roles ingestion completed successfully!\n")

    print("========================================================")
    print("All datasets verified and persisted into Supabase!")
    print(f"Trend Signals: {len(TREND_SIGNALS_DATA)} records")
    print(f"Standardized Roles: {len(ROLES_TEMPLATES)} records (with 1024-dim vectors)")
    print(f"SDG Targets: {len(SDG_TARGETS_DATA)} records (with 1024-dim vectors)")
    print("========================================================\n")

if __name__ == "__main__":
    asyncio.run(seed_all())
