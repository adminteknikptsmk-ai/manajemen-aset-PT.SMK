import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LoginPage } from './LoginPage.tsx';
import { AuthProvider, useAuth } from './firebase/AuthContext.tsx';
import './index.css';

const MainApp = () => {
  const { user } = useAuth();
  return user ? <App /> : <LoginPage />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  </StrictMode>,
);

