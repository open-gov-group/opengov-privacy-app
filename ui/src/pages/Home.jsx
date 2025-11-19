import React from 'react';
import { Link } from 'react-router-dom';
const { search } = useLocation();
const params = new URLSearchParams(search);
const orgId = params.get('org') || 'demo-org';
const bundleId = params.get('bundle') || 'bundle-1';

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">OpenGov Privacy – RoPA & OSCAL</h1>
      <p className="text-gray-700">
        Willkommen! Hier verwaltest du das Verzeichnis der Verarbeitungstätigkeiten (RoPA) und pflegst die
        einzelnen System Security Plans (SSP) in OSCAL – inkl. Profile, Kataloge und Evidences.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/ropa" className="rounded-lg border bg-white p-4 hover:shadow">
          <h2 className="font-semibold">RoPA – Verzeichnis</h2>
          <p className="text-sm text-gray-600">
            Struktur aus Aktenplan/BPMN laden, Verfahren anlegen, Metadaten pflegen.
          </p>
        </Link>
        <Link to="/ssp" className="rounded-lg border bg-white p-4 hover:shadow">
          <h2 className="font-semibold">SSP – Verfahren</h2>
          <p className="text-sm text-gray-600">
            Ein Verfahren detailliert bearbeiten (Kontrollen, Komponenten, Evidences).
          </p>
        </Link>
      </div>
    </div>
  );
}
