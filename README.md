# Shiv Shakti Tiles - Billing & Session Management System

A production-ready full-stack billing web application designed for fast record management, automated deployment, and robust concurrency control.

---

## 🌟 Key Features

- **Full-Stack Billing Application**: Serves dynamic frontend assets and manages business billing logic.
- **10s Heartbeat & 30s Sweeper Architecture**: Prevents locked-out user slots. Client sends pings every 10 seconds; if a user closes a browser tab abruptly using 'X', the server drops ghost sessions within 30 seconds.
- **Concurrency Control**: Enforces strict user limits (max 4 concurrent users) to maintain system performance and security.
- **Automated CI/CD Pipeline**: Integrated GitHub repository with Render for zero-downtime auto-deployment on every push to `main`.
- **Cloud Database Persistence**: Secure connection with MongoDB Atlas for persistent storage of bill data, logs, and authentication states.

---

## 🏗️ System Architecture Flow

1. **Development & Push**: Code updates are committed locally and pushed to **GitHub**.
2. **Auto Deployment**: GitHub triggers a webhook to **Render**, which builds and hosts the Web Service.
3. **Database Connection**: Render backend connects securely to **MongoDB Atlas** using encrypted Mongoose connection strings.
4. **Session Guard**: Browser client maintains active pings every 10s. Render background sweeper prunes any inactive sessions after 30s.

---

## ⚙️ Tech Stack & Services

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (Cloud NoSQL)
- **Deployment**: Render Web Services
- **CI/CD & Version Control**: GitHub
