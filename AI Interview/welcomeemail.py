import smtplib
from email.message import EmailMessage

class WelcomeMail:
    def send_email(self, recipient_mail):
        msg = EmailMessage()
        msg['Subject'] = 'Welcome Email'
        msg['From'] = 'host@gmail.com'
        msg['To'] = recipient_mail
        msg.set_content('Hello,')

        # Gmail SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login('host@gmail.com', 'your_app_password')
            smtp.send_message(msg)
