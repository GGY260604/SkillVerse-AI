"""
Occupational Taxonomy Skill Localization
Provides authoritative trilingual skill translations for all 157 ESCO taxonomy skills.
"""

import json
from typing import Optional, Dict, List

SKILL_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "AI Safety & Alignment Auditing": {
        "zh": "AI 安全与对齐审计",
        "ms": "Pengauditan Keselamatan & Penjajaran AI"
    },
    "API & Microservices Architecture": {
        "zh": "API 与微服务架构设计",
        "ms": "Seni Bina API & Perkhidmatan Mikro"
    },
    "API Security & Shadow API Discovery": {
        "zh": "API 安全合规与影子 API 探测",
        "ms": "Keselamatan API & Penemuan API Bayangan"
    },
    "Adversarial Attack Simulation": {
        "zh": "AI 对抗样本攻击模拟与防御",
        "ms": "Simulasi Serangan Bermusuhan"
    },
    "Agentic AI Architecture": {
        "zh": "自主 AI 智能体系统架构",
        "ms": "Seni Bina AI Berautonomi (Agentic AI)"
    },
    "Agile Performance Management": {
        "zh": "敏捷绩效管理与迭代评估",
        "ms": "Pengurusan Prestasi Tangkas"
    },
    "Algorithm Design": {
        "zh": "高效算法设计与优化",
        "ms": "Reka Bentuk Algoritma"
    },
    "Algorithmic Bias Audit": {
        "zh": "算法偏见与公平性审计",
        "ms": "Audit Bias Algoritma"
    },
    "Algorithmic Risk Management": {
        "zh": "算法决策风险管理",
        "ms": "Pengurusan Risiko Algoritma"
    },
    "Battery Energy Storage Systems (BESS)": {
        "zh": "电池储能系统技术 (BESS)",
        "ms": "Sistem Penyimpanan Tenaga Bateri (BESS)"
    },
    "Bias Mitigation Protocols": {
        "zh": "模型算法去偏与缓解规范",
        "ms": "Protokol Pengurangan Bias"
    },
    "Building Energy Modeling (EnergyPlus/DesignBuilder)": {
        "zh": "建筑能耗模拟建模 (EnergyPlus/DesignBuilder)",
        "ms": "Pemodelan Tenaga Bangunan"
    },
    "C++": {
        "zh": "C++ 系统级编程",
        "ms": "Pengaturcaraan C++"
    },
    "C++ Programming": {
        "zh": "C++ 核心编程开发",
        "ms": "Pengaturcaraan C++"
    },
    "Carbon Credit Verification & MRV Protocols": {
        "zh": "碳信用核证与 MRV 监测核报协议",
        "ms": "Pengesahan Kredit Karbon & Protokol MRV"
    },
    "Carbon Registry Standards (Verra/Gold Standard)": {
        "zh": "碳资产注册登记标准 (Verra/Gold Standard)",
        "ms": "Piawaian Pendaftaran Karbon"
    },
    "Circular Economy Materials Flow Analysis": {
        "zh": "循环经济物质流向分析",
        "ms": "Analisis Aliran Bahan Ekonomi Kitaran"
    },
    "Climate Physical Risk Modeling (TCFD)": {
        "zh": "气候物理风险建模 (TCFD 框架)",
        "ms": "Pemodelan Risiko Fizikal Iklim (TCFD)"
    },
    "Cloud Computing": {
        "zh": "云计算技术与架构",
        "ms": "Pengkomputeran Awan"
    },
    "Cloud Computing Platforms": {
        "zh": "主流云计算平台运维与治理",
        "ms": "Platform Pengkomputeran Awan"
    },
    "Cloud Infrastructure Architecture": {
        "zh": "云原生基础设施架构设计",
        "ms": "Seni Bina Infrastruktur Awan"
    },
    "Cloud Security Posture Management (CSPM)": {
        "zh": "云安全态势管理 (CSPM)",
        "ms": "Pengurusan Postur Keselamatan Awan (CSPM)"
    },
    "Complex Systems Modeling": {
        "zh": "复杂系统动态建模与仿真",
        "ms": "Pemodelan Sistem Kompleks"
    },
    "Content Creation": {
        "zh": "优质专业内容创作与策划",
        "ms": "Penciptaan Kandungan"
    },
    "Context Window Memory Management": {
        "zh": "长上下文窗口与大模型记忆管理",
        "ms": "Pengurusan Memori Tetingkap Konteks"
    },
    "Contractual Sustainability Clauses": {
        "zh": "合同可持续发展与 ESG 条款制定",
        "ms": "Klausa Kemampanan Kontrak"
    },
    "Cryptography Fundamentals": {
        "zh": "现代密码学基础与密钥管理",
        "ms": "Asas Kriptografi"
    },
    "Cybersecurity Fundamentals & Vulnerability Patching": {
        "zh": "网络安全底座与漏洞修补协同",
        "ms": "Asas Keselamatan Siber & Tampalan Kerentanan"
    },
    "Data Analysis": {
        "zh": "数据分析与商业洞察",
        "ms": "Analisis Data"
    },
    "Data Pipeline ETL": {
        "zh": "数据管道 ETL 抽取转换加载",
        "ms": "Saluran Paip Data ETL"
    },
    "Data Pipeline Engineering": {
        "zh": "大规模数据管道工程化构建",
        "ms": "Kejuruteraan Saluran Paip Data"
    },
    "Data Privacy Compliance": {
        "zh": "数据隐私保护与合规管理",
        "ms": "Pematuhan Privasi Data"
    },
    "Data Quality Assurance": {
        "zh": "数据质量治理与一致性保障",
        "ms": "Jaminan Kualiti Data"
    },
    "Data Structures and Algorithms": {
        "zh": "数据结构与经典算法",
        "ms": "Struktur Data & Algoritma"
    },
    "Data Warehousing (Snowflake/BigQuery)": {
        "zh": "现代云数据仓库 (Snowflake/BigQuery)",
        "ms": "Pergudangan Data (Snowflake/BigQuery)"
    },
    "Database Management": {
        "zh": "现代数据库运维与管理",
        "ms": "Pengurusan Pangkalan Data"
    },
    "Deep Learning": {
        "zh": "深度学习算法与模型应用",
        "ms": "Pembelajaran Mendalam"
    },
    "Deep Learning Frameworks": {
        "zh": "深度学习框架 (PyTorch/TensorFlow)",
        "ms": "Rangka Kerja Pembelajaran Mendalam"
    },
    "Differential Privacy": {
        "zh": "差分隐私保护技术",
        "ms": "Privasi Pembezaan"
    },
    "Diffusion Models for Industrial Design": {
        "zh": "工业设计扩散生成模型技术",
        "ms": "Model Resapan untuk Reka Bentuk Industri"
    },
    "Digital Marketing": {
        "zh": "数字化营销与全渠道推广",
        "ms": "Pemasaran Digital"
    },
    "Docker Containerization": {
        "zh": "Docker 容器化封装与部署",
        "ms": "Pengkontenaan Docker"
    },
    "ESG Supply Chain Due Diligence (CSDDD)": {
        "zh": "ESG 供应链尽职调查 (CSDDD 指令)",
        "ms": "Uji Wajar Rantaian Bekalan ESG (CSDDD)"
    },
    "EU AI Act Compliance": {
        "zh": "欧盟 AI 法案高风险合规审计",
        "ms": "Pematuhan Akta AI Kesatuan Eropah"
    },
    "EV Fleet Telematics & Charging Optimization": {
        "zh": "电动车车队车联网与智能充电调度",
        "ms": "Telematik Armada EV & Pengoptimuman Pengecasan"
    },
    "Edge AI Inference Acceleration": {
        "zh": "边缘端 AI 推理加速与模型量化",
        "ms": "Pecutan Inferens AI Pinggir"
    },
    "Electrical Safety Protocols": {
        "zh": "工业电气安全规范与作业规程",
        "ms": "Protokol Keselamatan Elektrik"
    },
    "Embedded NPU Optimization": {
        "zh": "嵌入式 NPU 硬件加速与优化",
        "ms": "Pengoptimuman NPU Terbenam"
    },
    "Employee Engagement & Retention": {
        "zh": "员工敬业度与核心人才留存策略",
        "ms": "Penglibatan & Pengekalan Pekerja"
    },
    "Engineering Workforce Planning": {
        "zh": "工程技术团队人才规划与盘点",
        "ms": "Perancangan Tenaga Kerja Kejuruteraan"
    },
    "Enterprise AI Solution Design": {
        "zh": "企业级 AI 解决方案顶层设计",
        "ms": "Reka Bentuk Penyelesaian AI Perusahaan"
    },
    "Enterprise Risk Management (COSO/ISO 31000)": {
        "zh": "全面企业风险管理 (COSO/ISO 31000)",
        "ms": "Pengurusan Risiko Perusahaan (COSO/ISO 31000)"
    },
    "Environmental Regulatory Compliance": {
        "zh": "环保合规管理与排污标准核查",
        "ms": "Pematuhan Kawal Selia Alam Sekitar"
    },
    "Ethical Framework Development": {
        "zh": "科技伦理准则与负责任 AI 治理框架",
        "ms": "Pembangunan Rangka Kerja Etika"
    },
    "Federated Learning & Privacy-Preserving AI": {
        "zh": "联邦学习与隐私计算技术",
        "ms": "Pembelajaran Bersekutu & AI Privasi"
    },
    "FinOps & Cloud Cost Optimization": {
        "zh": "FinOps 云财务运营与成本治理",
        "ms": "FinOps & Pengoptimuman Kos Awan"
    },
    "Financial Accounting & Ledger Principles": {
        "zh": "财务会计与总账记账准则",
        "ms": "Perakaunan Kewangan & Prinsip Lejar"
    },
    "Financial Data Governance & Compliance": {
        "zh": "金融级数据资产治理与合规",
        "ms": "Tadbir Urus & Pematuhan Data Kewangan"
    },
    "GHG Scope 1-3 Carbon Accounting": {
        "zh": "温室气体范围 1-3 碳足迹核算",
        "ms": "Perakaunan Karbon Gas Rumah Hijau Skop 1-3"
    },
    "GIS Spatial Analytics": {
        "zh": "GIS 地理空间大数据空间分析",
        "ms": "Analisis Ruang GIS"
    },
    "GPU Cluster Optimization": {
        "zh": "GPU 大算力集群调度与训练优化",
        "ms": "Pengoptimuman Kelompok GPU"
    },
    "Generative AI Content Tools": {
        "zh": "生成式 AI 内容创作工具矩阵",
        "ms": "Alat Kandungan AI Generatif"
    },
    "Git Version Control & CI/CD Pipelines": {
        "zh": "Git 版本控制与 CI/CD 自动化流水线",
        "ms": "Kawalan Versi Git & Saluran Paip CI/CD"
    },
    "GitOps with ArgoCD & Flux": {
        "zh": "基于 ArgoCD 与 Flux 的 GitOps 持续交付",
        "ms": "GitOps Bersama ArgoCD & Flux"
    },
    "Graph Neural Networks (GNN)": {
        "zh": "图神经网络算法 (GNN)",
        "ms": "Rangkaian Neural Graf (GNN)"
    },
    "Graphic Design": {
        "zh": "视觉传达与平面设计",
        "ms": "Reka Bentuk Grafik"
    },
    "Green Building Certifications (LEED/GreenRE)": {
        "zh": "绿色建筑评估与认证 (LEED/GreenRE)",
        "ms": "Pensijilan Bangunan Hijau (LEED/GreenRE)"
    },
    "Green Hydrogen Electrolyzer Operations": {
        "zh": "绿氢电解槽装置运维与监控",
        "ms": "Operasi Elektroliser Hidrogen Hijau"
    },
    "HR Analytics & Workforce Metrics": {
        "zh": "人力资源分析与劳动力效能度量",
        "ms": "Analisis HR & Metrik Tenaga Kerja"
    },
    "HVAC Optimization": {
        "zh": "暖通空调能效智能优化调度",
        "ms": "Pengoptimuman HVAC"
    },
    "Hazardous Chemical Process Safety": {
        "zh": "危险化学品工艺安全管理 (PSM)",
        "ms": "Keselamatan Proses Kimia Berbahaya"
    },
    "Healthcare & Banking Data Compliance": {
        "zh": "医疗与银行业严苛数据合规保障",
        "ms": "Pematuhan Data Penjagaan Kesihatan & Perbankan"
    },
    "Human-Computer Interaction": {
        "zh": "人机交互工程与体验优化",
        "ms": "Interaksi Manusia-Komputer"
    },
    "Identity Threat Detection and Response (ITDR)": {
        "zh": "身份威胁检测与主动防御响应 (ITDR)",
        "ms": "Pengesanan & Tindak Balas Ancaman Identiti (ITDR)"
    },
    "Incident Post-Mortem Facilitation": {
        "zh": "线上故障复盘与根因分析复核",
        "ms": "Fasilitasi Post-Mortem Insiden"
    },
    "Industrial Heat Pump Integration": {
        "zh": "工业级高效热泵系统集成与余热利用",
        "ms": "Integrasi Pam Haba Industri"
    },
    "Industrial IoT & SCADA Monitoring": {
        "zh": "工业物联网与 SCADA 监控测控",
        "ms": "Pemantauan IoT Industri & SCADA"
    },
    "Industrial Robotics Protocols": {
        "zh": "工业机器人通信与运动控制协议",
        "ms": "Protokol Robotik Industri"
    },
    "Instrumentation & Control": {
        "zh": "自动化仪表测量与过程控制工程",
        "ms": "Instrumentasi & Kawalan"
    },
    "IoT Telemetry Streaming": {
        "zh": "物联网海量遥测数据流处理",
        "ms": "Penstriman Telemetri IoT"
    },
    "Irrigation Automation": {
        "zh": "智慧农业精准自动化灌溉",
        "ms": "Automasi Pengairan"
    },
    "Kubernetes Multi-Cluster Orchestration": {
        "zh": "Kubernetes 多集群容器编排治理",
        "ms": "Orkestrasi Pelbagai Kelompok Kubernetes"
    },
    "LLMOps & Model Governance": {
        "zh": "LLMOps 全生命周期运维与模型治理",
        "ms": "LLMOps & Tadbir Urus Model"
    },
    "LangChain & LlamaIndex Orchestration": {
        "zh": "LangChain 与 LlamaIndex 智能体应用编排",
        "ms": "Orkestrasi LangChain & LlamaIndex"
    },
    "Large Language Models": {
        "zh": "大语言模型原理与工程微调",
        "ms": "Model Bahasa Besar (LLM)"
    },
    "Life Cycle Assessment (LCA) SimaPro/OpenLCA": {
        "zh": "产品全生命周期环境影响评估 (LCA)",
        "ms": "Penilaian Kitaran Hayat (LCA)"
    },
    "Linguistic Flow Design": {
        "zh": "对话交互语言流设计与意图建模",
        "ms": "Reka Bentuk Aliran Linguistik"
    },
    "Linux Server Administration": {
        "zh": "Linux 企业级服务器运维与系统加固",
        "ms": "Pentadbiran Pelayan Linux"
    },
    "Machine Learning": {
        "zh": "机器学习核心算法与实践",
        "ms": "Pembelajaran Mesin"
    },
    "Machine Learning Engineering": {
        "zh": "机器学习工程落地与管线化开发",
        "ms": "Kejuruteraan Pembelajaran Mesin"
    },
    "Machine Learning Governance": {
        "zh": "机器学习模型全周期风险治理",
        "ms": "Tadbir Urus Pembelajaran Mesin"
    },
    "Machine Learning Operations (MLOps)": {
        "zh": "机器学习运维自动化 (MLOps)",
        "ms": "Operasi Pembelajaran Mesin (MLOps)"
    },
    "Macroeconomic Scenario Stress Testing": {
        "zh": "宏观经济情景推演与压力测试",
        "ms": "Ujian Tekanan Senario Makroekonomi"
    },
    "Mobile Application Development": {
        "zh": "移动端跨平台应用开发",
        "ms": "Pembangunan Aplikasi Mudah Alih"
    },
    "Multilingual Localization": {
        "zh": "多语种国际化与本土化工程",
        "ms": "Penyetempatan Pelbagai Bahasa"
    },
    "Multimodal LLM Fine-Tuning": {
        "zh": "多模态大语言模型领域微调",
        "ms": "Penalaan Halus LLM Pelbagai Mod"
    },
    "Municipal Permitting & Civil Integration": {
        "zh": "市政准入许可审批与土木工程协同",
        "ms": "Permit Perbandaran & Integrasi Awam"
    },
    "Natural Language Processing": {
        "zh": "自然语言处理 (NLP) 语义理解",
        "ms": "Pemprosesan Bahasa Semula Jadi (NLP)"
    },
    "Network Latency Optimization": {
        "zh": "高并发低时延网络架构优化",
        "ms": "Pengoptimuman Kependaman Rangkaian"
    },
    "Network Socket Programming": {
        "zh": "底层高性能网络套接字编程",
        "ms": "Pengaturcaraan Soket Rangkaian"
    },
    "OWASP Top 10 for LLM": {
        "zh": "OWASP 大模型安全 Top 10 漏洞防护",
        "ms": "OWASP Top 10 untuk LLM"
    },
    "Object-Oriented Programming": {
        "zh": "面向对象架构设计与设计模式",
        "ms": "Pengaturcaraan Berorientasikan Objek"
    },
    "On-Device SLM (Small Language Models)": {
        "zh": "端侧轻量化小语言模型部署",
        "ms": "SLM Atas Peranti (Model Bahasa Kecil)"
    },
    "OpenTelemetry Distributed Tracing": {
        "zh": "OpenTelemetry 全链路分布式追踪",
        "ms": "Penjejakan Teragih OpenTelemetry"
    },
    "Platform Engineering with Backstage": {
        "zh": "基于 Backstage 的内部开发者平台工程",
        "ms": "Kejuruteraan Platform dengan Backstage"
    },
    "Post-Quantum Cryptography (PQC)": {
        "zh": "后量子密码学与抗量子加解密体系",
        "ms": "Kriptografi Pasca-Kuantum (PQC)"
    },
    "Power Electronics Distribution": {
        "zh": "电力电子配电系统与功率拓扑控制",
        "ms": "Pengagihan Elektronik Kuasa"
    },
    "Power System Stability Simulation": {
        "zh": "电网稳定性仿真分析与调频调度",
        "ms": "Simulasi Kestabilan Sistem Kuasa"
    },
    "Problem Solving": {
        "zh": "复杂技术与业务问题攻坚",
        "ms": "Penyelesaian Masalah"
    },
    "Product Management & Roadmap Prioritization": {
        "zh": "产品规划与产品路线图优先级决策",
        "ms": "Pengurusan Produk & Pelan Hala Tuju"
    },
    "Project Management & Roadmap Prioritization": {
        "zh": "项目全生命周期管理与进度排期",
        "ms": "Pengurusan Projek & Penentuan Keutamaan"
    },
    "Prompt Engineering": {
        "zh": "提示词工程与系统指令设计",
        "ms": "Kejuruteraan Prompt"
    },
    "Prompt Engineering & Red Teaming": {
        "zh": "提示词安全调优与 AI 红蓝对抗测试",
        "ms": "Kejuruteraan Prompt & Pengujian Pasukan Merah"
    },
    "Python": {
        "zh": "Python 编程与工程开发",
        "ms": "Pengaturcaraan Python"
    },
    "Python Development": {
        "zh": "Python 后端系统开发与构建",
        "ms": "Pembangunan Python"
    },
    "Python Programming": {
        "zh": "Python 编程与工程开发",
        "ms": "Pengaturcaraan Python"
    },
    "RESTful API Architecture & Fastify/FastAPI": {
        "zh": "RESTful API 架构与 FastAPI 高性能开发",
        "ms": "Seni Bina API RESTful & FastAPI"
    },
    "ROI Business Case Modeling": {
        "zh": "投资回报率 (ROI) 商业经济效益建模",
        "ms": "Pemodelan Kes Perniagaan ROI"
    },
    "Regulatory Reporting": {
        "zh": "行业合规披露与监管报表报送",
        "ms": "Pelaporan Kawal Selia"
    },
    "Renewable PPA (Power Purchase Agreement) Structuring": {
        "zh": "绿电购电协议 (PPA) 商业架构设计",
        "ms": "Penstrukturan PPA Tenaga Boleh Diperbaharui"
    },
    "Retrieval-Augmented Generation (RAG)": {
        "zh": "检索增强生成技术 (RAG)",
        "ms": "Penjanaan Terimbuh Dapatan (RAG)"
    },
    "Risk Management": {
        "zh": "系统性业务与技术风险管理",
        "ms": "Pengurusan Risiko"
    },
    "Rust Systems Programming": {
        "zh": "Rust 系统级高性能内存安全编程",
        "ms": "Pengaturcaraan Sistem Rust"
    },
    "SQL & Relational Database Design": {
        "zh": "SQL 与关系型数据库建模设计",
        "ms": "Reka Bentuk Pangkalan Data Hubungan & SQL"
    },
    "Satellite Remote Sensing Data Analytics": {
        "zh": "卫星遥感影像大数据解译分析",
        "ms": "Analisis Data Penderiaan Jauh Satelit"
    },
    "Search Engine Optimization (SEO)": {
        "zh": "搜索引擎优化 (SEO) 与搜索引流",
        "ms": "Pengoptimuman Enjin Carian (SEO)"
    },
    "Semantic Re-ranking": {
        "zh": "向量语义精排与重排技术 (Re-ranking)",
        "ms": "Penyusunan Semula Semantik"
    },
    "Sensors & Building Automation": {
        "zh": "环境传感与楼宇自动化控制系统 (BAS)",
        "ms": "Penderia & Automasi Bangunan"
    },
    "Smart Grid Energy Management Systems (EMS)": {
        "zh": "智能微电网能源管理系统 (EMS)",
        "ms": "Sistem Pengurusan Tenaga Grid Pintar (EMS)"
    },
    "Software Architecture": {
        "zh": "大型软件系统高可用架构设计",
        "ms": "Seni Bina Perisian"
    },
    "Software Development Life Cycle": {
        "zh": "软件工程全生命周期研发规范 (SDLC)",
        "ms": "Kitaran Hayat Pembangunan Perisian (SDLC)"
    },
    "Software Engineering": {
        "zh": "现代软件工程开发实践",
        "ms": "Kejuruteraan Perisian"
    },
    "Software Engineering Competency Mapping": {
        "zh": "研发人员技术能力矩阵建模",
        "ms": "Pemetaan Kecekapan Kejuruteraan Perisian"
    },
    "Soil Carbon Sequestration Chemistry": {
        "zh": "土壤固碳机理与化学养分分析",
        "ms": "Kimia Penyerapan Karbon Tanah"
    },
    "Sparse Autoencoders & Interpretability": {
        "zh": "稀疏自编码器与大模型可解释性分析",
        "ms": "Autoenkoder Jarang & Kebolehbacaan Model"
    },
    "Spreadsheet Software": {
        "zh": "高效电子表格数据建模 (Excel/Sheets)",
        "ms": "Perisian Hamparan Kerja"
    },
    "Stakeholder Communication": {
        "zh": "跨职能利益相关者高效协同沟通",
        "ms": "Komunikasi Pemegang Taruh"
    },
    "Stakeholder Negotiation & Business Communication": {
        "zh": "商业商务谈判与跨团队沟通协调",
        "ms": "Perundingan Pemegang Taruh & Komunikasi Perniagaan"
    },
    "Statistical Distribution Validation": {
        "zh": "统计分布检验与数据显著性分析",
        "ms": "Pengesahan Taburan Statistik"
    },
    "Supplier Audit Verification": {
        "zh": "供应链供应商资格现场审计验证",
        "ms": "Pengesahan Audit Pembekal"
    },
    "Sustainability Assurance Reporting (CSRD/ISSB)": {
        "zh": "可持续性鉴证报告 (CSRD/ISSB 准则)",
        "ms": "Pelaporan Jaminan Kemampanan (CSRD/ISSB)"
    },
    "Sustainable Agricultural Drone Analytics": {
        "zh": "生态农业无人机多光谱巡检分析",
        "ms": "Analisis Dron Pertanian Mampan"
    },
    "Synthetic Data Generation": {
        "zh": "高质量 AI 合成数据生成与蒸馏",
        "ms": "Penjanaan Data Sintetik"
    },
    "Technical Talent Acquisition": {
        "zh": "高端技术研发人才招聘与选拔",
        "ms": "Pemerolehan Bakat Teknikal"
    },
    "Technical Writing": {
        "zh": "技术文档与开发者架构指南编写",
        "ms": "Penulisan Teknikal"
    },
    "Terraform / OpenTofu": {
        "zh": "Terraform / OpenTofu 基础设施即代码 (IaC)",
        "ms": "Terraform / OpenTofu Infrastruktur-sebagai-Kod"
    },
    "Thermodynamic Process Simulation": {
        "zh": "热力学热工过程动力学仿真模拟",
        "ms": "Simulasi Proses Termodinamik"
    },
    "TypeScript & Modern JavaScript": {
        "zh": "TypeScript 与现代 ECMAScript 全栈开发",
        "ms": "TypeScript & JavaScript Moden"
    },
    "UX User Research & Usability Testing": {
        "zh": "UX 用户深度调研与可用性测试",
        "ms": "Penyelidikan Pengguna UX & Ujian Kebolehgunaan"
    },
    "Vector Database Optimization (pgvector/HNSW)": {
        "zh": "向量数据库性能调优 (pgvector/HNSW)",
        "ms": "Pengoptimuman Pangkalan Data Vektor (pgvector/HNSW)"
    },
    "Version Control Systems": {
        "zh": "分布式代码版本控制系统",
        "ms": "Sistem Kawalan Versi"
    },
    "Waste-to-Resource Logistics": {
        "zh": "工业废弃物资源化逆向物流调度",
        "ms": "Logistik Sisa-kepada-Sumber"
    },
    "Web Analytics": {
        "zh": "Web 流量分析与用户转化漏斗度量",
        "ms": "Analisis Web & Metrik Penukaran"
    },
    "Web Development": {
        "zh": "现代 Web 前后端开发技术",
        "ms": "Pembangunan Web"
    },
    "WebAssembly (WASM) Serverless Runtime": {
        "zh": "WebAssembly (WASM) 无服务器轻量运行时",
        "ms": "Waktu Jalan Tanpa Pelayan WebAssembly (WASM)"
    },
    "Zero Trust Network Access (ZTNA)": {
        "zh": "零信任网络访问控制架构 (ZTNA)",
        "ms": "Akses Rangkaian Sifar Amanah (ZTNA)"
    },
    "eBPF Kernel Observability (Cilium)": {
        "zh": "基于 eBPF 的 Linux 内核级可观测性 (Cilium)",
        "ms": "Kebolehcerapan Kernel eBPF (Cilium)"
    }
}

