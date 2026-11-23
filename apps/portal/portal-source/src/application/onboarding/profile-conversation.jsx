import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import { useEffect, useRef, useState } from "react";
import robinBird from "../../../../../../packages/brand/assets/robin-reading.png";

export function ProfileConversation({ history, question, hint, meta, blockTitle, sectionIntro, containerRef, minimumHeight, children }) {
  useLocale();
  const messages = useRef(null);
  const [historyOpen, setHistoryOpen] = useState(() => !window.matchMedia('(max-width:700px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width:700px)');
    const resize = () => setHistoryOpen(!media.matches);
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    const log = messages.current;
    if (!log) return;
    const currentMessage = log.querySelector(".is-current");
    if (sectionIntro && currentMessage) {
      log.scrollTop += currentMessage.getBoundingClientRect().top - log.getBoundingClientRect().top;
    } else {
      log.scrollTop = log.scrollHeight;
    }
  }, [history.length, question, sectionIntro, historyOpen]);

  return (
    <div ref={containerRef} className="profile-conversation" style={{ minHeight: minimumHeight || undefined }}>
      <div className="profile-conversation-header"><img src={robinBird} alt={t("El pájaro de Robin")} /><div><strong>Robin</strong><span>{t("Vamos a conocerte, a tu ritmo")}</span></div></div>
      <div ref={messages} className="profile-conversation-log" role="log" aria-label={t("Conversación con Robin")} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
        {history.length > 0 && <details className="profile-conversation-history" open={historyOpen} onToggle={event => setHistoryOpen(event.currentTarget.open)}>
          <summary>{t("Respuestas anteriores (")}{history.length})</summary>
        {history.map((entry) => <div className="profile-conversation-exchange" key={entry.screen}>
          <div className="profile-message from-robin"><img src={robinBird} alt="" /><div><span className="profile-message-sender">Robin</span>{entry.sectionIntro && <p className="profile-section-intro">{t(entry.sectionIntro)}</p>}<p>{t(entry.question)}</p></div></div>
          <div className="profile-message from-student"><div><span className="profile-message-sender">{t("Tú")}</span><p>{entry.answer}</p></div></div>
        </div>)}
        </details>}
        <div className="profile-message from-robin is-current" key={question}><img src={robinBird} alt="" /><div><span className="profile-message-sender">Robin</span>{sectionIntro && <p className="profile-section-intro">{t(sectionIntro)}</p>}<h2>{t(question)}</h2><p className="profile-message-hint">{t(hint)}</p></div></div>
      </div>
      <div className="profile-conversation-composer"><div className="profile-conversation-block"><h2>{t(blockTitle)}</h2><span>{t(meta)}</span></div>{children}</div>
    </div>
  );
}
