# AutoCross-Edu 🎓🧩

**AutoCross-Edu** is an advanced AI-powered educational assessment system designed to transform learning materials into interactive crossword puzzles. It bridges the gap between traditional study materials and engaging gamified learning.

![AutoCross-Edu Banner](https://placehold.co/1200x400/020617/ffffff?text=AutoCross-Edu)

## 🚀 Key Features

*   **AI-Driven Generation**:  Utilizes Google's Gemini AI to analyze educational content (PDFs, DOCX, Text) and automatically generate relevant crossword puzzles.
*   **Dual Interface**:
    *   **Faculty Hub**: Teachers can upload study materials, review generated puzzles, and manage assessments.
    *   **Student Portal**: A dedicated, interactive interface for students to solve puzzles with real-time feedback.
*   **Smart Parsing**:  Supports multiple file formats including `.pdf`, `.docx`, and `.txt` to extract key concepts and definitions.
*   **Modern UI/UX**: Built with a "dark mode first" aesthetic using polished Tailwind CSS components, glassmorphism effects, and smooth animations.
*   **Dashboard Analytics**: (Planned/In-progress) Overview of created assessments for faculty members.

## 🛠️ Tech Stack

*   **Frontend Framework**: [React 19](https://react.dev/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`@google/generative-ai`)
*   **Routing**: [React Router](https://reactrouter.com/)
*   **File Processing**:
    *   `pdfjs-dist` (PDF parsing)
    *   `mammoth` (DOCX parsing)
    *   `jszip` (Zip handling)

## 📋 Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **npm** or **yarn**
*   A **Google Gemini API Key** (Get one [here](https://aistudio.google.com/app/apikey))

## ⚡ Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/autocross-edu.git
    cd autocross-edu
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    *   Create a `.env` file in the root directory (or copy `.env.example`).
    *   Add your Gemini API key:
        ```env
        VITE_GEMINI_API_KEY=your_actual_api_key_here
        ```
    > **Note:** Ensure logic uses `import.meta.env.VITE_GEMINI_API_KEY` to access the key in Vite.

4.  **Run the application**
    ```bash
    npm run dev
    ```
    Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## 📖 Usage Guide

### For Faculty (Creating Assessments)
1.  Navigate to **"Create Assessment"**.
2.  Upload a lecture note (PDF/DOCX) or paste text content.
3.  Configure difficulty and number of words.
4.  Click **"Generate"** to let the AI build the crossword.
5.  Review and save the assessment.

### For Students (Solving)
1.  Open the provided shared link (e.g., `#/solve/123`).
2.  Select a word on the grid to see the clue.
3.  Type your answer. The system provides immediate visual feedback.
4.  Complete the puzzle to finish the assessment!

## 📂 Project Structure

```
cross-words/
├── src/
│   ├── pages/            # Page components (Home, FacultyCreate, StudentSolve, etc.)
│   ├── geminiService.ts  # Logic for interacting with Google Gemini API
│   ├── fileParser.ts     # Utilities for reading PDF/DOCX files
│   ├── db.ts             # Local database/state management (mock/IndexedDB)
│   ├── App.tsx           # Main application component & routing
│   └── index.css         # Tailwind global styles
├── public/               # Static assets
└── package.json          # Project dependencies and scripts
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
