// ui/src/main.jsx
import './index.css';        // global/Tailwind zuerst
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx'; // dann App

// createRoot(document.getElementById('root')).render(<App />);

const root = createRoot(document.getElementById("root"));
root.render(<App />);
