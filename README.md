# <p align="center">🚀 DSOFT Portal - Modern Learning Management System</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-6-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-2.1-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Daily.co-Video-FF4F00?style=for-the-badge&logo=dailydotco" alt="Daily.co" />
</p>

---

## 🌟 Overview

**DSOFT Portal** is a cutting-edge, high-performance Student Management and Learning Portal. Built with **React 19**, **Vite**, and **Supabase**, it delivers a seamless experience for administrators, teachers, and students. Featuring cinematic design, smooth animations with **Framer Motion**, and real-time collaboration via **Daily.co**.

---

## ✨ Key Features

- **📺 Live Lectures**: Integrated high-quality video conferencing via Daily.co with lobby and breakout rooms.
- **📊 Batch Management**: Effortlessly organize student cohorts, schedules, and course assignments.
- **📝 Assignment Engine**: Centralized hub for submitting, reviewing, and grading assignments.
- **📚 Knowledge Base**: Structured repository for notes, resources, and educational materials.
- **⚡ Real-time Updates**: Powered by Supabase real-time subscriptions for instant notifications.
- **📱 PWA Ready**: Install as a native app on mobile or desktop for an offline-capable experience.
- **🎨 Cinematic UI**: A premium, "Apple-level" aesthetic with dark mode support and micro-interactions.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Hooks, Suspense)
- **State Management**: Jotai (Atomic state)
- **Routing**: React Router 7
- **Styling**: Tailwind CSS & Modern CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend & Infrastructure
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Serverless**: Supabase Edge Functions
- **Video API**: Daily.co
- **Deployment**: Vite (Optimized production build)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm / pnpm / yarn
- Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ParthMozarkar/Dsoft-Portal.git
   cd Dsoft-Portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root and add your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_DAILY_API_KEY=your_daily_api_key
   ```

4. **Launch Development Server**
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```text
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── pages/          # Full page layouts
├── services/       # API and Supabase clients
├── store/          # Jotai atom definitions
└── types/          # TypeScript interfaces
supabase/
├── functions/      # Edge Functions (e.g., Daily room creation)
└── migrations/     # Database schema and RLS policies
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<p align="center">Made with ❤️ for modern education</p>
