# AI-POWERED HYBRID INVENTORY MANAGEMENT SYSTEM

---

### PRELIMINARY PROJECT DETAILS
- **Project Title:** AI-Powered Hybrid Inventory Management System
- **Candidate Name / Registration No.:** [PLACEHOLDER: Candidate Name & Roll Number]
- **Degree / Department:** [PLACEHOLDER: Bachelor of Technology / Department of Computer Science and Engineering]
- **Institution / University:** [PLACEHOLDER: University / College Name]
- **Academic Supervisor / Guide:** [PLACEHOLDER: Supervisor Name and Designation]
- **Academic Year:** [PLACEHOLDER: Academic Year, e.g., 2025–2026]

---

## ABSTRACT

Contemporary retail enterprise, warehousing, and supply chain management infrastructures face severe operational disruptions induced by network volatility, unmitigated point-of-sale (POS) terminal freezing, reactive stock replenishment delays, and catastrophic inventory stockouts. Traditional cloud-dependent Inventory Management Systems (IMS) execute transactions under a synchronous request-reply model, rendering billing registers entirely dysfunctional during local internet blackouts and subjecting retail establishments to revenue attrition and customer churn. Furthermore, conventional restocking relies on human intuition or manual stock audits, causing either premature stockouts of fast-moving items or the unnecessary accumulation of capital in slow-moving merchandise.

To resolve these vulnerabilities, this project develops and implements the **AI-Powered Hybrid Inventory Management System**, an enterprise-grade, edge-resilient, dual-persistence inventory management platform integrating machine learning demand forecasting, computer vision optical barcode decoding, and resilient asynchronous notification pipelines. The platform adopts a decoupled hybrid-edge microservices architecture. The presentation and edge-billing layer is implemented as a React 18 / Vite Single Page Application (SPA) embedding a client-side WebAssembly SQLite 3 database (`sql.js`) and IndexedDB (`idb`) runtime. This configuration guarantees sub-15ms local transaction execution and continuous POS operations during total network partitions, caching mutating operations with unique UUID identifiers.

The transactional backend is engineered using Spring Boot 3.3.5 and Java 17, orchestrating primary relational persistence within MySQL 8 (`inventory_db`) while maintaining a server-side SQLite queue (`alert_queue.db`) for fault-tolerant notification spooling. Predictive intelligence is furnished via a dedicated Python 3 / Flask microservice executing Ordinary Least Squares (OLS) Linear Regression via `scikit-learn` and `numpy`. The model ingests historical sales transaction logs to forecast period-ahead SKU demand, compute linear velocity slopes ($m$), calculate $R^2$ goodness-of-fit coefficients, and determine optimal reorder quantities ($Q_{\text{reorder}}$). To guarantee 100% analytical availability, an internal mathematical fallback solver is integrated within the Spring Boot core (`AIService.java`), executing closed-form OLS equations when the Python microservice is unreachable.

Low-stock hazard detection is handled through an asynchronous event-driven pipeline powered by Spring `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` and JavaMailSender, dispatching Thymeleaf-rendered responsive HTML alerts with a 24-hour suppression cooldown, automatic restock reset flags, and an exponential backoff retry worker. Native optical barcode capture is provided via `@zxing/browser` video frame decoding. The resulting architecture eliminates retail checkout downtime, provides automated bi-directional data reconciliation, and delivers automated predictive replenishment intelligence.

**Keywords:** Hybrid Architecture, Offline-First Persistence, Ordinary Least Squares Linear Regression, WebAssembly SQLite, Spring Boot, Bi-Directional Synchronization, Optical Barcode Recognition, Demand Forecasting, Edge Computing.

---

## LIST OF FIGURES

