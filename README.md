# Shiv Shakti Tiles - Billing & Session Management System

A production-ready full-stack billing web application designed for fast record management, automated deployment, and robust concurrency control.

---

## 🌟 Key Features

- **Full-Stack Billing Application**: Serves dynamic frontend assets and manages business billing logic.
- **60-Minute Session Expiry**: Automatically expires active user sessions after 60 minutes to ensure system security and prevent idle session lockouts.
- **4-User Concurrency & Rate Limiting**: Enforces a strict rate limit of maximum 4 active users simultaneously to prevent server overload and maintain application performance.
- **Automated CI/CD Pipeline**: Integrated GitHub repository with Render for zero-downtime auto-deployment on every push to `main`.
- **Cloud Database Persistence**: Secure connection with MongoDB Atlas for persistent storage of bill data, logs, and authentication states.

---

## 🏗️ System Architecture Flow

1. **Development & Push**: Code updates are committed locally and pushed to **GitHub**.
2. **Auto Deployment**: GitHub triggers a webhook to **Render**, which builds and hosts the Web Service.
3. **Database Connection**: Render backend connects securely to **MongoDB Atlas** using encrypted connection strings.
4. **Session & Rate Control**: Active sessions expire automatically after 60 minutes, while rate limiting restricts system access to 4 concurrent users at a time.

---

## ⚙️ Tech Stack & Services

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Cloud NoSQL)
- **Deployment**: Render Web Services
- **CI/CD & Version Control**: GitHub
