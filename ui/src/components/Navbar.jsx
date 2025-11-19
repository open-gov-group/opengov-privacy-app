import React from 'react';
import { NavLink } from 'react-router-dom';

const linkBase =
  'px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition';

const active =
  'text-blue-700 bg-blue-50';
const inactive =
  'text-gray-700';

export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">DP</span>
          <span className="text-lg font-semibold">OpenGov Privacy</span>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/tenant"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            Tenant
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
