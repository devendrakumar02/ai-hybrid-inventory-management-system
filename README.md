<div align="center">

# 📦 AI-Powered Hybrid Inventory Management System

**An offline-first inventory and point-of-sale platform that keeps your store running without internet, forecasts demand with machine learning, and alerts you before stock runs out.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17-007396?logo=openjdk&logoColor=white)](#)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?logo=springboot&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blueviolet)](#-contributing)

</div>

---

## 📑 Table of Contents

- [About](#-about)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 About

The **AI-Powered Hybrid Offline Inventory Management System** is designed for small and medium businesses that cannot afford downtime when the internet fails. Sales and stock updates are saved locally and synchronised automatically with the central database once connectivity returns. A built-in machine-learning service analyses sales history to predict demand, and an automated alert pipeline notifies managers by email when stock runs low.

---

## ✨ Key Features

- 🔌 **Seamless offline-to-online sync:** keep billing and updating stock with no connection; queued transactions are pushed to the server automatically when the network returns, without duplicates.
- 🤖 **AI-based demand forecasting:** a Linear Regression model (Scikit-learn) analyses historical sales to predict future demand and suggest reorder quantities.
- 📷 **Barcode checkout:** scan products with a webcam or phone camera using ZXing to add items to the cart instantly.
- 📧 **Automated low-stock email alerts:** SMTP notifications are sent to the responsible users when stock falls below the minimum level; alerts raised offline are delivered once connectivity is restored.
- 📊 **Inventory dashboard:** real-time view of stock levels, sales and transactions.
- 🔐 **Secure access:** authenticated backend with role-based access.

---

## 🧰 Tech Stack

| Category | Technologies |
| --- | --- |
| **Frontend** | React.js, HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Spring Boot, Java 17, Maven |
| **Databases** | MySQL (primary database), SQLite (offline database) |
| **Machine Learning** | Python, Scikit-learn (Linear Regression) |
| **Barcode Scanning** | ZXing |
| **Notifications** | SMTP (email alerts) |

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### 📋 Prerequisites

Make sure you have the following installed:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 18+ and npm
- [JDK 17](https://adoptium.net/) and [Maven](https://maven.apache.org/) 3.8+
- [MySQL](https://dev.mysql.com/downloads/) 8+
- [Python](https://www.python.org/downloads/) 3.9+ and pip

### 1️⃣ Clone the repository

```bash
git clone [https://github.com/devendrakumar02/ai-hybrid-inventory-management-system.git](https://github.com/devendrakumar02/ai-hybrid-inventory-management-system.git)
cd ai-hybrid-inventory-management-system
