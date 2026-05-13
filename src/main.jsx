import React from 'react';
import ReactDOM from 'react-dom/client';
import CheckMyData from './App.jsx';
import { storage } from './storage.js';

// Restore the window.storage surface that ImportView + App's pin-file
// handlers depend on. Pre-S146 the codebase carried the Anthropic
// Artifacts global as a dangling reference; five sites threw TypeError
// silently caught by console.warn. See SESSION145-AUDIT-SUMMARY.md.
window.storage = storage;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CheckMyData />
  </React.StrictMode>
);
