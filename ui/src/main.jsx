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
        { path: '/', element: <Home  /> },
        { path: '/tenant', element: <TenantSetup /> },
        { path: '/tenant', element: <RopaDirectory  /> },
        { path: '/tenant', element: <SspEditor /> }
      ]
    }
  ],
  { basename: '/opengov-privacy-app' } // matches your Vite base
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
