import { useEffect, useRef } from "react";
import robinBird from "../../../../../../packages/brand/assets/robin-reading.png";

export function ProfileConversation({ history, question, hint, meta, blockTitle, sectionIntro, containerRef, minimumHeight, children }) {
  const messages = useRef(null);
  useEffect(() => {
    const log = messages.current;
    if (!log) return;
    const currentMessage = log.querySelector(".is-current");
    if (sectionIntro && currentMessage) {
      log.scrollTop += currentMessage.getBoundingClientRect().top - log.getBoundingClientRect().top;
    } else {
      log.scrollTop = log.scrollHeight;
    }
  }, [history.length, question, sectionIntro]);

  return (
    <div ref={containerRef} className="profile-conversation" style={{ minHeight: minimumHeight || undefined }}>
      <div className="profile-conversation-header"><img src={robinBird} alt="El pájaro de Robin" /><div><strong>Robin</strong><span>Vamos a conocerte, a tu ritmo</span></div></div>
      <div ref={messages} className="profile-conversation-log" role="log" aria-label="Conversación con Robin" aria-live="polite" aria-relevant="additions text" tabIndex={0}>
        {history.map((entry) => <div className="profile-conversation-exchange" key={entry.screen}>
          <div className="profile-message from-robin"><img src={robinBird} alt="" /><div><span className="profile-message-sender">Robin</span>{entry.sectionIntro && <p className="profile-section-intro">{entry.sectionIntro}</p>}<p>{entry.question}</p></div></div>
          <div className="profile-message from-student"><div><span className="profile-message-sender">Tú</span><p>{entry.answer}</p></div></div>
        </div>)}
        <div className="profile-message from-robin is-current" key={question}><img src={robinBird} alt="" /><div><span className="profile-message-sender">Robin</span>{sectionIntro && <p className="profile-section-intro">{sectionIntro}</p>}<h2>{question}</h2><p className="profile-message-hint">{hint}</p></div></div>
      </div>
      <div className="profile-conversation-composer"><div className="profile-conversation-block"><h2>{blockTitle}</h2><span>{meta}</span></div>{children}</div>
    </div>
  );
}
