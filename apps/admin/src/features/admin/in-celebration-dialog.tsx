import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PartyPopper, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { getInCelebration } from "./in-celebration.mjs";
import "./in-celebration.css";

type Celebration = NonNullable<ReturnType<typeof getInCelebration>>;

export function InCelebration({ celebration, onClose }: { celebration: Celebration; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = () => { if (preference.matches) setPaused(true); };
    preference.addEventListener("change", reduceMotion);
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      preference.removeEventListener("change", reduceMotion);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => closeRef.current(), 10_000);
    return () => window.clearTimeout(timer);
  }, [paused]);

  return <dialog ref={dialogRef} className="crm-in-celebration" aria-labelledby="crm-in-celebration-title" aria-describedby="crm-in-celebration-description" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {!paused && <div className="crm-in-confetti" aria-hidden="true">{Array.from({ length: 90 }, (_, index) => <i key={index} style={{
      "--x": `${(index * 73) % 100}%`,
      "--drift": `${(index % 9 - 4) * 3}vw`,
      "--delay": `${-(index % 13) * 0.21}s`,
      "--duration": `${3 + (index % 5) * 0.4}s`,
      "--color": ["#FF6B35", "#ECB450", "#B5E6C1", "#D5C5FF", "#FFFFFF"][index % 5],
    } as CSSProperties} />)}</div>}
    <section className="crm-in-celebration-card">
      <button type="button" className="crm-in-celebration-close" aria-label="Cerrar celebración" onClick={onClose}><X /></button>
      <header><span><PartyPopper /> CUENTA CREADA</span><h2 id="crm-in-celebration-title">¡Otro IN para el equipo!</h2><p id="crm-in-celebration-description"><strong>{celebration.name}</strong> ya tiene acceso a {celebration.portalName}.</p></header>
      <div className="crm-in-celebration-media">
        {paused || imageFailed ? <div className="crm-in-celebration-still" aria-label="Celebración de cuenta creada">🎉<strong>¡Vamos, equipo!</strong></div> : <img src={`${import.meta.env.BASE_URL}${celebration.gif.src}`} alt={celebration.gif.alt} onError={() => setImageFailed(true)} />}
      </div>
      <footer><Button type="button" variant="outline" onClick={() => setPaused(value => !value)}>{paused ? <Play /> : <Pause />}{paused ? "Animar" : "Pausar"}</Button><a href={celebration.gif.source} target="_blank" rel="noreferrer">GIF en Tenor</a><Button type="button" onClick={onClose}>¡A por el siguiente!</Button></footer>
    </section>
  </dialog>;
}
