# CLO Management System

The **CLO Management System** is a role-based web application built to digitize and streamline the process of defining, evaluating, and analyzing Course Learning Outcomes (CLOs). Developed as part of an internship project at Thapar Institute of Engineering and Technology (TIET), this system improves the efficiency and accuracy of academic performance tracking for educational institutions.

---

## 📌 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Roles and Access](#-roles-and-access)
- [Use Cases](#-use-cases)
- [License](#-license)
- [Author](#-author)
- [Disclaimer](#-disclaimer)

---

## 🔧 Tech Stack

- **Frontend:** React.js, Vite, Material-UI, React-CSV
- **State Management:** React Hooks
- **Version Control:** Git & GitHub

---

## 🚀 Features

- 🔐 Role-based login (Admin, Course Coordinator, Instructor)
- 📄 Define and manage Course Learning Outcomes
- 📊 Upload and manage student marks
- ⚙️ Automatic CLO attainment calculation
- 📈 Real-time data visualization of performance
- 📤 Export reports in CSV format

---

## 🖼️ Screenshots & Diagrams

### 🗺️ ER Diagram for Efficient Task Workflow  
Visualizes entities (Users, Courses, CLOs, Assessments) and their relations.  
![ER Diagram](Screenshots/er-diagram-1.jpg)

### 🔐 Login & Authentication Interface  
Simple, secure login with role selection and JWT handling.  
![Login Interface](Screenshots/login-page-2.jpg)

### 🛠️ Admin Dashboard  
Global view to manage users, courses, and department analytics.  
![Admin Dashboard](Screenshots/admin-dashboard-3.jpg)

### 🗂️ Course Coordinator Dashboard  
Defines CLOs, maps them to assessments, and assigns instructors.  
![Course Coordinator Dashboard](Screenshots/cc-dashboard-4.jpg)

### 📝 Forms for CLO Definition & Marks Upload  
CSV upload, inline editing, and validation for quick data entry.  
![CLO Definition](Screenshots/clo-def-5.jpg)



---

## 📁 Project Structure

CLO-Management-System/
│
├── public/ # Static assets
├── src/
│ ├── assets/ # Images, icons
│ ├── components/ # Reusable UI components
│ ├── pages/ # Route-based views
│ ├── services/ # API service functions
│ ├── App.jsx # Root component
│ └── main.jsx # Entry point
├── .gitignore
├── package.json
└── vite.config.js


---

✅ Prerequisites
Ensure the following tools are installed:

Node.js (v16 or above recommended): Download Node.js

Git (for cloning the repository): Download Git

A modern browser (e.g., Chrome)

## 🖥️ Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/harshitstark13/CLO-Management-System.git
cd CLO-Management-System


2. Install Dependencies
npm install

3. Run the Development Server
npm run dev
```

| Role               | Permissions                                          |
| ------------------ | ---------------------------------------------------- |
| Admin              | View and manage all modules, assign roles            |
| Course Coordinator | Define CLOs, assign instructors, monitor performance |
| Instructor         | Enter student marks, view attainment data            |


📌 Use Cases
Replace manual CLO tracking with an automated digital system

Improve academic monitoring and reporting

Export performance data for internal reviews and audits

Provide educators with insights for improving learning outcomes


⚠️ Disclaimer
This project was developed as part of an internship at TIET under mentorship.
It is strictly prohibited to use, copy, modify, distribute, or deploy this software without prior written permission from the developer and the mentors involved.
All rights are reserved.
