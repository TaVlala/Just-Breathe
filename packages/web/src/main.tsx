import React from 'react';
import ReactDOM from 'react-dom/client';
import { Visualizer } from './presentation/components/Visualizer';
import './presentation/App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Visualizer />
  </React.StrictMode>
);
