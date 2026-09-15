import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {chanLanChuotDoiSo} from './lib/chanLanChuot.ts';
import './index.css';

// Lăn chuột trên ô số lượng không được làm đổi con số. Xem `chanLanChuot.ts`.
chanLanChuotDoiSo();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