| Figure Number | Caption / Figure Title | Page / Section Reference |
| :--- | :--- | :--- |
| **Figure 1.1** | Global High-Level 3-Tier Distributed Architecture | Chapter 1, Section 1.1 |
| **Figure 1.2** | Offline-First Dual Persistence and Synchronization Flow | Chapter 1, Section 1.4.2 |
| **Figure 2.1** | Retail Inventory Stockout and Overstocking Trade-off Curve | Chapter 2 |
| **Figure 3.1** | System Layered Component and Data Flow Architecture | Chapter 3, Section 3.1 |
| **Figure 3.2** | Asynchronous Event-Driven Low-Stock Notification Sequence | Chapter 3, Section 3.1 |
| **Figure 3.3** | SQLite Offline Alert Queue State Transition Diagram | Chapter 3, Section 3.3.5 |
| **Figure 3.4** | Ordinary Least Squares (OLS) Regression Demand Curve | Chapter 3, Section 3.3.3 |
| **Figure 3.5** | Hardware and Camera Barcode Video Feed Ingestion Pipeline | Chapter 3, Section 3.3.2 |
| **Figure 3.6** | Bulk Product Import Processing State Machine | Chapter 3, Section 3.3.1 |
| **Figure 4.1** | Relational Database Entity-Relationship (ER) Schema | Chapter 4, Section 4.1 |
| **Figure 4.2** | Client-Side Heartbeat and Network Connectivity Poller | Chapter 4, Section 4.1 |
| **Figure 5.1** | Screen Mockup: Executive Analytics Dashboard | Chapter 5, Screen 1 |
| **Figure 5.2** | Screen Mockup: Product Master Catalog & Grid | Chapter 5, Screen 2 |
| **Figure 5.3** | Screen Mockup: Bulk CSV/Excel Product Import Wizard | Chapter 5, Screen 3 |
| **Figure 5.4** | Screen Mockup: Live Camera Barcode Scanner | Chapter 5, Screen 4 |
| **Figure 5.5** | Screen Mockup: Point-of-Sale (POS) Sales Register | Chapter 5, Screen 5 |
| **Figure 5.6** | Screen Mockup: Procurement & Purchase Restocking Register | Chapter 5, Screen 6 |
| **Figure 5.7** | Screen Mockup: Synchronized Transaction Audit History | Chapter 5, Screen 7 |
| **Figure 5.8** | Screen Mockup: AI Demand Forecasting & Intelligence Center | Chapter 5, Screen 8 |
| **Figure 5.9** | Screen Mockup: Low-Stock Email Alert Monitoring & Dispatch | Chapter 5, Screen 9 |
| **Figure 5.10** | Screen Mockup: Enterprise Reporting & Analytics Suite | Chapter 5, Screen 10 |
| **Figure 5.11** | Screen Mockup: Role-Based User Management & RBAC | Chapter 5, Screen 11 |
| **Figure 5.12** | Screen Mockup: Distributed System Architecture & Health Monitor | Chapter 5, Screen 12 |
| **Figure 5.13** | Screen Mockup: System Authentication & Secure Login Portal | Chapter 5, Screen 13 |

---

## LIST OF ABBREVIATIONS

