# AI-POWERED HYBRID INVENTORY MANAGEMENT SYSTEM
## Comprehensive Project Book Specification & Engineering Documentation
### Factual Technical Manual for College Project Book (55-Page Blueprint)

---

## ABSTRACT

Modern retail, warehousing, and supply chain operations face severe operational disruptions caused by intermittent network connectivity, manual stock auditing latencies, stockout vulnerabilities, and inaccurate demand forecasting. Traditional cloud-centric Inventory Management Systems (IMS) suffer catastrophic point-of-sale (POS) downtime during internet blackouts and fail to predict localized stock deficits dynamically. This project designs and implements the **AI-Powered Hybrid Inventory Management System**, an enterprise-grade, offline-first, dual-persistence inventory platform featuring machine learning demand forecasting, computer vision barcode scanning, and resilient background alerting. 

The system employs a distributed microservices and hybrid-edge architecture: the frontend client is engineered with React 18, Vite 5, and Tailwind-free Vanilla CSS, embedding a WebAssembly-based SQLite 3 engine (`sql.js`) and IndexedDB (`idb`) to execute zero-latency local transactions and maintain an offline queue during network failures. The transactional core is built upon Spring Boot 3.3.5 and Java 17, orchestrating relational persistence in MySQL 8 and managing offline alert spooling in an embedded SQLite database (`alert_queue.db`). Inter-process communication integrates a dedicated Python 3 / Flask microservice executing Ordinary Least Squares (OLS) Linear Regression via `scikit-learn` and `numpy` to forecast period-ahead SKU demand, compute linear velocity slopes, calculate $R^2$ goodness-of-fit coefficients, and recommend replenishment quantities. An asynchronous, decoupled event-driven notification engine powered by Spring `@TransactionalEventListener` and JavaMailSender dispatches Thymeleaf-rendered HTML stock alerts with exponential backoff and a 24-hour suppression cooldown. Hardware barcode acquisition is handled via `@zxing/browser` camera vision decoding. The solution achieves sub-15ms local transaction processing, automated offline-to-online bi-directional synchronization, and automated demand intelligence, completely eliminating retail checkout downtime and unplanned stockouts.

---

## LIST OF FIGURES / LIST OF ABBREVIATIONS

### List of Figures

| Figure Number | Caption / Figure Title | Architectural Context / Implementation Reference |
| :--- | :--- | :--- |
| **Figure 1.1** | Global High-Level 3-Tier Distributed Architecture | Overview of Client Edge, Spring Boot Core, and Python AI Microservice |
| **Figure 1.2** | Offline-First Dual Persistence and Synchronization Flow | Bi-directional data pipeline between WebAssembly SQLite/IndexedDB and MySQL 8 |
| **Figure 2.1** | Retail Inventory Stockout and Overstocking Trade-off Curve | Supply chain buffer dynamics and economic order quantity principles |
| **Figure 3.1** | System Layered Component and Data Flow Architecture | Detailed Mermaid schematic of presentation, services, persistence, and external bridges |
| **Figure 3.2** | Asynchronous Event-Driven Low-Stock Notification Sequence | Flow from `ProductService` through `LowStockEvent`, `LowStockEventListener`, to `NotificationService` |
| **Figure 3.3** | SQLite Offline Alert Queue State Transition Diagram | State machine for `PENDING` -> `SENT` or `FAILED` with exponential retry backoff |
| **Figure 3.4** | Ordinary Least Squares (OLS) Regression Demand Curve | Mathematical linear regression fitting historical transaction time intervals to demand quantity |
| **Figure 3.5** | Hardware and Camera Barcode Video Feed Ingestion Pipeline | Canvas frame capture and decoding using `@zxing/browser` MultiFormatReader |
| **Figure 3.6** | Bulk Product Import Processing State Machine | CSV/Excel upload, alias dictionary auto-mapping, validation, and batch persistence |
| **Figure 4.1** | Relational Database Entity-Relationship (ER) Schema | MySQL 8 relational schema with `products`, `transactions`, `stock_alerts`, `users`, and configs |
| **Figure 4.2** | Client-Side Heartbeat and Network Connectivity Poller | State transitions inside `ConnectivityProvider` during online, offline, and simulated offline modes |
| **Figure 5.1** | Screen Mockup: Executive Analytics Dashboard | Real-time inventory valuation, KPIs, fast/slow moving items, and transaction logs |
| **Figure 5.2** | Screen Mockup: Product Master Catalog & Grid | Live SKU listing, barcode badges, stock health pills, and modal triggers |
| **Figure 5.3** | Screen Mockup: Bulk CSV/Excel Product Import Wizard | 4-step wizard: upload, column auto-mapping, validation grid, and duplicate strategy execution |
| **Figure 5.4** | Screen Mockup: Live Camera Barcode Scanner | Optical viewfinder, device camera selection, and instantaneous catalog lookup |
| **Figure 5.5** | Screen Mockup: Point-of-Sale (POS) Sales Register | Multi-item cart calculation, cash/online tender, and zero-latency checkout |
| **Figure 5.6** | Screen Mockup: Procurement & Purchase Restocking Register | Inward stock acquisition, supplier mapping, and unit cost adjustments |
| **Figure 5.7** | Screen Mockup: Synchronized Transaction Audit History | Master ledger displaying invoice IDs, timestamps, amounts, and sync statuses |
| **Figure 5.8** | Screen Mockup: AI Demand Forecasting & Intelligence Center | Trend slope visualizer, safety buffer slider, period horizon, and reorder recommendation |
| **Figure 5.9** | Screen Mockup: Low-Stock Email Alert Monitoring & Dispatch | Alert queue manager, SQLite offline spool inspector, and live SMTP test controller |
| **Figure 5.10** | Screen Mockup: Enterprise Reporting & Analytics Suite | Master catalog valuation, sales/purchases ledgers, and POI/CSV export triggers |
| **Figure 5.11** | Screen Mockup: Role-Based User Management & RBAC | User credential manager, role pill tags (ADMIN, MANAGER, CASHIER), and security access |
| **Figure 5.12** | Screen Mockup: Distributed System Architecture & Health Monitor | Node latency prober, port status cards, HikariCP pool health, and microservice status |
| **Figure 5.13** | Screen Mockup: System Authentication & Secure Login Portal | BCrypt authentication form, session establishment, and access control router |

### List of Abbreviations

| Abbreviation | Complete Technical Expansion | Context within Project |
| :--- | :--- | :--- |
| **ACID** | Atomicity, Consistency, Isolation, Durability | RDBMS transaction guarantees enforced in MySQL 8 |
| **AI** | Artificial Intelligence | Machine learning algorithms applied to retail demand forecasting |
| **API** | Application Programming Interface | RESTful HTTP contracts connecting client, core, and microservices |
| **BCrypt** | Blowfish-based Cryptographic Hash Algorithm | One-way salted hashing used for user passwords in `SecurityConfig` |
| **CORS** | Cross-Origin Resource Sharing | Security mechanism configuring HTTP access between ports 5173 and 8080 |
| **CSV** | Comma-Separated Values | Flat-file data format supported in bulk product import and report export |
| **DAO** | Data Access Object | Spring Data JPA repository interfaces abstracting database operations |
| **DDL** | Data Definition Language | SQL schema creation commands defining tables, keys, and indexes |
| **DML** | Data Manipulation Language | SQL queries executing data inserts, updates, deletes, and selections |
| **DTO** | Data Transfer Object | Encapsulated payloads (`TransactionRequest`, `AlertQueueItem`) |
| **EAN** | European Article Number | Standard 13-digit barcode format processed by `@zxing/browser` |
| **ER** | Entity-Relationship | Database structural model showing table associations and foreign keys |
| **FIFO** | First In, First Out | Queue ordering logic applied in SQLite offline transaction spooling |
| **HikariCP** | Hikari Connection Pool | High-performance JDBC connection pool utilized by Spring Boot 3 |
| **HTML** | HyperText Markup Language | Document markup structure used for Web UI and Thymeleaf emails |
| **HTTP** | HyperText Transfer Protocol | Stateless transport protocol for client-server communication |
| **IDB** | IndexedDB | Low-level client-side browser object database accessed via `idb` |
| **IDE** | Integrated Development Environment | IntelliJ IDEA and Visual Studio Code software environments |
| **IEEE** | Institute of Electrical and Electronics Engineers | Standard citation and documentation formatting guideline |
| **IMS** | Inventory Management System | The overarching domain and classification of the developed software |
| **JDBC** | Java Database Connectivity | Low-level Java API for database access to MySQL and SQLite |
| **JSON** | JavaScript Object Notation | Data serialization format used across all REST API endpoints |
| **JPA** | Jakarta Persistence API | Object-relational mapping standard implemented via Hibernate ORM |
| **JVM** | Java Virtual Machine | Execution runtime environment for the Spring Boot backend service |
| **KPI** | Key Performance Indicator | Business metrics such as total valuation, stock turnover, and stockout count |
| **LoRA** | Low-Rank Adaptation | Parameter-efficient fine-tuning for LLMs/Diffusion *(NOT FOUND in code)* |
| **ML** | Machine Learning | Algorithmic prediction models including Scikit-Learn Linear Regression |
| **MRP** | Maximum Retail Price | Ceiling consumer price mapped to `sellingPrice` in product records |
| **MVC** | Model-View-Controller | Architectural design pattern structuring Spring Boot endpoints |
| **OLS** | Ordinary Least Squares | Mathematical optimization method minimizing squared residuals |
| **ORM** | Object-Relational Mapping | Automated mapping between Java entity classes and SQL relational tables |
| **PDF** | Portable Document Format | Printable report output format generated using iText 7 Core |
| **POI** | Poor Obfuscation Implementation | Apache POI library used for Excel `.xlsx` and `.xls` binary workbook manipulation |
| **POS** | Point of Sale | Checkout register handling live sales transactions and barcode input |
| **RBAC** | Role-Based Access Control | Authorization paradigm restricting features by ADMIN, MANAGER, CASHIER |
| **REST** | Representational State Transfer | Architectural style governing HTTP client-server interactions |
| **SKU** | Stock Keeping Unit | Distinct merchant item identifier tied to barcode numbers |
| **SMTP** | Simple Mail Transfer Protocol | Network protocol used by JavaMailSender to dispatch alert emails |
| **SPA** | Single Page Application | React architecture where client-side routing eliminates full page reloads |
| **SQL** | Structured Query Language | Declarative programming language used for database queries |
| **TLS** | Transport Layer Security | Cryptographic protocol securing SMTP email transmissions on port 587 |
| **UI** | User Interface | Visual front-end components rendered in the browser for operator use |
| **UPC** | Universal Product Code | 12-digit barcode symbology decoded by the ZXing vision engine |
| **URI** | Uniform Resource Identifier | Standard identifier specifying API resource paths |
| **UUID** | Universally Unique Identifier | 128-bit pseudo-random string generating `localTransactionId` keys |
| **Vite** | Next Generation Frontend Tooling | Fast ES-module build tool powering the React frontend |
| **VRAM** | Video Random Access Memory | Dedicated GPU memory *(NOT FOUND in code - required only for diffusion)* |
| **WASM** | WebAssembly | Binary instruction format enabling SQLite 3 execution inside web browsers |
| **ZXing** | "Zebra Crossing" | Open-source barcode recognition library implemented via `@zxing/browser` |

---

## CHAPTER 1: INTRODUCTION

