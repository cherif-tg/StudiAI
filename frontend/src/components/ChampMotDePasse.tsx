import { useState, type InputHTMLAttributes } from "react";

import { Icon } from "./Icon";

/**
 * Champ de mot de passe avec un bouton « œil » intégré pour afficher ou masquer
 * la saisie. Il accepte exactement les mêmes props qu'un <input> : la valeur et
 * le onChange restent pilotés par la page appelante, rien ne change côté état.
 *
 * Le bouton est de type "button" (il ne soumet jamais le formulaire), annonce son
 * action aux lecteurs d'écran et indique son état avec aria-pressed. Le champ
 * démarre toujours masqué (type="password"), ce que reconnaissent les
 * gestionnaires de mots de passe.
 */
export function ChampMotDePasse({
  className = "input",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="champ-mdp">
      <input
        {...props}
        className={`${className} champ-mdp__input`}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="champ-mdp__bouton"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-controls={props.id}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        title={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        <Icon name={visible ? "oeilBarre" : "oeil"} size={19} />
      </button>
    </div>
  );
}