# Precompute lower-case and reverse lookup maps for O(1) matching
_LOWER_SKILL_MAP: Dict[str, Dict[str, str]] = {
    k.lower(): v for k, v in SKILL_TRANSLATIONS.items()
}

_ZH_SKILL_MAP: Dict[str, Dict[str, str]] = {}
_MS_SKILL_MAP: Dict[str, Dict[str, str]] = {}

for en_k, trans in SKILL_TRANSLATIONS.items():
    if "zh" in trans and trans["zh"]:
        _ZH_SKILL_MAP[trans["zh"].strip().lower()] = {
            "en": en_k,
            "ms": trans.get("ms", en_k),
            "zh": trans["zh"],
        }
    if "ms" in trans and trans["ms"]:
        _MS_SKILL_MAP[trans["ms"].strip().lower()] = {
            "en": en_k,
            "ms": trans["ms"],
            "zh": trans.get("zh", en_k),
        }

COMMON_ALIASES: Dict[str, Dict[str, str]] = {
    "软件工程": {"en": "Software Engineering", "ms": "Kejuruteraan Perisian", "zh": "软件工程"},
    "网页开发": {"en": "Web Development", "ms": "Pembangunan Web", "zh": "网页开发"},
    "手机软件开发": {"en": "Mobile Application Development", "ms": "Pembangunan Aplikasi Mudah Alih", "zh": "移动应用开发"},
    "移动应用开发": {"en": "Mobile Application Development", "ms": "Pembangunan Aplikasi Mudah Alih", "zh": "移动应用开发"},
    "oop开发": {"en": "Object-Oriented Programming (OOP)", "ms": "Pengaturcaraan Berorientasikan Objek (OOP)", "zh": "面向对象编程 (OOP)"},
    "数据库管理": {"en": "Database Management", "ms": "Pengurusan Pangkalan Data", "zh": "数据库管理与运维"},
    "前端开发": {"en": "Frontend Development", "ms": "Pembangunan Frontend", "zh": "前端开发"},
    "后端开发": {"en": "Backend Development", "ms": "Pembangunan Backend", "zh": "后端开发"},
    "全栈开发": {"en": "Full-Stack Software Development", "ms": "Pembangunan Perisian Tindanan Penuh", "zh": "全栈软件工程开发"},
    "ai集成": {"en": "Artificial Intelligence Integration", "ms": "Integrasi Kecerdasan Buatan (AI)", "zh": "人工智能系统集成"},
    "3d网页可视化": {"en": "3D Web Visualization", "ms": "Visualisasi Web 3D", "zh": "3D Web 可视化开发"},
    "离线优先架构": {"en": "Offline-First Architecture", "ms": "Seni Bina Luar Talian Diutamakan", "zh": "离线优先架构设计"},
}