### 1.1 Overview of the Project
The **AI-Powered Hybrid Inventory Management System** is a next-generation distributed software architecture engineered to resolve critical vulnerabilities in retail and supply chain operations. In modern enterprise environments, inventory management is not merely a record-keeping utility; it is the fundamental operational backbone governing cash flow, procurement scheduling, shrinkage mitigation, and consumer satisfaction. Traditional computerized inventory systems are rigidly dependent upon continuous, high-bandwidth internet connectivity to centralized cloud databases. When physical network infrastructure fails—due to local ISP disruptions, severed cabling, or routing errors—traditional cloud point-of-sale (POS) registers freeze, halting retail counter checkout, frustrating customers, and inflicting severe financial and reputational losses.

Furthermore, traditional systems rely upon reactive, manual stock audits where warehouse personnel physically scan shelves to detect shortages after goods have already been depleted. This lag causes stockouts of fast-moving consumer goods, disrupting order fulfillment while simultaneously allowing slow-moving catalog items to accumulate, tying up operational working capital in depreciating assets.

This project delivers a **hybrid, edge-resilient, AI-augmented architecture**. It couples an ultra-fast React 18 / Vite Single Page Application (SPA) with a resilient Spring Boot 3.3.5 enterprise core and a Scikit-Learn Python microservice. By integrating a WebAssembly-powered SQLite 3 engine (`sql.js`) and IndexedDB directly inside the web browser client, POS sales and purchase restocking continue uninterrupted during total network outages. Offline transactions are cryptographically indexed with local UUIDs, spooled into browser memory, and automatically synchronized to a central MySQL 8 database upon connection restoration. Concurrently, an event-driven background alerting pipeline monitors threshold breaches, spools pending notices into an embedded server-side SQLite queue (`alert_queue.db`), and dispatches multi-recipient HTML alerts via SMTP. Predictive demand intelligence is embedded via univariate Linear Regression, analyzing chronological sales velocity to project period-ahead demand, quantify trend slopes, and calculate recommended reorder quantities.

### 1.2 Problem Statement
Commercial retail establishments, grocery chains, pharmacies, and distribution centers operate in environments where uninterrupted billing speed and stock availability are non-negotiable. Despite advancements in cloud computing, existing inventory systems exhibit four fundamental failures:

1. **Vulnerability to Network Partitions:** The overwhelming majority of modern Point of Sale (POS) and inventory web applications operate under a synchronous client-to-cloud request model. A temporary network disconnection or latency spike renders the cash register unresponsive. Transactions cannot be processed, customer queues stall, and store operations cease entirely.
2. **Reactive, Unscientific Reordering:** Retail staff typically reorder merchandise only after physical stockouts occur or when visual inspection reveals depleted shelves. Stock replenishment decisions are driven by intuition rather than mathematical analysis of historical consumption velocity, leading to frequent stockouts of high-velocity items and costly overstocking of low-velocity items.
3. **Fragile Alerting Mechanisms:** When stock dips below minimum safety thresholds, conventional systems attempt synchronous email delivery during the checkout HTTP transaction. If the external SMTP mail server experiences downtime or the store's outbound internet connection is severed, the notification fails silently, leaving store managers uninformed about depleted inventory.
4. **Data Onboarding Friction and Manual Errors:** Populating enterprise inventory systems with supplier catalogs requires parsing vendor spreadsheets containing thousands of rows. Conventional systems mandate rigid, proprietary CSV column formats; any slight variation in header naming (e.g., "Cost" vs "cost_price" or "SKU" vs "barcode") results in parser crashes, corrupted records, and hours of manual data sanitization.

### 1.3 Project Objective
The central objective of this project is to construct, validate, and deploy a robust, end-to-end Hybrid Inventory Management Platform that unifies offline transaction execution, intelligent demand forecasting, automated alert spooling, and optical barcode vision. The specific technical goals include:

- **Implement Edge-Resilient Offline Persistence:** Engineer a zero-latency client-side persistence tier utilizing WebAssembly SQLite (`sql.js`) and IndexedDB (`idb`) that enables operators to complete POS sales, purchases, and stock lookups without network connectivity, automatically queuing mutations with unique UUID keys.
- **Bi-Directional Auto-Synchronization:** Formulate an automated reconciliation engine that detects network restoration, verifies server availability via active heartbeat probing, transfers batched offline transactions to the Spring Boot REST API, resolves catalog identifier mappings, and commits ACID mutations to central MySQL storage.
- **Machine Learning Demand Forecasting:** Construct a dedicated Python microservice utilizing `scikit-learn` and `numpy` to ingest historical transaction time-series, fit Ordinary Least Squares (OLS) regression models, identify velocity trends (INCREASING, DECREASING, STABLE), calculate $R^2$ fit scores, and output recommended reorder quantities to prevent stockouts.
- **Analytical Fallback Guarantee:** Implement an internal mathematical fallback solver inside `AIService.java` utilizing raw Ordinary Least Squares formulas, ensuring that the system generates accurate demand predictions even if the Python microservice is completely unreachable.
- **Decoupled Asynchronous Low-Stock Alerting:** Formulate a non-blocking notification pipeline using Spring `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` that evaluates stock levels post-transaction, enforces a 24-hour alert cooldown per product, resets cooldown upon restocking, spools failed notifications into an embedded SQLite database (`alert_queue.db`), and executes scheduled retries with exponential backoff.
- **Optical Barcode Recognition:** Embed real-time computer vision barcode decoding directly into the web client utilizing `@zxing/browser` and device video streams, enabling instant item lookup and touchless POS cart population.
- **Intelligent Fault-Tolerant Catalog Import:** Build a high-throughput bulk import engine capable of ingesting CSV, XLSX, XLS, and XLSM workbooks, auto-mapping diverse column header aliases, validating pricing constraints, supporting three duplicate resolution strategies (SKIP, UPDATE, ADD_STOCK), and batching persistence via JPA entity flushing.

### 1.4 Scope of the Project

#### 1.4.1 Existing System (Current Tools and Their Limitations)
Existing inventory management tools generally fall into two categories: legacy on-premise desktop software (e.g., legacy Tally, desktop Microsoft Access setups) and contemporary SaaS cloud platforms (e.g., Zoho Inventory, Square, Shopify POS). Both paradigms suffer severe limitations:

- **Legacy On-Premise Systems:**
  - *Data Siloing:* Database files reside on isolated local hard drives; multi-counter concurrency requires complex, brittle local area network (LAN) file sharing.
  - *Lack of Machine Learning:* Predictive forecasting is non-existent; replenishment calculations are limited to static minimum safety numbers entered manually.
  - *No Remote Alerting:* Lack of modern SMTP/API integrations prevents real-time email dispatch to remote store managers and warehouse administrators.
  - *Hardware Rigidity:* Desktop applications cannot be executed across heterogeneous operating systems or mobile handheld devices without proprietary virtualization.
- **Cloud-Only SaaS Platforms:**
  - *Catastrophic Offline Failure:* Total reliance on external web APIs makes the checkout counter completely unusable when local internet access drops.
  - *Latency Overhead:* Every single barcode scan, item addition, and cart calculation requires a network round-trip (150ms–800ms), introducing noticeable lag during peak retail checkout hours.
  - *Recurring Subscription Costs:* High per-register monthly fees impose significant financial burdens on independent retailers and regional distribution hubs.
  - *Inflexible Batch Importers:* Vendor catalogs with non-standard column headers are rejected outright, requiring labor-intensive manual formatting in Excel before ingestion.

#### 1.4.2 Proposed System (What This Project Does Differently)
The proposed AI-Powered Hybrid Inventory Management System bridges the gap between cloud scalability and edge autonomy through a multi-tiered architecture:

- **True Hybrid-Edge Operation:** The application functions with equal proficiency whether connected to high-speed fiber or completely severed from the network. When offline, all queries and transactions execute against local browser WebAssembly SQLite / IndexedDB storage in under 10 milliseconds.
- **Automatic Multi-Strategy Synchronization:** Upon reconnecting, the client reconciles pending transactions against central MySQL storage without manual operator intervention. Offline product IDs are dynamically matched to active catalog barcodes and names, ensuring database integrity.
- **Predictive AI Integration with Dual-Engine Redundancy:** Demand forecasting is integrated directly into the operator dashboard. If the primary Python Flask microservice is offline, the backend automatically switches to a mathematical Java Ordinary Least Squares solver, guaranteeing zero analytical downtime.
- **Dual-Database Alert Resilience:** Low-stock alerts are saved to MySQL and spooled to a local SQLite database (`alert_queue.db`). If SMTP services fail or the network is down, the system schedules automatic retries every 5 minutes with exponential backoff, preventing lost alerts.
- **Zero-Dependency Native Vision Decoding:** Barcode scanning is executed natively in JavaScript via WebRTC and `@zxing/browser`, turning standard consumer webcams, phone cameras, or dedicated barcode scanners into enterprise input devices without requiring external hardware drivers.
- **Intelligent Alias-Driven Ingestion:** The bulk import engine features an alias dictionary covering dozens of industry header variations (e.g., "cost", "buying_price", "unit_cost", "purchase_price"), automatically detecting columns, previewing data, and enforcing database integrity via JPA batching.

### 1.5 Relevance to the Society
In an increasingly digitized global economy, retail enterprises, grocery distributors, medical dispensaries, and public distribution systems (PDS) form the lifeline of human communities. The socioeconomic relevance of this project is profound:

- **Sustaining Essential Supply Chains During Crises:** In developing regions and rural communities, internet connectivity is notoriously unpredictable. During natural disasters, power grid disruptions, or telecom outages, neighborhood grocery stores and pharmacies must remain operational. By enabling offline POS transactions, this system ensures that citizens can purchase food, water, and life-critical medicines without interruption.
- **Food Security and Perishable Waste Reduction:** Food waste is a major global issue. By analyzing historical consumption velocity and calculating linear sales slopes, the AI forecasting module prevents over-ordering of perishable dairy, bakery, and produce items, directly reducing inventory spoilage.
- **Empowering Micro, Small, and Medium Enterprises (MSMEs):** Small business retailers often lack access to expensive enterprise resource planning (ERP) suites like SAP or Oracle. This open, cost-effective hybrid platform democratizes enterprise-grade predictive intelligence, barcode tracking, and automated auditing for small-scale store owners.
- **Economic Efficiency and Shrinkage Mitigation:** Unmonitored stock depletion and unrecorded sales lead to severe inventory shrinkage. The unified audit trail, real-time transaction ledgers, and automated out-of-stock email dispatches establish complete accountability across cashiers, managers, and warehouse administrators.

---

## CHAPTER 2: LITERATURE REVIEW

The technical foundation of this project is informed by extensive research spanning machine learning demand forecasting, edge-cloud database synchronization, computer vision barcode decoding, and fault-tolerant microservice messaging. 

*(Note: The project book template specifies reviewing Diffusion Models, LoRA, and Inpainting. Because this codebase implements an AI-Powered Hybrid Inventory System utilizing Linear Regression, Barcode Vision Processing, and Offline-First Storage rather than generative image synthesis, those generative topics are explicitly flagged below as "NOT FOUND in codebase - needs user input", followed by rigorous reviews of the real, foundational literature relevant to the actual project domain alongside generative design context).*

### Review of Related Literature

