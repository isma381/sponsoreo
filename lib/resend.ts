import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLoginCode(email: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'notificaciones@sponsoreo.space',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Tu código de acceso - Sponsoreo',
    html: `
      <h1>Código de acceso</h1>
      <p>Tu código de acceso es: <strong>${code}</strong></p>
      <p>Este código expira en 15 minutos.</p>
      <p>Si no fuiste tú, ignora este mensaje.</p>
    `,
  });
}

export async function sendVerificationEmail(email: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'notificaciones@sponsoreo.space',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Bienvenido a Sponsoreo - Código de verificación',
    html: `
      <h1>¡Bienvenido a Sponsoreo!</h1>
      <p>Tu código de verificación es: <strong>${code}</strong></p>
      <p>Este código expira en 15 minutos. Úsalo para completar tu registro.</p>
    `,
  });
}

export async function sendWalletVerificationNotification(
  email: string,
  walletAddress: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'notificaciones@sponsoreo.space',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Wallet verificada - Sponsoreo',
    html: `
      <h1>¡Wallet verificada!</h1>
      <p>Tu wallet <strong>${walletAddress}</strong> ha sido verificada exitosamente.</p>
      <p>Ya puedes completar tu perfil y comenzar a usar Sponsoreo.</p>
    `,
  });
}