for alias, item in COMMON_ALIASES.items():
    _ZH_SKILL_MAP[item["zh"].strip().lower()] = item
    _MS_SKILL_MAP[item["ms"].strip().lower()] = item

# Dynamic in-memory cache for on-demand translations of custom/future skills
_DYNAMIC_CACHE: Dict[str, Dict[str, str]] = {}


def register_skill_translation(skill_name: str, zh: str, ms: str, en: Optional[str] = None) -> None:
    """Registers a newly learned or synthesized skill into the dynamic cache."""
    if not skill_name:
        return
    clean_k = skill_name.strip()
    entry = {
        "en": (en or clean_k).strip(),
        "zh": zh.strip(),
        "ms": ms.strip(),
    }
    _DYNAMIC_CACHE[clean_k.lower()] = entry
    _DYNAMIC_CACHE[entry["zh"].lower()] = entry
    _DYNAMIC_CACHE[entry["ms"].lower()] = entry


def get_trilingual_skill(raw_skill: Optional[str]) -> Dict[str, str]:
    """
    Returns complete trilingual translations: {"en": "...", "ms": "...", "zh": "..."}.
    Supports input in English, Chinese, or Malay.
    """
    if not raw_skill:
        return {"en": "", "ms": "", "zh": ""}

    cleaned = raw_skill.strip()
    lowered = cleaned.lower()

    if lowered in COMMON_ALIASES:
        return dict(COMMON_ALIASES[lowered])

    if lowered in _ZH_SKILL_MAP:
        return dict(_ZH_SKILL_MAP[lowered])

    if lowered in _MS_SKILL_MAP:
        return dict(_MS_SKILL_MAP[lowered])

    if cleaned in SKILL_TRANSLATIONS:
        trans = SKILL_TRANSLATIONS[cleaned]
        return {"en": cleaned, "ms": trans.get("ms", cleaned), "zh": trans.get("zh", cleaned)}

    if lowered in _LOWER_SKILL_MAP:
        trans = _LOWER_SKILL_MAP[lowered]
        canonical_en = next((k for k in SKILL_TRANSLATIONS if k.lower() == lowered), cleaned)
        return {"en": canonical_en, "ms": trans.get("ms", canonical_en), "zh": trans.get("zh", canonical_en)}

    if lowered in _DYNAMIC_CACHE:
        return dict(_DYNAMIC_CACHE[lowered])

    # Substring / partial lookup
    for key, item in _ZH_SKILL_MAP.items():
        if key in lowered or lowered in key:
            return dict(item)

    return {"en": cleaned, "ms": cleaned, "zh": cleaned}


