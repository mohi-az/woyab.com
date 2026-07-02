"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { FiCamera, FiSave, FiUploadCloud } from "react-icons/fi";

type Profile = { name: string; email: string; phone: string; avatarUrl: string };
type Crop = { x: number; y: number; zoom: number };

export function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const t = useTranslations("Dashboard.profile.form");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [selectedImage, setSelectedImage] = useState("");
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, zoom: 1 });

  const displayName = name || initial.email || t("fallbackName");
  const initials = displayName.trim().slice(0, 1).toUpperCase();
  const previewImage = selectedImage || avatarUrl;

  function chooseImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage(t("invalidImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage(t("imageTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(String(reader.result));
      setCrop({ x: 0, y: 0, zoom: 1 });
      setMessage("");
    };
    reader.readAsDataURL(file);
  }

  async function getCroppedImage() {
    if (!selectedImage || !imageRef.current) return avatarUrl;

    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return avatarUrl;

    const image = imageRef.current;
    const baseScale = size / Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.translate(size / 2 + crop.x * 2, size / 2 + crop.y * 2);
    context.scale(baseScale * crop.zoom, baseScale * crop.zoom);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    const cropped = canvas.toDataURL("image/jpeg", 0.9);
    const response = await fetch("/api/account/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: cropped }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? t("uploadFailed"));
    return result.data.avatarUrl as string;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const nextAvatarUrl = await getCroppedImage();
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, avatarUrl: nextAvatarUrl }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error ?? t("saveFailed"));

      setAvatarUrl(result.data.avatarUrl ?? "");
      setSelectedImage("");
      setMessage(t("saved"));
      window.dispatchEvent(new CustomEvent("fargo:profile-updated", {
        detail: { name, email: initial.email, avatarUrl: result.data.avatarUrl ?? "" },
      }));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <section className="border-b border-slate-100 bg-slate-50 p-6 lg:border-b-0 lg:border-e">
          <div className="mx-auto flex max-w-[240px] flex-col items-center text-center">
            <div className="relative h-36 w-36 overflow-hidden rounded-full bg-primary/10 ring-4 ring-white shadow-md">
              {previewImage ? (
                <img src={previewImage} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-5xl font-black text-primary">
                  {initials}
                </span>
              )}
            </div>
            <label className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-dark">
              <FiUploadCloud className="text-lg" />
              {t("chooseImage")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => chooseImage(event.target.files?.[0])}
              />
            </label>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              {t("imageHelp")}
            </p>
          </div>
        </section>

        <section className="space-y-6 p-6">
          {selectedImage ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <FiCamera className="text-primary" />
                {t("cropTitle")}
              </div>
              <div className="mt-4 grid gap-5 md:grid-cols-[220px_1fr]">
                <div className="mx-auto h-52 w-52 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt={t("previewAlt")}
                    className="h-full w-full object-cover"
                    style={{
                      transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.zoom})`,
                    }}
                  />
                </div>
                <div className="space-y-4">
                  <Slider label={t("zoom")} min={1} max={2.4} step={0.05} value={crop.zoom} onChange={(zoom) => setCrop((current) => ({ ...current, zoom }))} />
                  <Slider label={t("panX")} min={-80} max={80} step={1} value={crop.x} onChange={(x) => setCrop((current) => ({ ...current, x }))} />
                  <Slider label={t("panY")} min={-80} max={80} step={1} value={crop.y} onChange={(y) => setCrop((current) => ({ ...current, y }))} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")}>
              <input value={name} onChange={(event) => setName(event.target.value)} required className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-primary" />
            </Field>
            <Field label={t("email")}>
              <input value={initial.email} disabled dir="ltr" className="h-12 w-full rounded-xl border border-slate-300 bg-slate-100 px-4 text-left outline-none" />
            </Field>
            <Field label={t("phone")}>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" dir="ltr" className="h-12 w-full rounded-xl border border-slate-300 px-4 text-left outline-none focus:border-primary" />
            </Field>
          </div>

          {message ? <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p> : null}
          <button disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-white disabled:opacity-60">
            <FiSave />
            {loading ? t("saving") : t("save")}
          </button>
        </section>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input
        {...props}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-primary"
      />
    </label>
  );
}
