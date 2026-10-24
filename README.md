# Shiv Shakti Tiles - Billing & Session Management System (Source Code Showcase)

This repository is a **public source code showcase** for the production-ready billing web application developed for **Shiv Shakti Tiles**. 

> **Security & Privacy Notice:** All production credentials, environment variables (`.env`), API keys, and sensitive business data have been sanitized in this showcase repository. Live production hosting is decoupled and managed securely via the maintainer's primary deployment pipeline.

---

## 🌟 Key Features

- **Full-Stack Billing Architecture**: Serves dynamic web assets and handles automated business billing calculations.
- **60-Minute Session Expiry**: Automatically terminates inactive user sessions after 60 minutes to protect application state and prevent stale logins.
- **4-User Concurrency Control**: Built-in concurrency manager that restricts active sessions to a maximum of 4 users to optimize cloud server resources.
- **Automated CI/CD Deployment**: Integrated with Render Web Services for continuous zero-downtime deployments from the main source.
- **Cloud Database Integration**: Connected to MongoDB Atlas cluster for scalable and persistent data storage.

---

## 🔒 Architecture & Security Isolation

- **Production Environment**: The live application is hosted on **Render** via the primary developer pipeline with encrypted environment variables.
- **Database Access**: Production MongoDB Atlas connection strings are injected dynamically using `process.env.MONGO_URI` and are strictly excluded from public version control.
- **Showcase Repository**: This mirror is intended for technical review, code demonstration, and resume/portfolio evaluation.

---

## ⚙️ Tech Stack & Dependencies

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Cloud NoSQL / Mongoose ODM)
- **Deployment & Hosting**: Render Web Services, GitHub
