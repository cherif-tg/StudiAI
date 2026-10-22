import { useEffect, useState } from "react";

import { Icon } from "./Icon";

/** Indique la perte de connexion, et ce qui reste disponible. */
export function OfflineBanner() {
  const [horsLigne, setHorsLigne] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine);
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  if (!horsLigne) return null;

  return (
    <div className="offline-banner" role="status">
      <Icon name="alerte" size={15} />
      <span>
        <strong>Hors ligne.</strong> Ton carnet reste consultable ; les questions et les dépôts
        reprendront avec la connexion.
      </span>
    </div>
  );
}
