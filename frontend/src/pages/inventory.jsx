import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaBoxes, FaExchangeAlt, FaExclamationTriangle, FaPlus, FaWarehouse } from "react-icons/fa";
import { toast } from "sonner";
import useStore from "../store";
import {
  createInventoryItem,
  createInventoryMovement,
  createWarehouse,
  getInventory,
  updateInventoryItem,
} from "../services/inventoryServices.js";

const emptyItem = {
  id: null, sku: "", name: "", category: "", manufacturer: "", supplier: "",
  unit: "kom", purchase_price: "", selling_price: "", minimum_quantity: 0,
  description: "", active: true,
};
const emptyMovement = {
  item_id: "", warehouse_id: "", movement_type: "receipt",
  quantity: 1, unit_cost: "", note: "",
};

const Inventory = () => {
  const { permissions } = useStore();
  const [data, setData] = useState({ items: [], warehouses: [], movements: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("items");
  const [search, setSearch] = useState("");
  const [itemForm, setItemForm] = useState(emptyItem);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [warehouseForm, setWarehouseForm] = useState({ code: "", name: "", address: "" });
  const [modal, setModal] = useState(null);
  const canManageItems = permissions.includes("manage_inventory_items");
  const canMoveStock = permissions.includes("manage_inventory_movements");
  const canManageWarehouses = permissions.includes("manage_warehouses");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getInventory();
      setData(response.data);
    } catch {
      toast.error("Skladište nije moguće učitati.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase();
    return data.items.filter((item) =>
      `${item.sku} ${item.name} ${item.category || ""} ${item.manufacturer || ""}`.toLowerCase().includes(term)
    );
  }, [data.items, search]);

  const saveItem = async (event) => {
    event.preventDefault();
    try {
      if (itemForm.id) await updateInventoryItem(itemForm.id, itemForm);
      else await createInventoryItem(itemForm);
      toast.success(itemForm.id ? "Artikl je ažuriran." : "Artikl je dodan.");
      setModal(null);
      setItemForm(emptyItem);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Artikl nije moguće spremiti.");
    }
  };

  const saveMovement = async (event) => {
    event.preventDefault();
    try {
      await createInventoryMovement(movementForm);
      toast.success("Kretanje zalihe je evidentirano.");
      setModal(null);
      setMovementForm(emptyMovement);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Kretanje nije moguće spremiti.");
    }
  };

  const saveWarehouse = async (event) => {
    event.preventDefault();
    try {
      await createWarehouse(warehouseForm);
      toast.success("Skladišna lokacija je dodana.");
      setModal(null);
      setWarehouseForm({ code: "", name: "", address: "" });
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Skladište nije moguće spremiti.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-100 pt-28 text-center text-slate-500">Učitavanje skladišta…</div>;

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-10 pt-24 sm:ml-16 sm:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Logistika</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Skladište i rezervni dijelovi</h1>
            <p className="mt-2 text-slate-500">Stanje zaliha, ulazi, izdavanja i minimalne količine.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageItems && <button onClick={() => { setItemForm(emptyItem); setModal("item"); }} className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white"><FaPlus className="mr-2 inline" />Novi artikl</button>}
            {canMoveStock && <button onClick={() => setModal("movement")} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white"><FaExchangeAlt className="mr-2 inline" />Ulaz / izlaz</button>}
            {canManageWarehouses && <button onClick={() => setModal("warehouse")} className="rounded-xl border bg-white px-4 py-3 font-semibold text-slate-700"><FaWarehouse className="mr-2 inline" />Skladište</button>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Aktivni artikli" value={data.summary.active_items || 0} icon={FaBoxes} color="indigo" />
          <SummaryCard label="Ispod minimuma" value={data.summary.low_stock_items || 0} icon={FaExclamationTriangle} color="red" />
          <SummaryCard label="Vrijednost zalihe" value={`${Number(data.summary.stock_value || 0).toLocaleString("hr-HR", { minimumFractionDigits: 2 })} €`} icon={FaExchangeAlt} color="emerald" />
          <SummaryCard label="Skladišne lokacije" value={data.summary.warehouses || 0} icon={FaWarehouse} color="blue" />
        </div>

        <div className="my-6 flex gap-2 rounded-xl bg-white p-2 shadow-sm">
          <Tab active={tab === "items"} onClick={() => setTab("items")}>Artikli</Tab>
          <Tab active={tab === "movements"} onClick={() => setTab("movements")}>Kartica kretanja</Tab>
          <Tab active={tab === "warehouses"} onClick={() => setTab("warehouses")}>Skladišta</Tab>
        </div>

        {tab === "items" && <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pretraži SKU, naziv, kategoriju ili proizvođača…" className="w-full max-w-xl rounded-xl border p-3" /></div>
          <div className="overflow-x-auto"><table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Artikl</th><th className="px-5 py-4">Kategorija</th><th className="px-5 py-4">Stanje</th><th className="px-5 py-4">Minimum</th><th className="px-5 py-4">Nabavna cijena</th><th className="px-5 py-4">Status</th></tr></thead>
            <tbody className="divide-y">{filteredItems.map((item) => {
              const low = Number(item.total_quantity) <= Number(item.minimum_quantity);
              return <tr key={item.id} onClick={() => { if (canManageItems) { setItemForm(item); setModal("item"); } }} className={canManageItems ? "cursor-pointer hover:bg-slate-50" : ""}>
                <td className="px-5 py-4"><b>{item.name}</b><div className="text-xs text-slate-400">{item.sku} · {item.manufacturer || "—"}</div></td>
                <td className="px-5 py-4">{item.category || "—"}</td>
                <td className={`px-5 py-4 font-bold ${low ? "text-red-600" : "text-emerald-600"}`}>{Number(item.total_quantity)} {item.unit}</td>
                <td className="px-5 py-4">{Number(item.minimum_quantity)} {item.unit}</td>
                <td className="px-5 py-4">{item.purchase_price ? `${Number(item.purchase_price).toFixed(2)} €` : "—"}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.active ? "Aktivan" : "Neaktivan"}</span></td>
              </tr>;
            })}</tbody>
          </table>{!filteredItems.length && <Empty text="Nema artikala." />}</div>
        </section>}

        {tab === "movements" && <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Datum</th><th className="px-5 py-4">Artikl</th><th className="px-5 py-4">Skladište</th><th className="px-5 py-4">Vrsta</th><th className="px-5 py-4">Količina</th><th className="px-5 py-4">Napomena</th></tr></thead>
          <tbody className="divide-y">{data.movements.map((m) => <tr key={m.id}><td className="px-5 py-4 text-slate-500">{new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short" }).format(new Date(m.created_at))}</td><td className="px-5 py-4"><b>{m.item_name}</b><div className="text-xs text-slate-400">{m.sku}</div></td><td className="px-5 py-4">{m.warehouse_name}</td><td className="px-5 py-4">{m.movement_type}</td><td className="px-5 py-4 font-bold">{m.quantity} {m.unit}</td><td className="px-5 py-4">{m.note || "—"}</td></tr>)}</tbody>
        </table>{!data.movements.length && <Empty text="Nema kretanja zalihe." />}</div></section>}

        {tab === "warehouses" && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.warehouses.map((w) => <div key={w.id} className="rounded-2xl border bg-white p-5 shadow-sm"><FaWarehouse className="text-2xl text-indigo-600" /><h3 className="mt-4 text-lg font-bold">{w.name}</h3><p className="text-sm text-slate-500">{w.code} · {w.address || "Bez adrese"}</p><div className="mt-4 border-t pt-4 text-sm">{w.stocked_items} artikala · {Number(w.total_units)} jedinica</div></div>)}</div>}
      </div>

      {modal === "item" && <Modal title={itemForm.id ? "Uredi artikl" : "Novi artikl"} onClose={() => setModal(null)} onSubmit={saveItem}>
        <Field label="SKU *"><input required value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} /></Field><Field label="Naziv *"><input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></Field><Field label="Kategorija"><input value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} /></Field><Field label="Proizvođač"><input value={itemForm.manufacturer} onChange={(e) => setItemForm({ ...itemForm, manufacturer: e.target.value })} /></Field><Field label="Dobavljač"><input value={itemForm.supplier} onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })} /></Field><Field label="Jedinica"><input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} /></Field><Field label="Nabavna cijena"><input type="number" step="0.01" value={itemForm.purchase_price} onChange={(e) => setItemForm({ ...itemForm, purchase_price: e.target.value })} /></Field><Field label="Prodajna cijena"><input type="number" step="0.01" value={itemForm.selling_price} onChange={(e) => setItemForm({ ...itemForm, selling_price: e.target.value })} /></Field><Field label="Minimalna količina"><input type="number" step="0.001" min="0" value={itemForm.minimum_quantity} onChange={(e) => setItemForm({ ...itemForm, minimum_quantity: e.target.value })} /></Field>
      </Modal>}
      {modal === "movement" && <Modal title="Novo kretanje zalihe" onClose={() => setModal(null)} onSubmit={saveMovement}>
        <Field label="Artikl *"><select required value={movementForm.item_id} onChange={(e) => setMovementForm({ ...movementForm, item_id: e.target.value })}><option value="">Odaberite artikl</option>{data.items.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}</select></Field><Field label="Skladište *"><select required value={movementForm.warehouse_id} onChange={(e) => setMovementForm({ ...movementForm, warehouse_id: e.target.value })}><option value="">Odaberite skladište</option>{data.warehouses.filter((w) => w.active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field><Field label="Vrsta"><select value={movementForm.movement_type} onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}><option value="receipt">Ulaz robe</option><option value="issue">Izlaz robe</option><option value="return">Povrat</option><option value="adjustment_in">Pozitivna korekcija</option><option value="adjustment_out">Negativna korekcija</option></select></Field><Field label="Količina *"><input required type="number" min="0.001" step="0.001" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} /></Field><Field label="Jedinična cijena"><input type="number" step="0.01" value={movementForm.unit_cost} onChange={(e) => setMovementForm({ ...movementForm, unit_cost: e.target.value })} /></Field><Field label="Napomena"><input value={movementForm.note} onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })} /></Field>
      </Modal>}
      {modal === "warehouse" && <Modal title="Nova skladišna lokacija" onClose={() => setModal(null)} onSubmit={saveWarehouse}><Field label="Šifra *"><input required value={warehouseForm.code} onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })} /></Field><Field label="Naziv *"><input required value={warehouseForm.name} onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} /></Field><Field label="Adresa"><input value={warehouseForm.address} onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })} /></Field></Modal>}
    </div>
  );
};

