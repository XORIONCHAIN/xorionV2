import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@polkadot/api-augment';

// APP ENTRY POINT
createRoot(document.getElementById("root")!).render(<App />);
