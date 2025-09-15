# Focus Guard Proctoring Frontend

This is the frontend for the Focus Guard Proctoring project, built with React, TypeScript, and Vite.

## 🚀 Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/YogeshSinghChilwal/Focus-Object-Detection-in-Video-Interviews.git
   ```
   ```sh
   cd focus-guard-proctoring-frontend
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

## 🛠️ Usage

### Development

To start the development server with hot reloading:
```sh
npm run dev
```
The app will be available at [http://localhost:5173](http://localhost:5173) by default.

### Production Build

To build the app for production:
```sh
npm run build
```

To preview the production build locally:
```sh
npm run preview
```

## 🧹 Linting

To run ESLint:
```sh
npm run lint
```

## 📁 Project Structure
```
focus-guard-proctoring-frontend
    ├── .gitignore
    ├── README.md
    ├── components.json
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── pnpm-lock.yaml
    ├── public
        └── favicon.ico
    ├── src
        ├── App.tsx
        ├── assets
        │   ├── logo.png
        │   └── videos
        │   │   ├── demo.mp4
        │   │   ├── v1.mp4
        │   │   ├── v2.mp4
        │   │   └── v3.mp4
        ├── components
        │   ├── CandidateVideo.tsx
        │   ├── Dashboard.tsx
        │   ├── Demo.tsx
        │   ├── DetectionLogs.tsx
        │   ├── DetectionOverlay.tsx
        │   ├── HomePage.tsx
        │   ├── LiveCandidateVideo.tsx
        │   ├── LoadingSpinner.tsx
        │   ├── Navbar.tsx
        │   ├── UploadCandidateVideo.tsx
        │   ├── VideoPlayer.tsx
        │   ├── WebcamPlayer.tsx
        │   └── ui
        │   │   ├── button.tsx
        │   │   ├── scroll-area.tsx
        │   │   ├── select.tsx
        │   │   └── tabs.tsx
        ├── hooks
        │   └── useObjectDetection.ts
        ├── index.css
        ├── lib
        │   └── utils.ts
        ├── main.tsx
        ├── types
        │   ├── detection.ts
        │   └── index.ts
        ├── utils
        │   └── contents.ts
        └── vite-env.d.ts
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── vite.config.ts
```
## 📦 Dependencies

- React
- React Router DOM
- Tailwind CSS
- TensorFlow.js
- Radix UI

---

For backend setup and more details, see the main [README](../README.md).