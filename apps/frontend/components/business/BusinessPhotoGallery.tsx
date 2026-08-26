"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiExternalLink, FiX } from "react-icons/fi";
import type { BusinessDetailData } from "@/lib/api";

type Props = {
  images: BusinessDetailData["gallery"];
  businessTitle: string;
  open: boolean;
  rtl: boolean;
  onClose: () => void;
  labels: {
    title: string;
    close: string;
    previous: string;
    next: string;
    back: string;
  };
};

function Attribution({ image }: { image: BusinessDetailData["gallery"][number] }) {
  if (!image.sourceUri && !image.authorAttributions?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-300">
      {image.authorAttributions?.map((author, index) => (
        author.uri
          ? <a key={`${author.displayName}-${index}`} href={author.uri} target="_blank" rel="noreferrer" className="font-bold hover:text-white">{author.displayName}</a>
          : <span key={`${author.displayName}-${index}`}>{author.displayName}</span>
      ))}
      {image.sourceUri ? <a href={image.sourceUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black text-primary-light hover:underline">Google Maps <FiExternalLink /></a> : null}
    </div>
  );
}

export function BusinessPhotoGallery({ images, businessTitle, open, rtl, onClose, labels }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (lightboxIndex !== null) setLightboxIndex(null);
        else onClose();
      }
      if (lightboxIndex !== null && event.key === "ArrowLeft") {
        setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
      }
      if (lightboxIndex !== null && event.key === "ArrowRight") {
        setLightboxIndex((lightboxIndex + 1) % images.length);
      }
      if (event.key === "Tab") {
        const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [])]
          .filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images.length, lightboxIndex, onClose, open]);

  if (!open) return null;
  const image = lightboxIndex === null ? null : images[lightboxIndex];
  const PreviousIcon = rtl ? FiArrowRight : FiArrowLeft;
  const NextIcon = rtl ? FiArrowLeft : FiArrowRight;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={labels.title} dir={rtl ? "rtl" : "ltr"} className="fixed inset-0 z-[100] bg-slate-950/90 p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
      <div className="flex h-full flex-col bg-white sm:m-4 sm:h-[calc(100%-2rem)] sm:overflow-hidden sm:rounded-[28px]">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-4 sm:px-6">
          <h2 className="truncate text-lg font-black text-slate-950">{labels.title}</h2>
          <button ref={closeButtonRef} type="button" onClick={() => { setLightboxIndex(null); onClose(); }} aria-label={labels.close} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-slate-100 text-xl text-slate-700 hover:bg-slate-200"><FiX /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {images.map((item, index) => (
              <button key={item.id} type="button" onClick={() => setLightboxIndex(index)} className="group overflow-hidden rounded-2xl bg-slate-100 text-start focus:outline-none focus:ring-4 focus:ring-primary/30">
                <img src={item.imageUrl} alt={item.caption || `${businessTitle} ${index + 1}`} className="aspect-square h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                {item.caption ? <span className="sr-only">{item.caption}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {image ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-slate-950 p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
          <div className="relative z-20 flex min-h-16 items-center justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent px-3 sm:px-6">
            <button type="button" onClick={() => setLightboxIndex(null)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-950 shadow-xl ring-1 ring-white/40 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/40"><PreviousIcon className="text-lg" /> <span>{labels.back}</span></button>
            <span className="text-sm font-bold text-white">{(lightboxIndex ?? 0) + 1} / {images.length}</span>
            <button type="button" onClick={() => { setLightboxIndex(null); onClose(); }} aria-label={labels.close} className="grid min-h-11 min-w-11 place-items-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"><FiX /></button>
          </div>
          <div className="relative min-h-0 flex-1 px-2 sm:px-20">
            <img src={image.imageUrl} alt={image.caption || businessTitle} className="h-full w-full object-contain" />
            {images.length > 1 ? (
              <>
                <button type="button" onClick={() => setLightboxIndex(((lightboxIndex ?? 0) - 1 + images.length) % images.length)} aria-label={labels.previous} className="absolute start-2 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/75 sm:start-5"><PreviousIcon /></button>
                <button type="button" onClick={() => setLightboxIndex(((lightboxIndex ?? 0) + 1) % images.length)} aria-label={labels.next} className="absolute end-2 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/75 sm:end-5"><NextIcon /></button>
              </>
            ) : null}
          </div>
          <div className="shrink-0 px-4 pb-4 pt-2 text-center">
            {image.caption ? <p className="text-sm font-bold text-white">{image.caption}</p> : null}
            <Attribution image={image} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