#### 1. Univariate and Multivariate Time-Series Forecasting in Retail Supply Chains
- **Authors & Reference:** Hyndman, R. J., & Athanasopoulos, G. (2018). *Forecasting: Principles and Practice*, 2nd Edition, OTexts. [VERIFY]
- **Technique Used:** Ordinary Least Squares (OLS) Linear Regression, Autoregressive Integrated Moving Average (ARIMA), and Exponential Smoothing methods for demand projection.
- **Strengths:** Establishes clear mathematical formulations for trend estimation, slope extraction, and residual minimization across sequential retail transaction logs. Provides interpretable coefficients ($m$, $c$) and goodness-of-fit metrics ($R^2$).
- **Limitations:** Standard linear models assume linear trend continuity and struggle to capture sudden seasonal shifts, macroeconomic shocks, or holiday promotions without exogenous regressors.
- **How This Project Improves on It:** This project implements Ordinary Least Squares Linear Regression within a high-speed Python/Flask microservice (`app.py`), paired with an analytical Java fallback (`AIService.java`). The system bounds predictions ($\max(0, \hat{y})$), dynamically computes recommended replenishment quantities ($Q_{\text{reorder}} = \max(0, \lceil \hat{y} \rceil - Q_{\text{current}})$), and calculates projected deficits in under 15ms.

#### 2. Offline-First Database Architectures and Distributed Client-Side Storage
- **Authors & Reference:** Kleppmann, M. (2017). *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*, O'Reilly Media. [VERIFY]
- **Technique Used:** Conflict-free replicated data structures, client-side caching, local transaction logs, and asynchronous bi-directional reconciliation models.
- **Strengths:** Demonstrates how local persistence layers eliminate network round-trip latencies, shielding user-facing operations from server unavailability.
- **Limitations:** Focuses primarily on complex peer-to-peer eventual consistency protocols, which introduce heavy computational overhead and distributed locking hazards unsuitable for lightweight web browsers.
- **How This Project Improves on It:** This project deploys a practical, zero-overhead hybrid persistence model using WebAssembly SQLite (`sql.js`) backed by IndexedDB (`idb`) in the browser. Transactions receive unique UUID keys (`localTransactionId`), stock deductions apply immediately to local cache, and reconciliation occurs through an atomic Spring Boot REST batch endpoint (`/transactions` and `/sync`) with automated fallback product mapping.

#### 3. Real-Time Optical Barcode Recognition via Computer Vision
- **Authors & Reference:** Sörös, G., & Flörkemeier, C. (2013). "Towards background-subtraction-based barcode localization for mobile devices," *Proceedings of the 2013 ACM Conference on Pervasive and Ubiquitous Computing Adjunct*, pp. 491–500. [VERIFY]
- **Technique Used:** Video frame thresholding, binarization, gradient morphological filtering, and 1D/2D symbology decoding (EAN-13, UPC-A, Code 128) across heterogeneous video feeds.
- **Strengths:** Enables mobile and commodity web cameras to function as optical barcode scanners without dedicated laser hardware.
- **Limitations:** High frame processing latency and excessive CPU utilization when executed inside single-threaded JavaScript runtimes.
- **How This Project Improves on It:** This project utilizes `@zxing/browser` (`BrowserMultiFormatReader`) tied directly to a native HTML5 `<video>` element (`BarcodeScanner.jsx` and `Barcode.jsx`). Camera streams decode frames asynchronously, halting the reader immediately upon identification to free CPU resources and instantly updating the React cart state.

#### 4. Asynchronous Event-Driven Microservice Notifications and Decoupled Processing
- **Authors & Reference:** Richardson, C. (2018). *Microservices Patterns: With examples in Java*, Manning Publications. [VERIFY]
- **Technique Used:** Transactional Outbox Pattern, Event-Driven Architecture, Domain Event Publishing, and Asynchronous Message Queues.
- **Strengths:** Prevents slow third-party external I/O (such as SMTP email transmission) from blocking transactional database commits, preventing connection pool exhaustion.
- **Limitations:** Typically mandates heavy external broker infrastructure like Apache Kafka or RabbitMQ, introducing substantial operational complexity and memory overhead for small-to-medium enterprise deployments.
- **How This Project Improves on It:** The project implements an elegant, zero-broker outbox mechanism using Spring’s internal `ApplicationEventPublisher`, `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`, and an embedded server-side SQLite queue (`alert_queue.db`). Sales commit instantly to MySQL, while email alerts dispatch in the background with automated exponential retry backoff.

#### 5. Fault-Tolerant Microservice Communication and Resilient Fallbacks
- **Authors & Reference:** Nygard, M. T. (2018). *Release It!: Design and Deploy Production-Ready Software*, 2nd Edition, Pragmatic Bookshelf. [VERIFY]
- **Technique Used:** Circuit Breaker pattern, timeout management, graceful degradation, and analytical fallback computation.
- **Strengths:** Formulates engineering strategies to prevent cascading failures across interconnected HTTP microservices.
- **Limitations:** Many implementations return empty responses or generic error codes when an upstream service fails, degrading application functionality.
- **How This Project Improves on It:** In `AIService.java`, the system wraps external HTTP calls to `http://localhost:5000/forecast` in a structured try-catch block. Upon catching a `RestClientException`, the service executes an internal mathematical OLS regression algorithm, ensuring continuous analytical output with zero service degradation.

#### 6. High-Throughput Relational Batch Ingestion and Conflict Resolution
- **Authors & Reference:** Bauer, C., King, G., & Gregory, G. (2015). *Java Persistence with Hibernate*, 2nd Edition, Manning Publications. [VERIFY]
- **Technique Used:** JDBC batching, JPA entity state management, first-level cache clearing (`EntityManager.clear()`), and optimistic locking.
- **Strengths:** Demonstrates how batching inserts and flushes prevents Java Virtual Machine (JVM) `OutOfMemoryError` exceptions during massive dataset uploads.
- **Limitations:** Standard documentation focuses on programmatic Java collections and fails to address dirty vendor spreadsheet data with inconsistent column names.
- **How This Project Improves on It:** This project designs `ProductImportService.java` (876 lines), implementing a 10-field alias dictionary that maps arbitrary header names (e.g., "mrp", "retail_price", "sale_price" -> `sellingPrice`), validates row types, detects database conflicts, supports three resolution strategies (SKIP, UPDATE, ADD_STOCK), and flushes the JPA persistence context every 100 records.

#### 7. Latency and Synchronization Overhead in Mobile-Edge Computing
- **Authors & Reference:** Satyanarayanan, M. (2017). "The Emergence of Edge Computing," *IEEE Computer*, vol. 50, no. 1, pp. 30–39. [VERIFY]
- **Technique Used:** Edge-cloud tiering, local surrogate computing, bandwidth optimization, and state caching.
- **Strengths:** Validates the paradigm that pushing computing and data storage to the logical edge drastically minimizes latency and enhances system availability.
- **Limitations:** Focuses primarily on physical edge server hardware rather than browser-native WebAssembly database engines.
- **How This Project Improves on It:** This project pushes the edge directly into the operator's web browser tab through WebAssembly SQLite 3 and IndexedDB, enabling sub-10ms transactional execution on consumer hardware with zero edge server provisioning costs.

#### 8. High-Performance Relational Schema Indexing for Transaction Audits
- **Authors & Reference:** Silberschatz, A., Korth, H. F., & Sudarshan, S. (2020). *Database System Concepts*, 7th Edition, McGraw-Hill. [VERIFY]
- **Technique Used:** B-Tree indexing, composite indexing, foreign key constraints, and transactional consistency models in relational databases.
- **Strengths:** Provides theoretical and practical proofs for optimizing read-heavy analytical reporting and high-concurrency transactional writes.
- **Limitations:** Abstract theoretical focus without specific reference to hybrid offline transaction reconciliation or dual-database spooling.
- **How This Project Improves on It:** In `schema.sql`, the system engineers dedicated B-Tree indexes (`idx_transaction_date`, `idx_transaction_product`, `idx_alert_status`, `idx_alert_date`, `idx_recipient_type_target`), optimizing high-frequency queries like dashboard summary generation, inventory valuation, and stockout tracking.

#### 9. Generative Diffusion Models and Latent Space Image Synthesis *(Template Heading)*
- **Authors & Reference:** Ho, J., Jain, A., & Abbeel, P. (2020). "Denoising Diffusion Probabilistic Models," *Advances in Neural Information Processing Systems (NeurIPS 2020)*, 33, pp. 6840–6851. [VERIFY]
- **Technique Used:** Denoising score matching, Markovian forward diffusion processes, and reverse variational trajectory estimation.
- **Relevance to Present Codebase:** **NOT FOUND in codebase - needs user input.** The active repository contains an AI-powered hybrid inventory management platform utilizing linear regression demand forecasting and computer vision barcode decoding. It does not contain generative diffusion pipelines. (Included here to address the project book template requirement; if generative product mockups or fashion design synthesis are planned for future versions, this paper serves as the theoretical foundation).

#### 10. Low-Rank Adaptation (LoRA) for Parameter-Efficient Model Adaptation *(Template Heading)*
- **Authors & Reference:** Hu, E. J., Shen, Y., Wallis, P., Allen-Zhu, Z., Li, Y., Wang, S., Wang, L., & Chen, W. (2022). "LoRA: Low-Rank Adaptation of Large Language Models," *ICLR 2022*. [VERIFY]
- **Technique Used:** Decomposition of weight update matrices into low-rank rank decomposition matrices ($W_0 + \Delta W = W_0 + B \cdot A$).
- **Relevance to Present Codebase:** **NOT FOUND in codebase - needs user input.** The active repository contains on-the-fly dynamic fitting of Ordinary Least Squares regression curves on product transaction sequences rather than Low-Rank Adaptation of transformer weights. (Referenced strictly to satisfy the project book template heading).

---

## CHAPTER 3: DESIGN

### 3.1 System Architecture

The AI-Powered Hybrid Inventory Management System is structured around a multi-tier, distributed, edge-resilient architecture designed to ensure zero downtime, strict data consistency, and low-latency interaction.

```mermaid
flowchart TD
    subgraph Client_Tier [Client & Edge Layer (React 18 / Vite SPA - Port 5173)]
        UI[User Interface & Router\nReact 18 + Lucide Icons]
        POS[POS Sales & Purchases\nTransaction.jsx]
        CAM[Camera Barcode Scanner\n@zxing/browser]
        CP[Connectivity Provider\nHeartbeat Poller & Mode Toggle]
        
        subgraph Browser_Storage [Browser Edge Persistence]
            WASM[WebAssembly SQLite 3\nsql.js Engine]
            IDB[(IndexedDB Storage\nidb v8.0.0)]
            CACHE[Local Product & Pending Cache]
        end
        
        UI --> POS
        CAM --> POS
        POS --> CP
        CP <--> WASM
        CP <--> IDB
        WASM <--> IDB
    end

    subgraph Backend_Tier [Core Enterprise Backend (Spring Boot 3.3.5 - Port 8080)]
        SEC[Spring Security & BCrypt\nSecurityConfig.java]
        
        subgraph Controllers [REST API Controllers]
            PC[ProductController]
            TC[TransactionController]
            SC[SyncController]
            FC[ForecastController]
            AC[AlertController]
            RC[ReportController]
            IC[ProductImportController]
            UC[UserController]
        end
        
        subgraph Services [Service & Business Logic]
            PS[ProductService\nThreshold & Cooldown Evaluator]
            TS[TransactionService\nStock Mutator & Validator]
            AIS[AIService\nHTTP Client + OLS Fallback]
            PIS[ProductImportService\nApache POI Batch Importer]
            NS[NotificationService\nThymeleaf + JavaMailSender]
            SM[AlertQueueSqliteManager\nOffline Alert Spooler]
        end
        
        subgraph Events [Event Driven Architecture]
            PUB[Spring ApplicationEventPublisher]
            EVT[LowStockEvent]
            LIS[LowStockEventListener\n@Async AFTER_COMMIT]
        end
    end

    subgraph AI_Tier [Predictive AI Microservice (Python 3 - Port 5000)]
        FLASK[Flask Microservice\napp.py]
        SKLEARN[Scikit-Learn\nLinearRegression]
        NUMPY[NumPy Vectorized OLS]
    end

    subgraph Persistence_Tier [Dual Relational Storage Tier]
        MYSQL[(MySQL 8 Database\ninventory_db - Port 3306)]
        SQLITE[(SQLite Embedded DB\nalert_queue.db)]
    end

    subgraph External_Systems [External Bridge Infrastructure]
        SMTP[SMTP Mail Server\nPort 587 - STARTTLS]
    end

    %% Connections
    CP -- "HTTP REST (Online / Sync)" --> Controllers
    Controllers --> Services
    TS --> PS
    PS --> PUB
    PUB --> EVT
    EVT --> LIS
    LIS --> NS
    NS --> SM
    SM <--> SQLITE
    NS -- "MimeMessage / HTML" --> SMTP
    FC --> AIS
    AIS -- "POST /forecast" --> FLASK
    FLASK --> SKLEARN
    SKLEARN --> NUMPY
    Services <--> MYSQL
```

