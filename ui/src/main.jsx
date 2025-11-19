import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout.jsx'
import App from './App.jsx';
import TenantSetup from './pages/TenantSetup.jsx';
import './index.css';

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <App /> },
        { path: '/tenant', element: <TenantSetup /> },
      ]
    }
  ],
  { basename: '/opengov-privacy-app' } // matches your Vite base
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
