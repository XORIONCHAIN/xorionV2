# React Frontend Project

A modern React-based frontend application with a clean, responsive design and intuitive user interface.

---

## 📦 Download & Setup

### Step 1: Download the Project
1. Download the project ZIP file from the provided Google Drive link
2. Extract/unzip the file to your desired location on your computer
3. Navigate to the extracted folder

### Step 2: Prerequisites
Make sure you have the following installed on your system:
- **Node.js** (version 16.0 or higher) - [Download here](https://nodejs.org)
- **npm** (comes with Node.js) or **yarn** as package manager

To verify your installation, run:
```bash
node --version
npm --version
```

---

## 🛠 Installation

Open a terminal/command prompt in the project root directory and install dependencies:

```bash
npm install
```

**Alternative with Yarn:**
```bash
yarn install
```

This command will install all the necessary packages listed in `package.json`.

---

## 🚀 Running the Project

### Development Mode
Start the development server:

```bash
npm run dev
```

**Or with standard React scripts:**
```bash
npm start
```

**With Yarn:**
```bash
yarn dev
# or
yarn start
```

The application will automatically open in your browser at:
- **Local:** http://localhost:3000
- **Network:** http://[your-ip]:3000

The page will reload automatically when you make changes to the code.

### Production Build
To create an optimized production build:

```bash
npm run build
```

This creates a `build` folder with optimized static files ready for deployment.

---

## 📁 Project Structure

```
my-project/
│
├── public/                 # Static assets
│   ├── index.html         # Main HTML template
│   ├── favicon.ico        # Site icon
│   └── manifest.json      # Web app manifest
│
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   │   ├── Header/
│   │   ├── Footer/
│   │   └── Common/
│   │
│   ├── pages/            # Main application pages
│   │   ├── Home/
│   │   ├── About/
│   │   └── Contact/
│   │
│   ├── styles/           # CSS/SCSS files
│   ├── utils/            # Helper functions
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   │
│   ├── App.js            # Main App component
│   ├── App.css           # Global styles
│   └── index.js          # Entry point
│
├── package.json          # Dependencies & scripts
├── package-lock.json     # Locked dependency versions
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

---

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory for environment-specific variables:

```env
VITE_POLKADOT_ENDPOINTS=wss://rpc.polkadot.io,wss://polkadot.api.onfinality.io/public-ws,wss://polkadot-rpc.dwellir.com

```

**Note:** Environment variables must be prefixed with `REACT_APP_` to be accessible in React.

### Available Scripts
- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (irreversible)

---

## 🚨 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3000
npx kill-port 3000
# Or specify different port
PORT=3001 npm start
```

**Node modules issues:**
```bash
# Clear npm cache
npm cache clean --force
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Permission errors (macOS/Linux):**
```bash
sudo npm install -g npm@latest
```

### Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---
