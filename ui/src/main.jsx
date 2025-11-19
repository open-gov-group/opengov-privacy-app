import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import TenantSetup from './pages/TenantSetup.jsx';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/tenant', element: <TenantSetup /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
