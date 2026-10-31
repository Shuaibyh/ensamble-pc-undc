import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './features/laptop/laptop.css';
import './styles/refinement.css';
import './styles/pcJourney.css';
import './styles/simulators.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
