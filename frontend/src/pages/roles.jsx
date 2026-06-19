import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSave, FaShieldAlt } from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  createRole,
  getRolesAndPermissions,
  updateRolePermissions,
} from "../services/roleServices.js";

const moduleLabels = {
  administration: "Administracija",
  assets: "Oprema",
  clients: "Klijenti",
  commercial: "Komercijala",
  dashboard: "Dashboard",
  deadlines: "Rokovi",
  documents: "Dokumenti",
  inspections: "Inspekcije",
  inventory: "Skladište",
  maintenance: "Preventivno održavanje",
  management: "Rukovodstvo",
  service_requests: "Servisni zahtjevi",
  stations: "Benzinske stanice",
  work_orders: "Radni nalozi",
  system: "Ostalo",
};

const Roles = () => {
  const permissions = useStore((state) => state.permissions);
  const canManage = permissions.includes("manage_roles");
  const [data, setData] = useState({ roles: [], permissions: [] });
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRolesAndPermissions();
      setData(response.data);
      setSelectedRoleId((current) => current || response.data.roles[0]?.id || null);
    } catch (error) {
      toast.error(error.response?.data?.error || "Role nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedRole = data.roles.find((role) => role.id === selectedRoleId);
  useEffect(() => {
    setSelectedPermissions(new Set((selectedRole?.permissions || []).map((permission) => permission.id)));
  }, [selectedRole]);

  const groupedPermissions = useMemo(() => {
    return data.permissions.reduce((groups, permission) => {
      const module = permission.module || "system";
      if (!groups[module]) groups[module] = [];
      groups[module].push(permission);
      return groups;
    }, {});
  }, [data.permissions]);

  const togglePermission = (permissionId) => {
    if (!canManage || selectedRole?.name === "admin") return;
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateRolePermissions(selectedRoleId, [...selectedPermissions]);
      toast.success("Permisije role su spremljene.");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Permisije nije moguće spremiti.");
    } finally {
      setSaving(false);
    }
  };

  const add = async (event) => {
    event.preventDefault();
    try {
      const response = await createRole(newRole);
      setNewRole({ name: "", description: "" });
      toast.success("Nova rola je kreirana.");
      await load();
      setSelectedRoleId(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.error || "Rolu nije moguće kreirati.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje rola…</div>;

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900"><FaShieldAlt className="text-indigo-600" /> Role i permisije</h1>
          <p className="mt-1 text-slate-500">Odvojite odgovornosti servisera, rukovodstva, skladišta, mjeriteljstva i klijenata.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Role</div>
              <div className="space-y-2">
                {data.roles.map((role) => (
                  <button key={role.id} onClick={() => setSelectedRoleId(role.id)} className={`w-full rounded-xl p-3 text-left ${selectedRoleId === role.id ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
                    <div className="font-bold">{role.name}</div>
                    <div className={`mt-1 text-xs ${selectedRoleId === role.id ? "text-indigo-100" : "text-slate-400"}`}>{role.permissions.length} permisija</div>
                  </button>
                ))}
              </div>
            </section>

            {canManage && (
              <form onSubmit={add} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-3 font-bold text-slate-800">Nova rola</div>
                <input required value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="npr. regional_manager" className="w-full rounded-xl border p-3" />
                <textarea value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} placeholder="Opis odgovornosti" className="mt-2 w-full rounded-xl border p-3" />
                <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white"><FaPlus /> Kreiraj rolu</button>
              </form>
            )}
          </aside>

          <main className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedRole?.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedRole?.description || "Bez opisa"}</p>
              </div>
              {canManage && selectedRole?.name !== "admin" && (
                <button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"><FaSave /> {saving ? "Spremanje…" : "Spremi permisije"}</button>
              )}
              {selectedRole?.name === "admin" && <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">Zaštićena puna rola</span>}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                <section key={module} className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-bold text-slate-800">{moduleLabels[module] || module}</h3>
                  <div className="space-y-2">
                    {modulePermissions.map((permission) => (
                      <label key={permission.id} className={`flex gap-3 rounded-lg p-2 ${canManage && selectedRole?.name !== "admin" ? "cursor-pointer hover:bg-slate-50" : ""}`}>
                        <input type="checkbox" checked={selectedPermissions.has(permission.id)} disabled={!canManage || selectedRole?.name === "admin"} onChange={() => togglePermission(permission.id)} className="mt-1 h-4 w-4 accent-indigo-600" />
                        <span>
                          <span className="block text-sm font-semibold text-slate-700">{permission.name}</span>
                          <span className="block text-xs text-slate-400">{permission.description || permission.action}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Roles;