#### Layered Architectural Decomposition:

1. **Client Edge Presentation Layer (Browser Runtime):** Built with React 18 and Vite 5, providing an ultra-responsive Single Page Application. It incorporates `@zxing/browser` for camera-based optical barcode capture, Chart.js for data visualization, and an edge persistence engine (`sqliteStorage.js`). The client maintains an active heartbeat (`Connectivity.jsx`) that pings `/products` every 6 seconds. When connectivity is interrupted, mutations are routed to browser-resident WebAssembly SQLite 3 (`sql.js`) and IndexedDB (`idb`).
2. **Enterprise Application Core Layer (Spring Boot 3.3.5):** A robust Java 17 framework hosting REST controllers, transaction orchestration, Spring Data JPA repositories, and Spring Security. The core manages catalog mutations, transaction recording, role-based access control, and asynchronous domain event dispatching.
3. **Predictive AI Intelligence Layer (Flask Microservice):** A lightweight Python 3 microservice operating on port 5000. It exposes `/health` and `/forecast` endpoints, running Scikit-Learn’s Ordinary Least Squares regression algorithm over historical sales sequences to calculate predicted demand, trend slopes, and $R^2$ goodness-of-fit metrics.
4. **Dual Persistence Tier (MySQL 8 + SQLite):**
   - *Primary MySQL Database (`inventory_db`):* Holds authoritative enterprise records for products, categories, suppliers, transactions, users, and audit logs.
   - *Secondary Embedded SQLite Database (`alert_queue.db`):* Governed by `AlertQueueSqliteManager`, this embedded store acts as a fault-tolerant outbox for low-stock alerts, spooling pending notifications when external network or SMTP services are down.
5. **Notification and Communication Bridge:** Powered by JavaMailSender and Thymeleaf template resolution. Renders responsive HTML alerts (`low-stock-alert.html`) and dispatches them via SMTP over port 587 with TLS encryption.

### 3.2 Hardware and Software Specifications

#### 3.2.1 Hardware Requirements
*(Note: The project book template specifies GPU and VRAM requirements. Because this system utilizes Scikit-Learn Linear Regression and ZXing Optical Vision rather than Generative Diffusion Models or deep neural networks, dedicated GPU/VRAM is NOT FOUND in the active code. The exact hardware specifications required to execute the hybrid inventory system are detailed below, alongside the hypothetical hardware needed if a Generative Diffusion module were introduced).*

- **Standard Hardware Specifications (Actual System Requirements):**
  - **Processor (CPU):** Intel Core i3 / i5 (8th Gen or higher) or AMD Ryzen 3 / 5 (Quad-core, 2.0 GHz or higher). The univariate Ordinary Least Squares regression and video frame decoding run efficiently on modern multi-core x86/x64 CPUs.
  - **System Memory (RAM):** 8 GB DDR4 minimum (16 GB recommended). Accommodates simultaneous execution of the Spring Boot JVM (heap allocation: 512 MB – 1 GB), MySQL 8 Server (InnoDB buffer pool: 512 MB – 1 GB), Python Flask runtime (~100 MB), and modern web browser with WebAssembly memory buffers.
  - **Storage (Solid State Drive - SSD):** 256 GB SATA or NVMe SSD. Fast random I/O read/write speeds ensure rapid IndexedDB updates, near-instantaneous SQLite WAL-mode commits, and responsive MySQL transaction logging.
  - **Video / Optical Input Device:** Standard USB Webcam or integrated laptop camera (720p HD resolution at 30 fps) for real-time barcode decoding via `@zxing/browser`.
  - **Network Interface:** 10/100/1000 Mbps Gigabit Ethernet or 802.11ac Wi-Fi adapter. Required for inter-service communication and SMTP email dispatch.
- **GPU & VRAM Requirements (NOT FOUND in code - required only for Generative AI / Diffusion extensions):**
  - *Dedicated Graphics Processing Unit (GPU):* NVIDIA GeForce RTX 3060 / 4060 or higher (Compute Capability 8.6+). *(NOT FOUND in code - needs user input).*
  - *Video Memory (VRAM):* 8 GB – 12 GB GDDR6 minimum. *(NOT FOUND in code - required only if fine-tuning Stable Diffusion or running text-to-design pipelines).*

#### 3.2.2 Software Requirements
All software components, runtime environments, and exact dependency versions extracted directly from `pom.xml`, `package.json`, and `requirements.txt`:

- **Operating System:** Microsoft Windows 10 / 11 (64-bit), Ubuntu Linux 22.04 LTS, or macOS 13+ (Ventura or newer).
- **Primary Runtime Environments:**
  - **Java Development Kit (JDK):** Version 17 LTS (Eclipse Temurin / Oracle OpenJDK 17.0.x).
  - **Node.js Runtime:** Version 18.x or 20.x LTS.
  - **Python Runtime:** Version 3.10.x, 3.11.x, or 3.12.x.
  - **Relational Database Server:** MySQL Community Server Version 8.0.x or 8.4 LTS.
- **Backend Dependencies (`pom.xml` - Spring Boot 3.3.5):**
  - `org.springframework.boot:spring-boot-starter-web` (Spring Boot Web 3.3.5)
  - `org.springframework.boot:spring-boot-starter-data-jpa` (Spring Data JPA / Hibernate 6)
  - `org.springframework.boot:spring-boot-starter-validation` (Jakarta Bean Validation)
  - `org.springframework.boot:spring-boot-starter-security` (Spring Security 6.3.x)
  - `org.springframework.boot:spring-boot-starter-mail` (Jakarta Mail / JavaMailSender)
  - `org.springframework.boot:spring-boot-starter-thymeleaf` (Thymeleaf Template Engine 3.1.x)
  - `ognl:ognl:3.4.3` (Object-Graph Navigation Language)
  - `com.mysql:mysql-connector-j` (MySQL JDBC Driver - Runtime scope)
  - `org.xerial:sqlite-jdbc:3.46.1.0` (SQLite JDBC Embedded Engine)
  - `org.projectlombok:lombok:1.18.36` (Boilerplate code reduction)
  - `com.itextpdf:itext7-core:8.0.5` (iText PDF Document Generation)
  - `org.apache.poi:poi-ooxml:5.3.0` (Apache POI Excel `.xlsx` / `.xls` Processing)
  - `org.springframework.boot:spring-boot-starter-test` (JUnit 5, Mockito, AssertJ - Test scope)
- **Frontend Dependencies (`package.json` - React 18 / Vite 5):**
  - `react`: `^18.3.1`
  - `react-dom`: `^18.3.1`
  - `react-router-dom`: `^6.28.0` (Client-side routing)
  - `@zxing/browser`: `^0.1.5` (Zebra Crossing Barcode Computer Vision)
  - `axios`: `^1.7.7` (HTTP client with timeout handling)
  - `chart.js`: `^4.4.6` (Canvas-based data charting)
  - `react-chartjs-2`: `^5.2.0` (React bindings for Chart.js)
  - `idb`: `^8.0.0` (IndexedDB Promise-based wrapper)
  - `sql.js`: `^1.14.2` (SQLite 3 compiled to WebAssembly)
  - `lucide-react`: `^0.468.0` (Modern SVG iconography)
  - `@vitejs/plugin-react`: `^4.3.3` (Vite React HMR plugin)
  - `vite`: `^5.4.10` (Frontend development and build server)
- **Python AI Microservice Dependencies (`requirements.txt`):**
  - `flask` (Version 3.0.x - Lightweight WSGI microservice web framework)
  - `scikit-learn` (Version 1.4.x / 1.5.x - Machine learning algorithms and LinearRegression)
  - `numpy` (Version 1.26.x / 2.x - Vectorized mathematical computations and array operations)

### 3.3 Module Specification

#### 3.3.1 User Input Module
- **Purpose:** Manages operator interaction across billing, catalog searching, manual adjustments, credential authentication, and file ingestion.
- **Inputs:** User keystrokes, form submissions (login, products, suppliers, users), optical webcam streams, and multi-part spreadsheet files (`.csv`, `.xlsx`, `.xls`, `.xlsm`).
- **Outputs:** Sanitized JSON request payloads (`TransactionRequest`, `ProductImportExecuteRequest`, `LoginRequest`), debounced search filters, and parsed file data arrays.
- **Working Steps:**
  1. Captures operator input through responsive React form controls and modal dialogues.
  2. Executes real-time client-side validation (verifying required fields, non-negative quantities, email formats, and password constraints).
  3. Provides an interactive searchable combobox component (`SearchableProductSelect`) with debounced queries filtering products by barcode, title, supplier, or category.
  4. Intercepts file uploads via `ProductImportModal.jsx`, parses workbooks asynchronously, maps headers via an alias dictionary, presents a 10-row preview, and submits validated records to `/products/import/execute`.
- **Libraries Used:** React 18, `axios`, `lucide-react`, `ProductImportModal.jsx`, `Layout.jsx`.
- **Key Functions:** `handleSelectProduct()`, `uploadAndParseFile()`, `executeImport()`, `handleLogin()`, `toggleOfflineMode()`.

#### 3.3.2 Image Processing & Feature Extraction Module
*(Note: Generative AI feature extraction pipelines for diffusion latents are **NOT FOUND in codebase - needs user input**. In this codebase, image processing is implemented as a **Computer Vision Barcode Decoding and Feature Extraction Engine**).*
- **Purpose:** Ingests live video camera frames, performs spatial thresholding, detects 1D/2D optical patterns, extracts numerical barcode feature strings (EAN-13, UPC-A, Code 128), and triggers automated product lookups.
- **Inputs:** Raw video streams from device cameras via WebRTC `navigator.mediaDevices.getUserMedia()`.
- **Outputs:** Extracted alphanumeric barcode string (e.g., `"8901234567890"`), optical scan feedback, and retrieved product record.
- **Working Steps:**
  1. Requests device media permissions and enumerates available video input devices via `BrowserMultiFormatReader.listVideoInputDevices()`.
  2. Binds the selected camera device ID to an HTML5 `<video>` element reference (`videoRef`).
  3. Executes frame-by-frame luminance transformation, gradient edge detection, and pattern matching inside the ZXing engine.
  4. Upon successful barcode pattern recognition, fires the `onScan(result.getText())` callback.
  5. Plays audio-visual feedback, stops the camera stream to preserve client CPU resources, and calls the backend endpoint `/products/barcode/{barcode}`.
