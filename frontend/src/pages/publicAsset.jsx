import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaGasPump, FaTools } from "react-icons/fa";
import { getPublicAsset } from "../services/maintenanceServices.js";

const PublicAsset = () => {
  const { token } = useParams();
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await getPublicAsset(token);
      setAsset(response.data);
    } catch {
      setError("Oprema nije pronađena ili QR oznaka više nije aktivna.");
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="min-h-screen bg-slate-100 p-8 text-center text-slate-600">{error}</div>;
  if (!asset) return <div className="min-h-screen bg-slate-100 p-8 text-center text-slate-500">Učitavanje opreme…</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xl"><FaTools /></div>
          <div className="mt-4 text-sm font-semibold uppercase tracking-widest text-indigo-200">{asset.client_name}</div>
          <h1 className="mt-1 text-3xl font-bold">{asset.name}</h1>
          <p className="mt-2 text-slate-300">{asset.category} · {asset.asset_code || "bez interne šifre"}</p>
        </div>
        <div className="space-y-5 p-6">
          <Info label="Benzinska stanica" value={`${asset.station_name}${asset.city ? `, ${asset.city}` : ""}`} icon={FaGasPump} />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Data label="Proizvođač" value={asset.manufacturer} />
            <Data label="Model" value={asset.model} />
            <Data label="Serijski broj" value={asset.serial_number} />
            <Data label="Službena oznaka" value={asset.official_mark} />
            <Data label="Status" value={asset.status} />
            <Data label="Lokacija" value={asset.location_description} />
            <Data label="Sljedeći servis" value={formatDate(asset.next_service_at)} />
            <Data label="Istek kalibracije" value={formatDate(asset.calibration_expires_at)} />
          </div>
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Ova javna kartica prikazuje samo identifikacijske i servisne podatke. Za prijavu kvara obratite se odgovornoj osobi benzinske stanice.
          </div>
        </div>
      </div>
    </div>
  );
};

const formatDate = (value) => value ? new Intl.DateTimeFormat("hr-HR").format(new Date(value)) : "—";
const Data = ({ label, value }) => <div><div className="text-xs uppercase text-slate-400">{label}</div><div className="mt-1 font-semibold text-slate-700">{value || "—"}</div></div>;
const Info = ({ label, value, icon: Icon }) => <div className="flex gap-3 rounded-xl bg-slate-50 p-4"><Icon className="mt-1 text-indigo-600" /><div><div className="text-xs uppercase text-slate-400">{label}</div><div className="font-semibold text-slate-700">{value}</div></div></div>;

export default PublicAsset;
