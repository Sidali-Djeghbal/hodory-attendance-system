from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from ..core.config import settings

logger = logging.getLogger(__name__)


def send_email(*, to_email: str, subject: str, text: str, html: Optional[str] = None) -> None:
	"""
	Send an email using SMTP settings.

	No-op unless EMAIL_ENABLED=1 and SMTP_HOST is configured.
	"""
	if not settings.EMAIL_ENABLED:
		logger.info("EMAIL_ENABLED=0: skipping email to %s (%s)", to_email, subject)
		return

	if not settings.SMTP_HOST:
		logger.warning("EMAIL_ENABLED=1 but SMTP_HOST is not set; skipping email to %s", to_email)
		return

	from_email = settings.SMTP_FROM or settings.SMTP_USER or "no-reply@hodory.local"

	msg = EmailMessage()
	msg["From"] = from_email
	msg["To"] = to_email
	msg["Subject"] = subject
	msg.set_content(text)
	if html:
		msg.add_alternative(html, subtype="html")

	try:
		with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
			smtp.ehlo()
			if settings.SMTP_STARTTLS:
				smtp.starttls()
				smtp.ehlo()
			if settings.SMTP_USER and settings.SMTP_PASSWORD:
				smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
			smtp.send_message(msg)
		logger.info("Sent email to %s (%s)", to_email, subject)
	except Exception as exc:
		# Don't break core flows due to email issues.
		logger.warning("Failed to send email to %s: %s", to_email, exc)


def build_welcome_email(*, role: str, full_name: str, email: str, password: str) -> dict[str, str]:
	subject = f"Welcome to Hodory ({role} account)"
	text = (
		f"Hello {full_name},\n\n"
		f"Your Hodory {role} account has been created.\n\n"
		f"Login email: {email}\n"
		f"Password: {password}\n\n"
		"Please change your password after first login.\n"
	)
	html = (
		f"<p>Hello <b>{full_name}</b>,</p>"
		f"<p>Your Hodory <b>{role}</b> account has been created.</p>"
		f"<p><b>Login email:</b> {email}<br/>"
		f"<b>Password:</b> {password}</p>"
		f"<p>Please change your password after first login.</p>"
	)
	return {"subject": subject, "text": text, "html": html}