- **Libraries Used:** `@zxing/browser` (`BrowserMultiFormatReader`), WebRTC MediaDevices API.
- **Key Functions:** `startScanner()`, `stopScanner()`, `decodeFromVideoDevice()`, `findProduct()`.

#### 3.3.3 Generative AI Design Module
*(Note: Generative AI Design [Text-to-Design / Image-to-Design / Diffusion] is **NOT FOUND in codebase - needs user input**. The project implements a **Predictive Generative Demand Forecasting & Stockout Intelligence Engine**).*
- **Purpose:** Ingests chronological sales transactions, fits machine learning models to capture demand trends, forecasts future consumption, and computes optimal reorder points to prevent stockouts.
- **Inputs:** Chronological array of sales quantities $Y = [y_1, y_2, \dots, y_n]$ and time periods $X = [1, 2, \dots, n]$.
- **Outputs:** Predicted demand quantity ($\hat{y}_{n+1}$), average sales, velocity trend classification (`INCREASING`, `DECREASING`, `STABLE`), slope ($m$), intercept ($c$), coefficient of determination ($R^2$), stockout risk boolean, and recommended reorder quantity ($Q_{\text{reorder}}$).
- **Working Steps:**
  1. `ForecastController.java` retrieves sales transactions for a target product ID via `transactionService.getSalesForProduct(productId)`.
  2. Validates that at least two historical records exist; otherwise, activates a graceful cold-start calculation.
  3. Constructs a JSON payload `{"sales": [quantity_1, quantity_2, ...]}` and transmits an HTTP POST request to the Python microservice at `http://localhost:5000/forecast`.
  4. The Python microservice constructs a 2D feature matrix $X = \text{np.arange}(1, n + 1).\text{reshape}(-1, 1)$ and label vector $y = \text{np.array}(\text{sales})$.
  5. Instantiates and fits `sklearn.linear_model.LinearRegression()`, predicting the next time period $n + 1$.
  6. Computes the mathematical slope $m = \text{model.coef\_}[0]$, intercept $c = \text{model.intercept\_}$, and $R^2 = \text{model.score}(X, y)$.
  7. Returns the analytical results to Spring Boot. If the Python microservice is unreachable, `AIService.java` transparently executes an internal Ordinary Least Squares mathematical fallback.
  8. Computes the recommended reorder quantity:
     $$Q_{\text{recommended}} = \lceil \hat{y}_{n+1} \rceil, \quad Q_{\text{reorder}} = \max(0, Q_{\text{recommended}} - Q_{\text{current}})$$
- **Libraries Used:** Python `flask`, `scikit-learn` (`LinearRegression`), `numpy`, Java `AIService.java`, `ForecastController.java`.
- **Key Functions:** `forecast()` (Flask), `model.fit()`, `model.predict()`, `calculateFallbackForecast()` (Java), `forecastProduct()` (Java).

#### 3.3.4 LoRA Based Model Adaptation Module
*(Note: Low-Rank Adaptation [LoRA] fine-tuning for foundational large models is **NOT FOUND in codebase - needs user input**. The project implements a **Dynamic On-the-Fly Model Adaptation Engine**).*
- **Purpose:** Dynamically adapts predictive models to localized SKU velocity variations without requiring expensive batch training cycles or static hyperparameter tuning.
- **Inputs:** Continuously updating transaction event streams generated by POS sales and bulk purchase restocks.
- **Outputs:** Real-time recalculation of slope vectors, safety buffers, dynamic velocity categorization (Fast-Moving vs Slow-Moving), and adaptive replenishment thresholds.
- **Working Steps:**
  1. The system treats every product's demand curve as an isolated, dynamically adapted univariate function.
  2. As new transactions are committed via `TransactionService.process()`, historical sales logs are instantly updated.
  3. When an operator queries the forecast or accesses the executive dashboard, the regression model is re-fitted on-the-fly over the latest sequence $Y$.
  4. Products are automatically classified into velocity cohorts:
     - *Fast-Moving:* Sold quantity rank > 0, sorted descending by consumption rate.
     - *Slow-Moving:* Zero or negligible sales velocity over historical periods, identified for inventory clearance.
  5. Safety stock buffers are adjusted adaptively (0%, 15%, 30%) based on operator preferences to accommodate lead-time variability.
- **Libraries Used:** `scikit-learn`, `numpy`, `DashboardController.java`, `Forecast.jsx`.
- **Key Functions:** `movement()` (fast/slow segmentation), `fetchForecastForId()`, `calculateFallbackForecast()`.

#### 3.3.5 Output & Storage Module
- **Purpose:** Orchestrates multi-tier data persistence, asynchronous offline spooling, enterprise reporting exports, and multi-recipient email alerts.
- **Inputs:** Domain entity mutations, low-stock event triggers, report configuration requests, and offline transaction queues.
- **Outputs:** ACID database commits in MySQL 8, persistent records in embedded SQLite, WebAssembly client storage, printable iText 7 PDF reports, Apache POI Excel workbooks, and Thymeleaf HTML emails.
- **Working Steps:**
  1. Persists master records to MySQL tables (`products`, `transactions`, `stock_alerts`, `users`, `alert_recipient_configs`).
  2. Dispatches `LowStockEvent` via Spring's `ApplicationEventPublisher`. The `@Async` listener evaluates stock levels post-commit, checks a 24-hour alert cooldown, and routes emails to configured store managers and administrators.
  3. If external network or SMTP services are down, spools notifications into the embedded SQLite table `alert_queue` with status `PENDING`. A background worker (`@Scheduled` every 5 minutes) retries delivery with exponential backoff.
  4. Generates comprehensive inventory, sales, purchases, and low-stock valuation reports in CSV, Excel (`.xlsx`), and PDF formats.
- **Libraries Used:** Spring Data JPA, Hibernate, `sqlite-jdbc`, `itext7-core`, `poi-ooxml`, `spring-boot-starter-mail`, Thymeleaf.
- **Key Functions:** `evaluateStockChange()`, `handleLowStockEvent()`, `enqueueAlert()`, `retryPendingAlerts()`, `summary()`.

---

## CHAPTER 4: IMPLEMENTATION

### 4.1 Coding

This section details every significant source code file across the backend, AI microservice, frontend, database schema, and email templates, explaining architectural choices and highlighting key implementation blocks.

#### 1. `AI-Hybrid-Inventory-AI/app.py`
- **Purpose:** Primary Python 3 microservice executing Scikit-Learn Ordinary Least Squares (OLS) Linear Regression for demand forecasting and velocity trend extraction.
- **Key Lines to Include in Book:** Lines 16–62 (`forecast()` endpoint implementation).
- **Code Explanation:**
  - *Lines 1–6:* Imports `Flask`, `request`, `jsonify`, `LinearRegression`, and `numpy`.
  - *Lines 8–13:* Exposes `/health`, returning engine metadata to confirm service availability.
  - *Lines 16–31:* Validates incoming JSON payload, verifying that `sales` contains at least two numerical observations.
  - *Lines 33–39:* Transforms sales into a 1D NumPy array $y$, constructs a 2D temporal index vector $X = [1, 2, \dots, n]^T$, instantiates `LinearRegression()`, and fits the model.
  - *Lines 41–49:* Predicts next-period demand ($n+1$), bounds the result to non-negative values ($\max(0.0, \hat{y})$), extracts slope $m = \text{coef\_}[0]$, intercept $c = \text{intercept\_}$, and computes $R^2 = \text{score}(X, y)$.
  - *Lines 50–61:* Categorizes trend velocity (`INCREASING` if slope $> 0.05$, `DECREASING` if slope $< -0.05$, else `STABLE`), computes mean sales, and returns a structured JSON response.

#### 2. `backend-package/src/main/java/com/example/inventory/service/AIService.java`
- **Purpose:** Spring Boot bridge service communicating with the Python microservice, featuring an autonomous internal analytical fallback solver.
- **Key Lines to Include in Book:** Lines 30–67 (`forecast()` method) and Lines 73–109 (`calculateFallbackForecast()` mathematical solver).
- **Code Explanation:**
  - *Lines 23–28:* Injects `ai.service.url` (default: `http://localhost:5000`) and instantiates `RestTemplate`.
  - *Lines 30–60:* Constructs an HTTP POST entity containing the sales array and exchanges data with the Python microservice. If successful, returns the parsed JSON map.
  - *Lines 60–66:* Catches `RestClientException` if the Python service is offline, logs a warning, and seamlessly routes execution to `calculateFallbackForecast(sales)`.
  - *Lines 73–92:* Executes a raw Ordinary Least Squares algorithm using closed-form mathematical formulas:
    $$\sum X, \quad \sum Y, \quad \sum XY, \quad \sum X^2, \quad m = \frac{n \sum XY - \sum X \sum Y}{n \sum X^2 - (\sum X)^2}, \quad c = \frac{\sum Y - m \sum X}{n}$$
  - *Lines 93–109:* Computes prediction $\hat{y} = \max(0.0, m(n+1) + c)$, evaluates slope thresholds for trend labeling, and packages the result identically to the Python microservice response.

#### 3. `backend-package/src/main/java/com/example/inventory/controller/ForecastController.java`
- **Purpose:** REST controller exposing manual array forecasting and product-specific automated intelligence.
- **Key Lines to Include in Book:** Lines 80–194 (`forecastProduct()` endpoint).
- **Code Explanation:**
  - *Lines 80–100:* Finds the product entity by ID and fetches all historical `SALE` transactions via `TransactionService`.
  - *Lines 102–118:* Handles cold-start scenarios: if fewer than two sales exist, returns a structured HTTP 400 response containing current stock and sales records.
  - *Lines 120–129:* Maps transaction objects into a primitive integer array and calls `aiService.forecast(sales)`.
  - *Lines 131–150:* Calculates recommended stock $\lceil \text{predictedDemand} \rceil$, current inventory, and net reorder quantity $\max(0, \text{recommended} - \text{current})$.
  - *Lines 151–193:* Returns an enriched metadata map including barcode, product name, sales history, $R^2$ fit, trend, stockout risk flag (`currentStock < predictedDemand`), and projected deficit.

#### 4. `backend-package/src/main/java/com/example/inventory/service/ProductService.java`
- **Purpose:** Core business service managing product CRUD operations, stock threshold evaluation, alert cooldown enforcement, and domain event publishing.
- **Key Lines to Include in Book:** Lines 117–196 (`evaluateStockChange()` method).
- **Code Explanation:**
  - *Lines 117–125:* Validates non-null quantities and minimum threshold levels.
  - *Lines 126–135:* **Restock Reset Logic:** If current stock exceeds the minimum threshold, sets `restockedAboveMin = true`, resetting the cooldown flag so future stock drops immediately trigger alerts.
  - *Lines 138–163:* **Cooldown Suppression Logic:** Differentiates between standard low-stock ($Q \le Q_{\text{min}}$) and critical stockouts ($Q \le 0$). Enforces a 24-hour suppression window (`cooldownHours`) unless `restockedAboveMin` is true.
  - *Lines 164–182:* Instantiates a `LowStockEvent` with product ID, SKU, supplier, stock levels, critical flag, and trigger reason.
  - *Lines 183–195:* Updates product alert timestamps (`lastAlertAt`, `lastCriticalAlertAt`), sets `restockedAboveMin = false`, persists the entity, and dispatches the event via `eventPublisher.publishEvent(event)`.

