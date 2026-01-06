import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLoginCode(email: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
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
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
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
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
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

export async function sendEditingPermissionTransferred(
  email: string,
  transferHash: string,
  senderUsername: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponsoreo.space';
  
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Permisos de edición transferidos - Sponsoreo',
    html: `
      <h1>Permisos de edición transferidos</h1>
      <p><strong>${senderUsername}</strong> te ha transferido los permisos de edición para la transferencia:</p>
      <p><code>${transferHash}</code></p>
      <p>Ahora puedes editar esta transferencia desde tu dashboard.</p>
      <p><a href="${dashboardUrl}/dashboard">Ir al dashboard</a></p>
      <p>Si tienes alguna pregunta, contáctanos en ${process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space'}</p>
    `,
  });
}

export async function sendEditingPermissionReturned(
  email: string,
  transferHash: string,
  receiverUsername: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponsoreo.space';
  
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Permisos de edición devueltos - Sponsoreo',
    html: `
      <h1>Permisos de edición devueltos</h1>
      <p><strong>${receiverUsername}</strong> te ha devuelto los permisos de edición para la transferencia:</p>
      <p><code>${transferHash}</code></p>
      <p>Ahora puedes editar esta transferencia desde tu dashboard.</p>
      <p><a href="${dashboardUrl}/dashboard">Ir al dashboard</a></p>
      <p>Si tienes alguna pregunta, contáctanos en ${process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space'}</p>
    `,
  });
}

export async function sendTransferApprovalNotification(
  email: string,
  transferHash: string,
  approverUsername: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponsoreo.space';
  
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Transferencia aprobada - Sponsoreo',
    html: `
      <h1>Transferencia aprobada</h1>
      <p><strong>${approverUsername}</strong> ha aprobado la transferencia:</p>
      <p><code>${transferHash}</code></p>
      <p>Puedes ver y gestionar esta transferencia desde tu dashboard.</p>
      <p><a href="${dashboardUrl}/dashboard">Ir al dashboard</a></p>
      <p>Si tienes alguna pregunta, contáctanos en ${process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space'}</p>
    `,
  });
}

export async function sendNewTransferNotification(
  email: string,
  transferHash: string,
  otherUsername: string,
  value: number,
  token: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponsoreo.space';
  
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Nueva transferencia detectada - Sponsoreo',
    html: `
      <h1>Nueva transferencia detectada</h1>
      <p>Se ha detectado una nueva transferencia de <strong>${value.toFixed(6)} ${token}</strong> con <strong>${otherUsername}</strong>.</p>
      <p><code>${transferHash}</code></p>
      <p>Puedes ver esta transferencia desde tu dashboard.</p>
      <p><a href="${dashboardUrl}/dashboard">Ir al dashboard</a></p>
      <p>Si tienes alguna pregunta, contáctanos en ${process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space'}</p>
    `,
  });
}

export async function sendTransferRequiresApprovalNotification(
  email: string,
  transferHash: string,
  otherUsername: string,
  value: number,
  token: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponsoreo.space';
  
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Transferencia pendiente de aprobación - Sponsoreo',
    html: `
      <h1>Transferencia pendiente de aprobación</h1>
      <p>Se ha detectado una nueva transferencia de <strong>${value.toFixed(6)} ${token}</strong> con <strong>${otherUsername}</strong> que requiere tu aprobación.</p>
      <p><code>${transferHash}</code></p>
      <p>Debes aprobar esta transferencia para que sea visible públicamente.</p>
      <p><a href="${dashboardUrl}/dashboard">Ir al dashboard</a></p>
      <p>Si tienes alguna pregunta, contáctanos en ${process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space'}</p>
    `,
  });
}

export async function sendTransferChangedToSponsoreoNotification(
  email: string,
  transferHash: string,
  receiverUsername: string,
  value: number,
  token: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurado');
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sponsoreo.space';
  
  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Sponsoreo <notificaciones@sponsoreo.space>',
    to: email,
    replyTo: process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space',
    subject: 'Transferencia cambiada a Sponsoreo - Sponsoreo',
    html: `
      <h1>Transferencia cambiada a Sponsoreo</h1>
      <p><strong>${receiverUsername}</strong> ha cambiado una transferencia de <strong>${value.toFixed(6)} ${token}</strong> al tipo Sponsoreo.</p>
      <p><code>${transferHash}</code></p>
      <p>Ahora puedes editar esta transferencia agregando imagen, categoría, ubicación y descripción desde tu dashboard.</p>
      <p><a href="${dashboardUrl}/dashboard">Ir al dashboard</a></p>
      <p>Si tienes alguna pregunta, contáctanos en ${process.env.RESEND_REPLY_TO || 'soporte@sponsoreo.space'}</p>
    `,
  });
}