| Abbreviation | Complete Technical Expansion | Domain Context |
| :--- | :--- | :--- |
| **ACID** | Atomicity, Consistency, Isolation, Durability | Relational Transaction Management |
| **AI** | Artificial Intelligence | Predictive Machine Learning |
| **API** | Application Programming Interface | RESTful Inter-Process Communication |
| **ARIMA** | Autoregressive Integrated Moving Average | Time-Series Econometric Modeling |
| **BCrypt** | Blowfish-based Cryptographic Hashing | Cryptographic Password Security |
| **BLE** | Bluetooth Low Energy | Short-Range Wireless Hardware |
| **CORS** | Cross-Origin Resource Sharing | Browser Network Security Policy |
| **CPU** | Central Processing Unit | Host Computational Processor |
| **CSV** | Comma-Separated Values | Delimited Tabular Flat-File Format |
| **DAO** | Data Access Object | Data Persistence Layer Abstraction |
| **DDL** | Data Definition Language | Relational Schema Specification SQL |
| **DML** | Data Manipulation Language | Data Querying and Mutation SQL |
| **DNS** | Domain Name System | Hostname Network Resolution Service |
| **DTO** | Data Transfer Object | Network Payload Encapsulation Model |
| **EAN** | European Article Number | 13-Digit Optical Barcode Symbology |
| **EDI** | Electronic Data Interchange | Standardized Commercial B2B Protocol |
| **ER** | Entity-Relationship | Database Conceptual Modeling |
| **FIFO** | First In, First Out | Sequential Queue Data Structure |
| **HD** | High Definition | Optical Video Camera Resolution Tier |
| **HikariCP** | Hikari Connection Pool | High-Performance JDBC Pool |
| **HTML** | HyperText Markup Language | Document and Email Markup Structure |
| **HTTP** | HyperText Transfer Protocol | Stateless Application Layer Protocol |
| **IDB** | IndexedDB | Browser-Resident Object Database |
| **IDE** | Integrated Development Environment | Software Engineering Workspace |
| **IEEE** | Institute of Electrical and Electronics Engineers | Technical Standardization Body |
| **IMS** | Inventory Management System | Enterprise Operational Domain |
| **IP** | Internet Protocol | Network Layer Addressing Protocol |
| **ISP** | Internet Service Provider | Telecommunication Connectivity Carrier |
| **JDBC** | Java Database Connectivity | Low-Level Java Relational Database API |
| **JSON** | JavaScript Object Notation | Structured Data Serialization Format |
| **JPA** | Jakarta Persistence API | Object-Relational Mapping Standard |
| **JVM** | Java Virtual Machine | Managed Bytecode Execution Runtime |
| **KPI** | Key Performance Indicator | Quantitative Enterprise Metric |
| **LAN** | Local Area Network | Private High-Speed Local Intranet |
| **LoRA** | Low-Rank Adaptation | Parameter-Efficient Tuning *(Not in Code)* |
| **LTS** | Long-Term Support | Extended Enterprise Software Baseline |
| **MIME** | Multipurpose Internet Mail Extensions | Multi-Part Email Payload Standard |
| **ML** | Machine Learning | Algorithmic Statistical Prediction |
| **MRP** | Maximum Retail Price | Regulatory Ceiling Consumer Valuation |
| **MSME** | Micro, Small, and Medium Enterprises | Commercial Business Classification |
| **MVC** | Model-View-Controller | Application Structural Design Pattern |
| **NVMe** | Non-Volatile Memory Express | Solid-State Drive Storage Protocol |
| **OCR** | Optical Character Recognition | Image-to-Text Machine Vision Pipeline |
| **OLS** | Ordinary Least Squares | Mathematical Residual Optimization |
| **ORM** | Object-Relational Mapping | Database Table to Class Modeling |
| **OS** | Operating System | Host System Software Environment |
| **PDF** | Portable Document Format | Printable Document Specification |
| **PDS** | Public Distribution System | Sovereign Commodity Allocation Network |
| **POI** | Poor Obfuscation Implementation | Apache Microsoft Office File Library |
| **POS** | Point of Sale | Retail Billing and Checkout Counter |
| **PWA** | Progressive Web Application | Installable Web Software Architecture |
| **RAM** | Random Access Memory | Primary Volatile System Storage |
| **RBAC** | Role-Based Access Control | Identity and Permission Authorization |
| **REST** | Representational State Transfer | Stateless Web Service Paradigm |
| **RFID** | Radio Frequency Identification | Wireless Radio Transponder Tracking |
| **RDBMS** | Relational Database Management System | Structured Relational Storage Engine |
| **SaaS** | Software as a Service | Cloud-Hosted Rental Software Model |
| **SKU** | Stock Keeping Unit | Unique Inventory Product Identifier |
| **SMTP** | Simple Mail Transfer Protocol | Outbound Email Dispatch Protocol |
| **SPA** | Single Page Application | Client-Side Routing Web Architecture |
| **SQL** | Structured Query Language | Declarative Database Query Standard |
| **SSD** | Solid State Drive | High-Speed Persistent Flash Storage |
| **TLS** | Transport Layer Security | Cryptographic Transport Layer Protocol |
| **UI** | User Interface | Front-Facing Visual Presentation Layer |
| **UPC** | Universal Product Code | 12-Digit Optical Barcode Symbology |
| **URI** | Uniform Resource Identifier | Standard Web Resource Path Locator |
| **UUID** | Universally Unique Identifier | 128-Bit Cryptographic Transaction Key |
| **Vite** | Next Generation Frontend Tooling | Native ES Module Frontend Build Server |
| **VRAM** | Video Random Access Memory | Dedicated Graphics Memory *(Not in Code)* |
| **WAL** | Write-Ahead Logging | Database Durability Logging Method |
| **WASM** | WebAssembly | Near-Native Binary In-Browser Runtime |
| **WSGI** | Web Server Gateway Interface | Python Web Server Calling Standard |
| **ZXing** | "Zebra Crossing" | Multi-Format Optical Barcode Vision Engine |