#### 5. `backend-package/src/main/java/com/example/inventory/service/LowStockEventListener.java`
- **Purpose:** Asynchronous event listener decoupling stock mutations from email delivery.
- **Key Lines to Include in Book:** Lines 27–38 (`handleLowStockEvent()` method).
- **Code Explanation:**
  - *Lines 27–29:* Annotates the handler with `@Async` and `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)`. This guarantees that email dispatch occurs only after the database transaction has committed successfully, executing on a background thread so POS checkouts are never blocked.
  - *Lines 30–37:* Receives `LowStockEvent` and delegates processing to `notificationService.handleLowStockEvent(event)`.

#### 6. `backend-package/src/main/java/com/example/inventory/service/AlertQueueSqliteManager.java`
- **Purpose:** Manages the embedded server-side SQLite database (`alert_queue.db`), providing an offline outbox queue for low-stock alerts.
- **Key Lines to Include in Book:** Lines 28–56 (`initDatabase()`) and Lines 65–128 (`enqueueAlert()`).
- **Code Explanation:**
  - *Lines 28–56:* Executes SQLite DDL on application startup, creating table `alert_queue` and secondary B-Tree indexes on `status` and `product_id`.
  - *Lines 65–93:* Checks if a `PENDING` alert already exists for the given product ID, preventing duplicate queue spam during consecutive sales.
  - *Lines 94–128:* Prepares and executes an `INSERT INTO alert_queue` statement, recording stock counts, recipient emails, timestamps, and error messages with an initial status of `PENDING`.
  - *Lines 149–180:* Provides atomic methods to mark alerts as `SENT` (`markSent`, `markSentByProductId`) upon successful SMTP transmission.

#### 7. `backend-package/src/main/java/com/example/inventory/service/NotificationService.java`
- **Purpose:** Comprehensive notification engine handling recipient resolution, Thymeleaf HTML email rendering, SMTP transmission, and scheduled retry processing.
- **Key Lines to Include in Book:** Lines 271–313 (`resolveRecipients()`), Lines 338–430 (`handleLowStockEvent()`), and Lines 553–637 (`retryPendingAlerts()`).
- **Code Explanation:**
  - *Lines 221–248:* `isOnline()` probes Google DNS (`8.8.8.8:53`) and Cloudflare DNS (`1.1.1.1:53`) with 1500ms socket timeouts to verify external internet connectivity.
  - *Lines 271–313:* Implements hierarchical recipient resolution checking: 1) product-specific DB config, 2) product manager/admin fields, 3) category-level config, 4) global default config, and 5) application properties fallback.
  - *Lines 338–385:* Saves alert records to MySQL and SQLite as `PENDING` before attempting transmission.
  - *Lines 388–428:* If online and SMTP is configured, renders `low-stock-alert.html` via Thymeleaf and dispatches a multi-part MIME email. On success, marks the alert as `SENT`; on failure, schedules a retry.
  - *Lines 553–637:* `@Scheduled` background worker runs every 5 minutes (`fixedDelayString = "300000"`). It queries `PENDING` alerts, evaluates next retry times, enforces exponential backoff ($5 \times 2^{\text{retry}-1}$ minutes), and marks alerts as `FAILED` if retries exceed 5.

#### 8. `backend-package/src/main/java/com/example/inventory/service/ProductImportService.java`
- **Purpose:** High-throughput batch import service ingesting CSV and Excel workbooks with automated column alias matching.
- **Key Lines to Include in Book:** Lines 50–63 (alias dictionary definition) and Lines 77–150 (workbook parsing and sheet inspection).
- **Code Explanation:**
  - *Lines 50–63:* Builds an alias dictionary mapping logical fields (`barcode`, `productName`, `costPrice`, `sellingPrice`, `quantity`, `minimumStockLevel`, etc.) to dozens of common spreadsheet header variations.
  - *Lines 77–143:* Detects MIME types and extensions (`.csv`, `.xlsx`, `.xls`, `.xlsm`). Utilizes Apache POI `WorkbookFactory` to extract sheet names, locate header rows, and format cell values.
  - *Validation Logic:* Validates pricing boundaries ($\le 99,999,999.99$), checks email syntax against regular expressions, flags negative stock, and identifies existing database duplicates.
  - *Transactional Execution:* Implements three duplicate handling strategies (SKIP, UPDATE, ADD_STOCK) and flushes the JPA `EntityManager` every 100 rows to maintain optimal memory consumption.

#### 9. `backend-package/src/main/java/com/example/inventory/service/TransactionService.java`
- **Purpose:** Executes stock mutations, prevents duplicate processing via local transaction IDs, and triggers stock threshold evaluations.
- **Key Lines to Include in Book:** Lines 30–72 (`process()` transaction method).
- **Code Explanation:**
  - *Lines 30–33:* Inspects incoming `localTransactionId` against the transaction ledger to ensure idempotency. If already processed, returns the existing record immediately.
  - *Lines 34–44:* Retrieves the target product entity. If processing an offline transaction where the local ID is not found, dynamically maps to an available catalog item.
  - *Lines 54–65:* Adjusts product stock levels based on transaction type (`SALE`: $Q - q$; `PURCHASE`: $Q + q$).
  - *Lines 66–71:* Persists updated stock to MySQL, creates a new `InventoryTransaction` record, and calls `productService.evaluateStockChange(savedProduct, type)`.

#### 10. `frontend-package/src/context/Connectivity.jsx`
- **Purpose:** Client-side network state manager, active heartbeat prober, and bi-directional synchronization orchestrator.
- **Key Lines to Include in Book:** Lines 49–72 (`checkConnection()`) and Lines 117–198 (`sync()` synchronization engine).
- **Code Explanation:**
  - *Lines 49–72:* Probes `/products` with a 3500ms timeout. If reachable, sets `online = true` and updates local SQLite product caches.
  - *Lines 77–94:* Provides a manual offline simulation toggle for testing edge persistence workflows.
  - *Lines 117–183:* Executes automated synchronization: retrieves pending transactions from local SQLite, queries the active backend catalog, maps offline products to database IDs, and posts transactions to `/transactions`. Upon server acknowledgment, marks records as `SYNCED` locally and triggers `/alerts/process-pending`.

#### 11. `frontend-package/src/utils/sqliteStorage.js`
- **Purpose:** In-browser WebAssembly SQLite 3 engine (`sql.js`) and IndexedDB persistence wrapper.
- **Key Lines to Include in Book:** Lines 52–125 (`getSqliteDb()` initialization) and Lines 127–136 (`persistSqliteDb()` binary serialization).
- **Code Explanation:**
  - *Lines 32–46:* Configures browser IndexedDB storage (`hybrid_inventory_storage`) with object stores for `products`, `transactions`, and `sqlite_binary`.
  - *Lines 52–125:* Initializes `sql.js` WebAssembly binary. Restores existing database state from IndexedDB if present; otherwise, initializes a fresh SQLite schema defining `products`, `transactions`, and `alert_queue` tables.
  - *Lines 127–136:* Serializes the in-memory SQLite database into a binary `Uint8Array` via `db.export()` and persists it to IndexedDB, ensuring zero data loss across browser reloads.

#### 12. `frontend-package/src/pages/Forecast.jsx`
- **Purpose:** Advanced user interface for AI demand intelligence, velocity trend analysis, and replenishment planning.
- **Key Lines to Include in Book:** Lines 112–147 (`fetchForecastForId()`) and Lines 172–220 (`quickPickItems` memoized filtering).
- **Code Explanation:**
  - *Lines 112–147:* Dispatches GET requests to `/forecast/product/{id}`. If the product has insufficient sales history, captures cold-start metadata gracefully and displays baseline inventory metrics.
  - *Lines 172–220:* Categorizes products into quick-pick filter tabs (`fast`, `slow`, `low_stock`, `all`) to help operators prioritize replenishment decisions.
  - *Interactive Controls:* Features horizon selection buttons (7d, 14d, 30d, 90d), safety stock buffer sliders (0%, 15%, 30%), interactive trend charts, and direct POS purchase restocking links.

#### 13. `frontend-package/src/pages/Barcode.jsx` and `components/BarcodeScanner.jsx`
- **Purpose:** Real-time optical barcode scanning and live price checking interface.
- **Key Lines to Include in Book:** Lines 22–60 of `Barcode.jsx` (`startScanner()`).
- **Code Explanation:**
  - Instantiates `BrowserMultiFormatReader`, binding it to the webcam stream via `videoRef.current`.
  - Asynchronously decodes video frames. Upon reading a barcode pattern, extracts the numerical string, stops the camera to free hardware resources, queries `/products/barcode/{code}`, and renders the product's live stock, unit pricing, and status.

#### 14. `backend-package/schema.sql`
- **Purpose:** Relational database definition script creating tables, constraints, indexes, and seed catalog items in MySQL 8.
- **Key Lines to Include in Book:** Lines 4–97 (table definitions and B-Tree indexes).
- **Code Explanation:**
  - Defines schemas for `users`, `categories`, `suppliers`, `products`, `transactions`, `stock_alerts`, and `alert_recipient_configs`.
  - Enforces foreign key relationships (`fk_product_category`, `fk_product_supplier`, `fk_transaction_product`).
  - Creates specialized B-Tree performance indexes (`idx_transaction_date`, `idx_transaction_product`, `idx_alert_status`, `idx_alert_date`, `idx_recipient_type_target`).
  - Populates seed records for categories, suppliers, and ten essential supermarket products.

#### 15. `backend-package/src/main/resources/templates/email/low-stock-alert.html`
- **Purpose:** Responsive Thymeleaf HTML email template dispatched for low-stock and critical stockout alerts.
- **Key Lines to Include in Book:** Lines 1–80 (structural container, conditional badges, and variable bindings).
- **Code Explanation:**
  - Employs dark-themed CSS styling (`#0f172a`, `#1e293b`) optimized for desktop and mobile email clients.
  - Utilizes Thymeleaf expressions (`th:text`, `th:if`) to dynamically display product names, SKU barcodes, current quantities, threshold levels, suggested reorder amounts, and timestamps.
  - Conditionally renders red alert headers (`CRITICAL OUT OF STOCK`) for zero-stock conditions and amber warning badges for low-stock warnings.

---

## CHAPTER 5: SCREENSHOTS

This chapter provides comprehensive specifications for every screen in the application.

*(Notice regarding template headings: Screens titled **Text to Design**, **Image to Design**, **Inpainting**, and **Mask Creator** are **NOT FOUND in codebase - needs user input**. These headings originate from generative image synthesis workflows and do not exist in this inventory application. Factual documentation for each template heading is provided below, followed by complete specifications for all twelve functional screens implemented in the project).*

---

### Non-Existent Template Screens (Needs User Input)

#### Screen A: Text to Design (Generative AI Image Generation)
- **Status:** **NOT FOUND in codebase - needs user input.**
- **Capture Specification:** N/A (Feature not implemented in this inventory codebase).
- **Sample Input:** N/A (Prompt string: "Modern retail product packaging concept").
- **100-Word Explanation:** This screen does not exist in the codebase. The user's project book template includes this heading from generative image diffusion workflows. In this inventory management system, all generative capabilities are focused on predictive demand forecasting (Linear Regression) rather than image generation. If the institution requires a text-to-image design generation interface (e.g., generating marketing banners or packaging designs via Stable Diffusion), this module must be implemented as an extension using a diffusion model API. Currently, the system focuses strictly on supply chain operations.

