"use client";

import { useState } from "react";

type Address = {
  id: string;
  label: string;
  icon: "HOME" | "WORK" | "FAVORITE" | "OTHER";
  address: string;
  cityName: string;
  districtName: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
};

const empty: Omit<Address, "id"> = { label: "", icon: "OTHER", address: "", cityName: "", districtName: "", latitude: 0, longitude: 0, isDefault: false };

export function AddressManager({ initial }: { initial: Address[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Address | null>(null);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    const body = {
      label: form.get("label"), icon: form.get("icon"), address: form.get("address"), cityName: form.get("cityName"), districtName: form.get("districtName"),
      latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude")), isDefault: form.get("isDefault") === "on",
    };
    const response = await fetch(editing ? `/api/account/addresses/${editing.id}` : "/api/account/addresses", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "ذخیره آدرس انجام نشد.");
    setItems((current) => editing ? current.map((item) => item.id === editing.id ? result.data : (body.isDefault ? { ...item, isDefault: false } : item)) : [...current.map((item) => body.isDefault ? { ...item, isDefault: false } : item), result.data]);
    setEditing(null); event.currentTarget.reset(); setMessage("آدرس ذخیره شد.");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id));
  }

  const value = editing ?? empty;
  return <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
    <form key={editing?.id ?? "new"} onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">{editing ? "ویرایش آدرس" : "افزودن آدرس"}</h2>
      <Input name="label" label="برچسب (مثلاً خانه یا محل کار)" defaultValue={value.label} />
      <label className="block text-sm font-bold">آیکن<select name="icon" defaultValue={value.icon} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"><option value="HOME">خانه</option><option value="WORK">محل کار</option><option value="FAVORITE">منتخب</option><option value="OTHER">سایر</option></select></label>
      <Input name="address" label="آدرس کامل" defaultValue={value.address} />
      <div className="grid grid-cols-2 gap-3"><Input name="cityName" label="شهر" defaultValue={value.cityName} required={false} /><Input name="districtName" label="محله" defaultValue={value.districtName} required={false} /></div>
      <div className="grid grid-cols-2 gap-3"><Input name="latitude" label="عرض جغرافیایی" type="number" step="any" defaultValue={value.latitude} /><Input name="longitude" label="طول جغرافیایی" type="number" step="any" defaultValue={value.longitude} /></div>
      <label className="flex items-center gap-2 text-sm font-bold"><input name="isDefault" type="checkbox" defaultChecked={value.isDefault} /> آدرس پیش‌فرض</label>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      <div className="flex gap-2"><button className="rounded-xl bg-primary px-5 py-3 font-bold text-white">ذخیره</button>{editing ? <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-5 py-3 font-bold">انصراف</button> : null}</div>
    </form>
    <div className="space-y-3">
      {items.length ? items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4"><div><h3 className="font-black">{item.label} {item.isDefault ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">پیش‌فرض</span> : null}</h3><p className="mt-2 text-sm text-slate-600">{item.address}</p><p className="mt-1 text-xs text-slate-400">{item.cityName} {item.districtName}</p></div><div className="flex gap-2"><button onClick={() => setEditing(item)} className="text-sm font-bold text-primary">ویرایش</button><button onClick={() => remove(item.id)} className="text-sm font-bold text-red-600">حذف</button></div></div>
      </article>) : <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">هنوز آدرسی ذخیره نشده است.</p>}
    </div>
  </div>;
}

function Input({ label, required = true, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<input required={required} {...props} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-primary" /></label>;
}
