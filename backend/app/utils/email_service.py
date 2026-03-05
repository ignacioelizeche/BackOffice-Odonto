"""
Email service for sending notifications via SMTP
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        body: str,
        is_html: bool = False
    ) -> bool:
        """
        Send email via SMTP

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body (HTML or plain text)
            is_html: Whether body is HTML (default False)

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Validate SMTP credentials
            if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
                logger.error("SMTP credentials not configured")
                return False

            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{settings.SENDER_NAME} <{settings.SENDER_EMAIL}>"
            message["To"] = to_email

            # Attach body
            mime_type = "html" if is_html else "plain"
            message.attach(MIMEText(body, mime_type, "utf-8"))

            # Connect to SMTP server and send
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(message)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed - check credentials")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False

    @staticmethod
    def send_doctor_welcome_email(
        doctor_email: str,
        doctor_name: str,
        password: str
    ) -> bool:
        """
        Send welcome email to newly created doctor with login credentials

        Args:
            doctor_email: Doctor's email address
            doctor_name: Doctor's full name
            password: Generated password

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = "Bienvenido a DentalCare Pro - Credenciales de Acceso"

        # Create HTML email body
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">¡Bienvenido a DentalCare Pro!</h2>

                    <p>Hola <strong>{doctor_name}</strong>,</p>

                    <p>Se ha creado tu cuenta de usuario en la plataforma <strong>DentalCare Pro</strong>.
                    A continuación encontrarás tus credenciales de acceso:</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Email:</strong> {doctor_email}</p>
                        <p><strong>Contraseña:</strong> <code style="background-color: #e5e7eb; padding: 5px 10px; border-radius: 4px;">{password}</code></p>
                    </div>

                    <p style="color: #666; font-size: 14px;">
                        <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña en el primer acceso.
                    </p>

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #666; font-size: 12px;">
                            Este es un email automático. Si no creaste esta cuenta, contacta al administrador.
                        </p>
                        <p style="color: #999; font-size: 12px;">
                            DentalCare Pro - Sistema de Gestión de Clínica Dental
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """

        return EmailService.send_email(
            to_email=doctor_email,
            subject=subject,
            body=body,
            is_html=True
        )


email_service = EmailService()