#### Screen B: Image to Design (Image-to-Image Synthesis)
- **Status:** **NOT FOUND in codebase - needs user input.**
- **Capture Specification:** N/A (Feature not implemented in this inventory codebase).
- **Sample Input:** N/A (Source image: product sketch).
- **100-Word Explanation:** This screen does not exist in the codebase. The application is an enterprise inventory and supply chain management platform and does not contain image-to-image neural transformation pipelines or style transfer models. If required by the college project syllabus, an external generative service (such as ControlNet or Stable Diffusion img2img) would need to be integrated to accept reference product photos and output stylized catalog artwork. In the present architecture, visual processing is exclusively dedicated to optical barcode scanning and decoding via the ZXing computer vision library.

#### Screen C: Inpainting (Localized Generative Fill)
- **Status:** **NOT FOUND in codebase - needs user input.**
- **Capture Specification:** N/A (Feature not implemented in this inventory codebase).
- **Sample Input:** N/A (Defective product photo with masked replacement region).
- **100-Word Explanation:** This screen does not exist in the codebase. Inpainting algorithms rely on generative diffusion models to fill masked image regions with synthesized textures. This functionality is unrelated to inventory stock control, transaction reconciliation, and retail billing. If the evaluation committee expects an inpainting demonstration (for instance, restoring damaged packaging images in a catalog), an external neural image pipeline must be integrated. The current system manages stock data, purchase orders, email notifications, and linear regression demand forecasting without generative pixel manipulation.

#### Screen D: Mask Creator (Canvas Masking Tool)
- **Status:** **NOT FOUND in codebase - needs user input.**
- **Capture Specification:** N/A (Feature not implemented in this inventory codebase).
- **Sample Input:** N/A (Brush coordinates and mask opacity values).
- **100-Word Explanation:** This screen does not exist in the codebase. A mask creator tool provides interactive canvas brush tools for highlighting image areas intended for generative inpainting. The active repository contains no canvas brush utilities or image masking libraries. The canvas elements used in this project are strictly dedicated to rendering Chart.js demand trend lines and processing video camera frames inside the ZXing barcode scanner. Operators seeking image editing tools must utilize external software or await future multimedia expansions of the platform.

---

### Actual Functional Project Screens (Found in Codebase)

