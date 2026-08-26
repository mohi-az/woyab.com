"use client";

/* Dynamic local-upload and Google proxy URLs are intentionally rendered without Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { FiCheck, FiImage, FiLoader, FiMove, FiTrash2, FiUploadCloud } from "react-icons/fi";

export type GooglePlacePhoto = {
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
};

type ImageMode = "google" | "manual";

type Props = {
  locale: string;
  googlePlaceId: string;
  googlePhotos: GooglePlacePhoto[];
  googlePhotosStatus: "idle" | "loading" | "ready" | "empty" | "error";
  imageMode: ImageMode;
  initialImages?: string[];
  initialCoverUrl?: string;
  onImageModeChange: (mode: ImageMode) => void;
  onManualImagesChange: (urls: string[], coverUrl?: string) => void;
};

function copy(locale: string) {
  if (locale === "fa") {
    return {
      auto: "دریافت خودکار از گوگل",
      manual: "مدیریت دستی تصاویر",
      autoHelp: "در حالت خودکار، تصاویر Google Places نمایش داده می‌شوند و اولین تصویر به‌عنوان تصویر اصلی استفاده می‌شود.",
      manualHelp: "تصاویر را آپلود کنید، با کلیک تصویر اصلی را انتخاب کنید و برای تغییر ترتیب آن‌ها را بکشید.",
      upload: "انتخاب و آپلود تصاویر",
      uploading: "در حال آپلود…",
      main: "تصویر اصلی",
      remove: "حذف تصویر",
      noGoogle: "برای این Place ID تصویری پیدا نشد. می‌توانید حالت مدیریت دستی را فعال کنید.",
      enterPlace: "ابتدا در گام قبل Google Place ID را وارد کنید.",
      googleError: "دریافت تصاویر گوگل ناموفق بود. دوباره تلاش کنید یا حالت دستی را انتخاب کنید.",
      uploadError: "آپلود یک یا چند تصویر ناموفق بود.",
      formats: "JPEG، PNG یا WebP؛ حداکثر ۱۰ مگابایت برای هر فایل",
    };
  }

  if (locale === "de") {
    return {
      auto: "Automatisch von Google",
      manual: "Bilder manuell verwalten",
      autoHelp: "Im automatischen Modus werden Google-Places-Bilder verwendet; das erste Bild ist das Titelbild.",
      manualHelp: "Bilder hochladen, Titelbild anklicken und die Reihenfolge per Drag-and-drop ändern.",
      upload: "Bilder auswählen und hochladen",
      uploading: "Wird hochgeladen…",
      main: "Titelbild",
      remove: "Bild entfernen",
      noGoogle: "Für diese Place ID wurden keine Bilder gefunden. Sie können zur manuellen Verwaltung wechseln.",
      enterPlace: "Geben Sie zuerst im vorherigen Schritt eine Google Place ID ein.",
      googleError: "Google-Bilder konnten nicht geladen werden. Versuchen Sie es erneut oder wählen Sie den manuellen Modus.",
      uploadError: "Mindestens ein Bild konnte nicht hochgeladen werden.",
      formats: "JPEG, PNG oder WebP; maximal 10 MB pro Datei",
    };
  }

  return {
    auto: "Use Google photos automatically",
    manual: "Manage images manually",
    autoHelp: "In automatic mode, Google Places photos are used and the first photo becomes the cover.",
    manualHelp: "Upload images, click to choose the cover, and drag thumbnails to set their display order.",
    upload: "Choose and upload images",
    uploading: "Uploading…",
    main: "Main image",
    remove: "Remove image",
    noGoogle: "No photos were found for this Place ID. You can switch to manual image management.",
    enterPlace: "Enter a Google Place ID in the previous step first.",
    googleError: "Google photos could not be loaded. Try again or choose manual mode.",
    uploadError: "One or more images could not be uploaded.",
    formats: "JPEG, PNG or WebP; up to 10 MB per file",
  };
}

function googlePhotoUrl(photoReference: string, placeId: string, maxWidth = 1000) {
  return `/api/place-photo?ref=${encodeURIComponent(photoReference)}&placeId=${encodeURIComponent(placeId)}&maxWidth=${maxWidth}`;
}

export function BusinessImageManager({
  locale,
  googlePlaceId,
  googlePhotos,
  googlePhotosStatus,
  imageMode,
  initialImages = [],
  initialCoverUrl,
  onImageModeChange,
  onManualImagesChange,
}: Props) {
  const t = copy(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const [images, setImages] = useState<string[]>(initialImages);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(
    initialCoverUrl && initialImages.includes(initialCoverUrl) ? initialCoverUrl : initialImages[0],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function commit(nextImages: string[], nextCover = coverUrl) {
    const safeCover = nextCover && nextImages.includes(nextCover) ? nextCover : nextImages[0];
    setImages(nextImages);
    setCoverUrl(safeCover);
    onManualImagesChange(nextImages, safeCover);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || imageMode !== "manual") return;
    setUploading(true);
    setUploadError("");

    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch("/api/upload", { method: "POST", body });
          if (!response.ok) throw new Error("upload");
          const result = (await response.json()) as { url?: string };
          if (!result.url) throw new Error("upload");
          return result.url;
        }),
      );
      commit([...images, ...uploaded], coverUrl ?? uploaded[0]);
    } catch {
      setUploadError(t.uploadError);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function moveImage(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  }

  return (
    <div className="grid gap-5">
      <input type="hidden" name="imageMode" value={imageMode} />
      {imageMode === "google" && googlePhotos[0] ? (
        <input type="hidden" name="googlePhotoReference" value={googlePhotos[0].photoReference} />
      ) : null}
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onImageModeChange("google")}
          className={`min-h-12 rounded-xl px-4 text-sm font-black transition ${
            imageMode === "google" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"
          }`}
        >
          {t.auto}
        </button>
        <button
          type="button"
          onClick={() => onImageModeChange("manual")}
          className={`min-h-12 rounded-xl px-4 text-sm font-black transition ${
            imageMode === "manual" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-white"
          }`}
        >
          {t.manual}
        </button>
      </div>

      {imageMode === "google" ? (
        <div className="grid gap-4">
          <p className="text-sm leading-7 text-slate-600">{t.autoHelp}</p>
          {googlePhotosStatus === "loading" ? (
            <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
              <FiLoader className="mb-2 animate-spin text-xl" />
            </div>
          ) : googlePhotos.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {googlePhotos.map((photo, index) => (
                <div
                  key={photo.photoReference}
                  className={`relative overflow-hidden rounded-2xl border-2 bg-slate-100 ${
                    index === 0 ? "border-primary ring-4 ring-primary/10" : "border-transparent"
                  }`}
                >
                  <img
                    src={googlePhotoUrl(photo.photoReference, googlePlaceId, 640)}
                    alt=""
                    draggable={false}
                    className="aspect-square h-full w-full object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-black text-white shadow">
                      <FiCheck /> {t.main}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm leading-7 text-slate-500">
              <FiImage className="mx-auto mb-2 text-3xl text-slate-300" />
              {googlePhotosStatus === "error"
                ? t.googleError
                : googlePhotosStatus === "empty"
                  ? t.noGoogle
                  : t.enterPlace}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm leading-7 text-slate-600">{t.manualHelp}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => void uploadFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="grid min-h-32 place-items-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center transition hover:border-primary disabled:cursor-wait disabled:opacity-60"
          >
            <span>
              {uploading ? <FiLoader className="mx-auto mb-2 animate-spin text-2xl text-primary" /> : <FiUploadCloud className="mx-auto mb-2 text-3xl text-primary" />}
              <strong className="block text-sm text-slate-900">{uploading ? t.uploading : t.upload}</strong>
              <span className="mt-1 block text-xs text-slate-500">{t.formats}</span>
            </span>
          </button>
          {uploadError ? <p className="text-sm font-bold text-rose-600">{uploadError}</p> : null}

          {images.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {images.map((url, index) => (
                <div
                  key={url}
                  draggable
                  onDragStart={(event) => {
                    draggedIndexRef.current = index;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = draggedIndexRef.current;
                    draggedIndexRef.current = null;
                    if (from !== null) moveImage(from, index);
                  }}
                  className={`group relative cursor-grab overflow-hidden rounded-2xl border-2 bg-slate-100 transition active:cursor-grabbing ${
                    coverUrl === url ? "border-primary ring-4 ring-primary/10" : "border-transparent hover:border-slate-300"
                  }`}
                >
                  <button type="button" onClick={() => commit(images, url)} className="block w-full">
                    <img src={url} alt="" draggable={false} className="aspect-square h-full w-full object-cover" />
                  </button>
                  <span className="pointer-events-none absolute start-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/70 text-white shadow">
                    <FiMove />
                  </span>
                  <button
                    type="button"
                    aria-label={t.remove}
                    title={t.remove}
                    onClick={() => commit(images.filter((item) => item !== url), coverUrl === url ? undefined : coverUrl)}
                    className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-rose-600 shadow transition hover:bg-rose-600 hover:text-white"
                  >
                    <FiTrash2 />
                  </button>
                  {coverUrl === url ? (
                    <span className="pointer-events-none absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-black text-white shadow">
                      <FiCheck /> {t.main}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {imageMode === "manual" ? (
        <>
          {images.map((url) => <input key={url} type="hidden" name="imageUrl" value={url} />)}
          <input type="hidden" name="coverImageUrl" value={coverUrl ?? ""} />
        </>
      ) : null}
    </div>
  );
}

export { googlePhotoUrl };