const colors = { indigo: "bg-indigo-100 text-indigo-700", red: "bg-red-100 text-red-700", emerald: "bg-emerald-100 text-emerald-700", blue: "bg-blue-100 text-blue-700" };
const SummaryCard = ({ label, value, icon: Icon, color }) => <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`inline-flex rounded-xl p-3 ${colors[color]}`}><Icon /></div><div className="mt-3 text-3xl font-bold">{value}</div><div className="text-sm text-slate-500">{label}</div></div>;
const Tab = ({ active, onClick, children }) => <button onClick={onClick} className={`rounded-lg px-4 py-2 font-semibold ${active ? "bg-indigo-600 text-white" : "text-slate-600"}`}>{children}</button>;
const Empty = ({ text }) => <div className="p-12 text-center text-slate-400">{text}</div>;
const Field = ({ label, children }) => <label><span className="mb-2 block text-sm font-semibold">{label}</span>{React.cloneElement(children, { className: "w-full rounded-xl border p-3" })}</label>;
const Modal = ({ title, onClose, onSubmit, children }) => <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white"><div className="border-b p-6"><h2 className="text-xl font-bold">{title}</h2></div><div className="grid gap-4 p-6 md:grid-cols-2">{children}</div><div className="flex justify-end gap-3 border-t p-6"><button type="button" onClick={onClose} className="px-5 py-3">Odustani</button><button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">Spremi</button></div></form></div>;

export default Inventory;