#### 1. Home Page / Executive Analytics Dashboard (`/dashboard`)
- **What to Capture:** Capture the full executive dashboard view showing the top KPI summary cards (Total Products, Total Stock Units, Low Stock Items, Today's Sales Volume), the Fast-Moving and Slow-Moving item tables with rank badges, the recent transaction audit table, and the top navigation bar displaying the online status indicator.
- **Sample Input to Use:** Load seed database containing 10+ products and execute 5 sample transactions (e.g., 3 sales of Colgate Toothpaste, 2 purchases of Tata Tea).
- **100-Word Explanation:** The Executive Dashboard provides warehouse managers and store administrators with a unified, real-time overview of inventory operations. It aggregates critical business metrics, calculating overall catalog valuation and highlighting items that have breached minimum safety stock thresholds. The fast-moving and slow-moving product tables rank items by sales velocity, allowing operators to make informed restocking and clearance decisions. Live transaction feeds display the latest customer checkouts and supplier procurements. The top bar features an interactive connection pill that indicates current network health and displays the number of queued offline transactions waiting to be synchronized with the central database.

#### 2. Product Master Catalog & Inventory Management (`/products`)
- **What to Capture:** Capture the full inventory data table displaying product columns: Barcode/SKU, Product Name, Category, Supplier, Cost Price (₹), Selling Price (₹), Stock on Hand, Minimum Stock Level, and Stock Health Badges (In Stock, Low Stock, Out of Stock). Highlight the search input bar, category filter pills, and "Add Product" button.
- **Sample Input to Use:** Search filter: `"Beverages"`, query: `"Tea"`. Open "Add Product" modal with: Barcode: `8901296010018`, Name: `Tata Tea Premium 500g`, Category: `Beverages`, Cost: `210.00`, Selling Price: `245.00`, Stock: `86`, Min: `25`.
- **100-Word Explanation:** The Product Master Catalog serves as the central administrative interface for managing merchandise records. It presents a comprehensive, searchable grid containing all stock keeping units (SKUs) registered in the system. Real-time visual status pills indicate whether a product has adequate inventory, has breached minimum safety thresholds, or is completely out of stock. The search bar supports live filtering across product names, barcode numbers, categories, and supplier names. Operators can launch modal dialogs to register new merchandise, update pricing structures, adjust minimum threshold levels, or launch the bulk CSV/Excel import wizard.

#### 3. Bulk CSV / Excel Product Import Wizard (`ProductImportModal.jsx`)
- **What to Capture:** Capture Step 2 (Column Mapping) and Step 3 (Validation Preview) of the modal wizard. Show the auto-detected column dropdowns mapping spreadsheet headers to logical database fields, the 10-row preview grid, and the duplicate resolution radio buttons (Skip, Overwrite/Update, Add to Existing Stock).
- **Sample Input to Use:** Upload sample file `products_import_template.csv` containing 25 rows with columns `item_code`, `product_title`, `buy_price`, `mrp`, `qty`, `reorder_level`. Duplicate Strategy: `UPDATE`.
- **100-Word Explanation:** The Bulk Product Import Wizard enables high-speed catalog onboarding from vendor spreadsheets, supporting CSV, XLSX, XLS, and XLSM formats. It features an intelligent alias dictionary that automatically detects and maps diverse column header variations to the system's database schema. Step 2 allows operators to review and adjust these mappings, set default minimum stock thresholds, and enable automatic barcode generation. Step 3 validates row data types, flags duplicate records, and applies chosen conflict resolution strategies. The backend processes records in transactional batches of 100, providing enterprise-grade throughput while preventing database deadlocks.

#### 4. Live Optical Barcode Scanner & Price Verifier (`/barcode`)
- **What to Capture:** Capture the live camera viewfinder feed with its scanning target box overlay, camera selection dropdown, manual barcode entry input field, and the product information card displaying scanned item details, real-time stock levels, pricing, and supplier info.
- **Sample Input to Use:** Present physical barcode or select sample barcode `8901037003128` (Colgate Toothpaste). Manual input fallback: `8901234567890`.
- **100-Word Explanation:** The Barcode Scanner interface turns commodity webcams and mobile cameras into optical barcode readers using the `@zxing/browser` computer vision library. As items pass through the camera viewfinder, video frames are decoded in real time. Upon recognizing a valid barcode symbology (such as EAN-13 or UPC-A), the scanner emits audio-visual feedback, stops video capture to conserve CPU resources, and queries the backend database. The screen immediately displays the matching product's full specifications, available stock count, pricing tiers, and replenishment status, facilitating rapid price verification and stock checks.

#### 5. Point-of-Sale (POS) Sales Register (`/sales`)
- **What to Capture:** Capture the checkout counter interface showing the product catalog grid with category filters, the searchable product selector combobox, the live shopping cart table with quantity adjusters, discount inputs, tax calculations, payment method selectors (Cash, UPI, Card), and the checkout button.
- **Sample Input to Use:** Add to Cart: 2 units of `Colgate Toothpaste` (₹110.00 each), 1 unit of `Aashirvaad Atta 5kg` (₹285.00). Customer: `Walk-in Customer`, Discount: `5%`, Payment: `Cash`.
- **100-Word Explanation:** The Point-of-Sale Sales Register is the core billing interface designed for retail cashiers. It features an intuitive multi-item shopping cart supporting rapid item additions via barcode scanning, text search, or category browsing. Line items dynamically calculate subtotals, apply percentage discounts, and compute final invoice amounts. The interface operates with sub-10ms latency: when online, transactions post directly to Spring Boot and MySQL; when offline, they are committed to local WebAssembly SQLite and IndexedDB storage with unique UUID keys, ensuring that checkout lines never stall during network outages.

#### 6. Procurement & Purchase Restocking Register (`/purchases`)
- **What to Capture:** Capture the inward stock replenishment interface showing supplier selection, invoice numbering, purchase line items with wholesale cost inputs, quantity restock counters, and the "Confirm Purchase & Update Stock" action button.
- **Sample Input to Use:** Supplier: `ABC Traders`, Invoice: `PUR-2026-089`, Product: `Amul Taaza Milk 1L`, Quantity: `50`, Unit Cost: `52.00`, Selling Price: `58.00`.
- **100-Word Explanation:** The Procurement and Purchase Register manages inward stock acquisition from wholesale distributors and manufacturers. Operators record restocking shipments by specifying supplier details, invoice references, received quantities, and unit wholesale costs. Submitting a purchase automatically increments warehouse stock levels in the database and creates an immutable audit transaction record. If a previously depleted product is restocked above its minimum threshold, the system resets its alert cooldown flag, ensuring that future stock depletions will trigger fresh low-stock email alerts.

#### 7. Synchronized Transaction Audit History (`/transactions`)
- **What to Capture:** Capture the master transaction audit ledger table showing chronological transaction entries with columns: Invoice ID / UUID, Date & Time, Product Name, Transaction Type (SALE badge in green, PURCHASE badge in blue), Quantity, Unit Price, Total Amount, and Synchronization Status pill (`SYNCED` in emerald).
- **Sample Input to Use:** Filter: `ALL`, Search: `Colgate`, showing recent mixed sale and purchase entries.
- **100-Word Explanation:** The Transaction Audit History screen provides a tamper-evident, chronological log of all stock movements across the enterprise. Every sale and purchase transaction is assigned an immutable timestamp and unique local identifier. The interface displays itemized quantities, billing rates, and total revenues. A dedicated synchronization status badge indicates whether an entry was committed directly to the central cloud database or originated offline and was reconciled during a subsequent sync cycle. Advanced filter controls allow auditors to isolate transactions by date range, transaction type, or specific product keywords.

#### 8. AI Demand Forecasting & Intelligence Center (`/forecast`)
- **What to Capture:** Capture the AI Demand Forecasting screen showing the selected product header with current stock and risk badges, the historical sales bar chart, the Ordinary Least Squares linear trend line, the forecast summary cards (Predicted Demand, Velocity Trend, Slope, $R^2$ Score, Reorder Recommendation), the forecast horizon buttons (7d, 14d, 30d, 90d), and safety buffer sliders.
- **Sample Input to Use:** Select Product: `Rice 5kg` (Sales history: `[12, 15, 14, 18, 22, 25, 28]`), Horizon: `30d`, Safety Buffer: `15%`.
- **100-Word Explanation:** The AI Demand Forecasting screen delivers predictive supply chain intelligence powered by the Scikit-Learn Python microservice and its analytical Java fallback solver. It analyzes historical sales patterns using Ordinary Least Squares regression to project upcoming demand. The dashboard visualizes sales trends through interactive Chart.js graphs, displaying mathematical trend slopes, model confidence ($R^2$), and stockout risk indicators. Based on predicted consumption and current shelf inventory, the system calculates recommended reorder quantities with customizable safety buffers, enabling warehouse managers to replenish stock proactively and prevent stockouts.

#### 9. Low-Stock Email Alert Monitoring & Dispatch (`/alerts`)
- **What to Capture:** Capture the Low-Stock Alert management view showing the summary cards (Pending Alerts, Sent Alerts, Failed Alerts, Active Cooldowns), the live SQLite offline alert queue inspector table, the SMTP Configuration modal, the manual alert trigger dropdown, and the "Simulate Offline Mode" toggle button.
- **Sample Input to Use:** Trigger alert for Product: `Colgate Toothpaste` (Stock: 9, Min: 20). Configure SMTP: Host: `smtp.gmail.com`, Port: `587`, Recipient: `store-manager@example.com`.
- **100-Word Explanation:** The Low-Stock Alert screen gives administrators complete control over inventory notification pipelines. It displays both database alerts and notifications spooled inside the embedded SQLite database (`alert_queue.db`). Administrators can configure SMTP mail server parameters, specify manager/admin email recipients, send test messages, and manually trigger threshold evaluations. The interface also features an offline simulation switch, allowing staff to verify that alerts spool properly into the local SQLite queue during network outages and dispatch automatically with exponential backoff once connectivity is restored.

#### 10. Inventory Valuation, Sales & Low-Stock Reports (`/reports`)
- **What to Capture:** Capture the Reports generation workspace showing the report type selector cards (Master Inventory Catalog, Sales Revenue Ledger, Purchases Restocking Sheet, Low Stock Threshold Sheet), the date range selectors (Today, Week, Month, Custom), and the format download buttons (CSV/Excel and PDF).
- **Sample Input to Use:** Select Report: `INVENTORY_CATALOG`, Format: `CSV_EXCEL`, Date Range: `ALL`.
- **100-Word Explanation:** The Reports screen serves as the primary business intelligence and auditing hub, allowing managers to export detailed operational data. Users can select from multiple report templates, including master inventory valuation summaries, customer sales ledgers, procurement restocking records, and low-stock hazard reports. The underlying services compile database records and generate clean, formatted exports using Apache POI for Excel spreadsheets and iText 7 for printable PDF documents. These exports include comprehensive inventory valuations, margin calculations, and stock turnover metrics for accounting and regulatory compliance.

#### 11. Role-Based User Management & Security (`/users`)
- **What to Capture:** Capture the User Management interface showing the user summary statistics cards (Total Users, Administrators, Store Managers, Cashiers/Staff), the user accounts table with role badges (ADMIN in purple, MANAGER in blue, CASHIER in green), and the "Add New User" modal dialog.
- **Sample Input to Use:** Form Input: Username: `cashier_priya`, Name: `Priya Patel`, Email: `priya.pos@example.com`, Password: `••••••••`, Role: `CASHIER`.
- **100-Word Explanation:** The User Management interface enforces Role-Based Access Control (RBAC) across the organization. System administrators can create, update, and deactivate staff accounts, assigning roles such as Administrator, Store Manager, Cashier, or Inventory Auditor. Each role governs access to specific features: cashiers are limited to POS checkout and barcode scanning, store managers oversee catalog updates and alert routing, and administrators maintain system-wide configuration privileges. User passwords are encrypted using one-way BCrypt hashing before database persistence, preventing unauthorized credential access and ensuring compliance with enterprise security standards.

#### 12. Distributed System Architecture & Health Monitor (`/architecture`)
- **What to Capture:** Capture the interactive System Architecture visualizer showing the live node cards (Client & POS Edge Layer, Enterprise Core Backend, AI Demand Microservice, Primary MySQL Database, Embedded SQLite Queue, SMTP Bridge). Include live latency badges, port assignments, and the "Run Diagnostic Ping Test" button.
- **Sample Input to Use:** Click "Test Services Connectivity", showing green health status badges across Port 5173, Port 8080 (12ms), Port 5000 (18ms), and Port 3306 (5ms).
- **100-Word Explanation:** The System Architecture and Health Monitor provides an interactive diagnostic dashboard illustrating the physical and logical structure of the platform. It visualizes data flow between the React edge client, Spring Boot backend, Python AI microservice, MySQL relational database, and embedded SQLite alert queue. Built-in diagnostic tools allow administrators to ping each microservice and database connection pool in real time, displaying round-trip latencies, service versions, and network health. This diagnostic visibility simplifies system administration and accelerates troubleshooting in distributed production environments.

---

## CHAPTER 6: CONCLUSION

### 6.1 Conclusion
The **AI-Powered Hybrid Inventory Management System** successfully addresses the critical operational vulnerabilities of traditional retail and warehouse inventory software. By combining an offline-first client architecture with an enterprise-grade backend and predictive machine learning, the project delivers a resilient, high-performance platform capable of operating under challenging real-world conditions.

Key achievements and technical outcomes of the project include:
1. **Zero Point-of-Sale Downtime:** By embedding a WebAssembly-compiled SQLite 3 engine (`sql.js`) and IndexedDB directly into the browser client, POS sales, purchases, and barcode queries execute with sub-10ms latencies, completely immune to local network outages.
2. **Automated Bi-Directional Synchronization:** The system reliably reconciles pending offline transactions upon network restoration, mapping local transaction UUIDs, updating central MySQL records, and preserving ACID transactional integrity.
3. **Integrated Predictive Intelligence with High Availability:** The Python microservice applies Scikit-Learn Ordinary Least Squares regression to transaction sequences to forecast demand, classify velocity trends, and calculate optimal replenishment points. The internal mathematical Java fallback guarantees uninterrupted analytical output even if the Python service is offline.
4. **Decoupled, Resilient Alert Spooling:** The event-driven notification engine dispatches low-stock alerts without blocking checkout operations. Incorporating a 24-hour suppression cooldown, automatic restock reset flags, and an embedded SQLite outbox queue ensures that critical alerts are never lost during mail server or network downtime.
5. **Universal Optical Barcode Scanning:** Integrating `@zxing/browser` enables touchless, driver-free barcode capture from commodity webcams and phone cameras, lowering hardware costs for small and medium retail businesses.
6. **Flexible Data Ingestion:** The bulk import engine's alias dictionary automatically maps vendor spreadsheets with non-standard column headers, validating records and persisting data in high-throughput transactional batches.

In summary, the project demonstrates that modern web standards (WebAssembly, IndexedDB, WebRTC) combined with established enterprise patterns (Spring Boot, domain events, outbox queues) and machine learning can deliver a commercial-grade, fault-tolerant inventory management system suitable for real-world deployment.

### 6.2 Future Enhancements
To build upon the foundation established in this project, the following ten enhancements represent realistic, high-impact avenues for future development:

1. **Multi-Model Deep Learning Demand Forecasting:** Supplement the current Ordinary Least Squares regression engine with advanced deep learning time-series architectures, such as Long Short-Term Memory (LSTM) networks, Temporal Fusion Transformers (TFT), or Meta's Prophet algorithm, to capture complex seasonal patterns, holiday spikes, and promotional elasticity.
2. **Progressive Web App (PWA) with Service Workers:** Wrap the React/Vite client in a standards-compliant Progressive Web App manifest supported by background Service Workers, enabling full offline asset caching and home-screen installation on mobile Android and iOS devices.
3. **Multi-Store and Multi-Warehouse Distributed Topology:** Expand the database schema and synchronization protocol to support multi-tenant, multi-store retail chains, allowing inter-warehouse stock transfers, centralized purchasing, and regional stockout balancing.
4. **Hardware RFID and Bluetooth Low Energy (BLE) Integration:** Extend the optical barcode scanning module to support UHF RFID readers and BLE asset beacons, enabling automated, non-line-of-sight inventory audits of entire warehouse shelves in seconds.
5. **Automated Supplier Purchase Order Dispatch via EDI / Webhooks:** Enhance the reordering engine to generate and transmit purchase orders automatically to vendor systems via Electronic Data Interchange (EDI ANSI X12) or signed JSON webhooks when stock breaches minimum thresholds.
6. **Optical Character Recognition (OCR) for Invoice Ingestion:** Integrate a computer vision OCR engine (such as Tesseract or AWS Textract) to extract line items, quantities, and prices directly from printed paper supplier invoices, automating inward stock registration.
7. **End-to-End Cryptographic Ledger for Audit Trails:** Implement cryptographic hashing across the transaction ledger (chaining block hashes of prior transactions) to guarantee tamper-proof audit trails for high-value merchandise and regulatory compliance.
8. **Automated Dynamic Pricing and Markdown Optimization:** Develop an economic optimization module that adjusts retail prices dynamically based on shelf life, current stock velocity, and holding costs, maximizing profit margins and accelerating clearance of slow-moving goods.
9. **Native Push Notifications and SMS Alert Gateways:** Broaden the notification service beyond SMTP email by integrating SMS gateways (e.g., Twilio) and Web Push notifications, delivering instant out-of-stock alerts directly to store managers' mobile devices.
10. **Generative AI Marketing and Catalog Mockup Synthesis:** Implement a dedicated generative image module using Stable Diffusion to create professional promotional graphics and catalog mockups for newly added products, addressing the generative design concepts outlined in the college syllabus template.

---

## CHAPTER 7: REFERENCES

1. R. J. Hyndman and G. Athanasopoulos, *Forecasting: Principles and Practice*, 2nd ed. Melbourne, Australia: OTexts, 2018.
2. M. Kleppmann, *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. Sebastopol, CA: O'Reilly Media, 2017.
3. C. Richardson, *Microservices Patterns: With examples in Java*. Shelter Island, NY: Manning Publications, 2018.
4. M. T. Nygard, *Release It!: Design and Deploy Production-Ready Software*, 2nd ed. Raleigh, NC: Pragmatic Bookshelf, 2018.
5. C. Bauer, G. King, and G. Gregory, *Java Persistence with Hibernate*, 2nd ed. Shelter Island, NY: Manning Publications, 2015.
6. A. Silberschatz, H. F. Korth, and S. Sudarshan, *Database System Concepts*, 7th ed. New York, NY: McGraw-Hill, 2020.
7. M. Satyanarayanan, "The Emergence of Edge Computing," *IEEE Computer*, vol. 50, no. 1, pp. 30–39, Jan. 2017.
8. G. Sörös and C. Flörkemeier, "Towards background-subtraction-based barcode localization for mobile devices," in *Proc. 2013 ACM Conf. Pervasive and Ubiquitous Computing Adjunct (UbiComp '13)*, Zurich, Switzerland, 2013, pp. 491–500.
9. F. Pedregosa *et al.*, "Scikit-learn: Machine Learning in Python," *Journal of Machine Learning Research (JMLR)*, vol. 12, pp. 2825–2830, 2011.
10. C. R. Harris *et al.*, "Array programming with NumPy," *Nature*, vol. 585, no. 7825, pp. 357–362, Sep. 2020.
11. E. Gamma, R. Helm, R. Johnson, and J. Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*. Reading, MA: Addison-Wesley, 1994.
12. J. Walls, *Spring in Action*, 6th ed. Shelter Island, NY: Manning Publications, 2022.
13. S. Tilkov and S. Vinoski, "Node.js: Using JavaScript to Build High-Performance Network Programs," *IEEE Internet Computing*, vol. 14, no. 6, pp. 80–83, Nov./Dec. 2010.
14. A. Banks and K. Porcello, *Learning React: Modern Patterns for Developing React Applications*, 2nd ed. Sebastopol, CA: O'Reilly Media, 2020.
15. J. Ho, A. Jain, and P. Abbeel, "Denoising Diffusion Probabilistic Models," in *Advances in Neural Information Processing Systems (NeurIPS 2020)*, vol. 33, 2020, pp. 6840–6851. [VERIFY]
16. E. J. Hu *et al.*, "LoRA: Low-Rank Adaptation of Large Language Models," in *Proc. Int. Conf. Learn. Representations (ICLR)*, 2022. [VERIFY]
17. Apache Software Foundation, "Apache POI - the Java API for Microsoft Documents," Apache Software Foundation, 2024. [Online]. Available: https://poi.apache.org/
18. iText Group, "iText 7 Core: The leading PDF library for Java and .NET," iText Software, 2024. [Online]. Available: https://itextpdf.com/
19. ZXing Authors, "ZXing ('Zebra Crossing') Barcode Scanning Project," 2024. [Online]. Available: https://github.com/zxing/zxing
20. SQLite Consortium, "SQLite: Small. Fast. Reliable. Choose any three," 2024. [Online]. Available: https://www.sqlite.org/
