/**
 * Envoi du formulaire de contact du footer. Le backend Nunya n'a pas de route
 * dédiée : l'instance choisit, via `.env`, un point d'envoi (service de
 * formulaires ou route maison) ou, à défaut, une adresse e-mail.
 */

const env = import.meta.env;
const POINT_ENVOI = env.VITE_CONTACT_ENDPOINT?.trim() ?? "";
const ADRESSE = env.VITE_CONTACT_EMAIL?.trim() ?? "";

export type ResultatContact = "envoye" | "messagerie";

export class ContactNonConfigure extends Error {}

export async function envoyerContact(email: string, message: string): Promise<ResultatContact> {
  if (POINT_ENVOI) {
    const reponse = await fetch(POINT_ENVOI, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, message, page: window.location.pathname }),
    });
    if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`);
    return "envoye";
  }

  if (ADRESSE) {
    const sujet = encodeURIComponent("Message depuis Nunya");
    const corps = encodeURIComponent(`${message}\n\nRépondre à : ${email}`);
    window.location.href = `mailto:${ADRESSE}?subject=${sujet}&body=${corps}`;
    return "messagerie";
  }

  throw new ContactNonConfigure("Formulaire de contact non configuré");
}
