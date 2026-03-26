import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import VendorApp from './VendorApp';
import './index.css';

const rootEl = document.getElementById('root')!;
const path = window.location.pathname || '';

createRoot(rootEl).render(path.startsWith('/vendor') ? <VendorApp /> : <App />);
