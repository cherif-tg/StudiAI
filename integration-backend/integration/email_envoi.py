"""Envoi d'e-mails transactionnels (lien de réinitialisation, contact).

Configuration par variables d'environnement :
    SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_STARTTLS (true)
Sans SMTP_HOST, le message est écrit dans le journal : pratique en développement,
jamais en production (le lien de réinitialisation y serait lisible).
"""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

journal = logging.getLogger("nunya.email")


def email_configure() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def envoyer_email(destinataire: str, sujet: str, texte: str) -> None:
    hote = os.getenv("SMTP_HOST")
    if not hote:
        journal.warning("SMTP non configuré : e-mail non envoyé à %s\n%s\n%s", destinataire, sujet, texte)
        return

    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "nunya@localhost"))
    message["To"] = destinataire
    message["Subject"] = sujet
    message.set_content(texte)

    port = int(os.getenv("SMTP_PORT", "587"))
    with smtplib.SMTP(hote, port, timeout=15) as serveur:
        if os.getenv("SMTP_STARTTLS", "true").lower() == "true":
            serveur.starttls()
        utilisateur = os.getenv("SMTP_USER")
        if utilisateur:
            serveur.login(utilisateur, os.getenv("SMTP_PASSWORD", ""))
        serveur.send_message(message)
