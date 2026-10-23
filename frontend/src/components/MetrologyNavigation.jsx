import React from 'react';
import { NavLink } from 'react-router-dom';
import useStore from '../store';

export default function MetrologyNavigation() {
  const permissions = useStore(state => state.permissions) || [];
  const links = [
    ['view_metrology_cases', '/metrology-cases', 'Zahtjevi i predmeti', 'Zahtjev, mjerila, mjerenja i dokumenti'],
    ['view_metrology_center', '/metrology', 'Pregledi opreme i rokovi', 'Pojedinačni pregledi, kalibracije i rokovi'],
  ].filter(([permission]) => permissions.includes(permission));
  return <nav aria-label="Mjeriteljski centar" className="mb-6 grid gap-3 sm:grid-cols-2">
    {links.map(([,path,title,description]) => <NavLink key={path} to={path} end className={({isActive}) => 'rounded-2xl border p-4 ' + (isActive ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300')}>
      <span className="block font-bold text-slate-900">{title}</span><span className="mt-1 block text-sm text-slate-500">{description}</span>
    </NavLink>)}
  </nav>;
}