def localize_skill_list_trilingual(skills: List[str]) -> Dict[str, List[str]]:
    """Transforms a list of skill competencies into trilingual arrays."""
    en_list: List[str] = []
    ms_list: List[str] = []
    zh_list: List[str] = []

    for s in skills:
        res = get_trilingual_skill(s)
        en_list.append(res["en"] or s)
        ms_list.append(res["ms"] or s)
        zh_list.append(res["zh"] or s)

    return {"en": en_list, "ms": ms_list, "zh": zh_list}


def localize_skill_name(raw_skill: Optional[str], locale: str = "en") -> str:
    """
    Translates an English ESCO competency into Simplified Chinese or Bahasa Melayu.
    """
    if not raw_skill:
        return ""
    
    loc = (locale or "en").lower()
    trilingual = get_trilingual_skill(raw_skill)
    return trilingual.get(loc, trilingual.get("en", raw_skill))



async def warm_skills_cache_batch(skills: List[str], locale: Optional[str] = None) -> None:
    """
    Zero-shot dynamic AI batch translation:
    If future dataset entries or user custom skills are not found in the static dictionary,
    this batches and translates unknown skills into both Chinese and Malay using Gemini Flash
    in one single roundtrip, and caches the results into _DYNAMIC_CACHE for instant future lookups.
    """
    unknown_skills = []
    for s in skills:
        if not s or not s.strip():
            continue
        cleaned = s.strip()
        lowered = cleaned.lower()
        if (
            cleaned not in SKILL_TRANSLATIONS
            and lowered not in _LOWER_SKILL_MAP
            and lowered not in _DYNAMIC_CACHE
        ):
            unknown_skills.append(cleaned)

    if not unknown_skills:
        return

    try:
        from services.gemini_service import call_gemini_with_fallback
        
        prompt = (
            f"You are a professional HR occupational taxonomy translator.\n"
            f"Translate the following skill competencies into Simplified Chinese (zh) and Bahasa Melayu (ms):\n"
            f"Skills: {json.dumps(unknown_skills, ensure_ascii=False)}\n\n"
            f"Return a strict JSON object mapping each skill name to its translations:\n"
            f"{{\n"
            f'  "Skill Name": {{"zh": "中文专业技能名称", "ms": "Nama kemahiran profesional BM"}}\n'
            f"}}\n"
            f"Return ONLY valid JSON."
        )

        contents = [{"parts": [{"text": prompt}]}]
        res = await call_gemini_with_fallback(
            contents=contents,
            timeout=6.0,
            max_output_tokens=1500,
        )
        if isinstance(res, dict):
            for skill_name, trans in res.items():
                if isinstance(trans, dict):
                    zh_trans = trans.get("zh", skill_name)
                    ms_trans = trans.get("ms", skill_name)
                    register_skill_translation(skill_name, zh_trans, ms_trans)
    except Exception:
        # Graceful fallback: Never block or fail the main flow
        pass
