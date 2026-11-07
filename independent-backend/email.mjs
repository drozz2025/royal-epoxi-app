import nodemailer from 'nodemailer';
export function createPasswordResetDelivery({ host, port = 587, username, password, from, applicationOrigin, basePath = '/api/auth', createTransport = nodemailer.createTransport }) {
  const origin = new URL(applicationOrigin);
  if (origin.protocol !== 'https:' || !host || !username || !password || !/^[^\s<>@]+@[^\s<>@]+$/.test(from || '') || /[\r\n]/.test(host + username + from)) throw new Error('Verified SMTP settings and sender are required');
  if (![465, 587].includes(Number(port))) throw new Error('SMTP requires TLS or STARTTLS');
  const transport = createTransport({ host, port: Number(port), secure: Number(port) === 465, requireTLS: true,
    auth: { user: username, pass: password }, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false });
  return async function sendResetPassword({ user, url }) {
    const link = new URL(url);
    if (link.origin !== origin.origin || !link.pathname.startsWith(basePath + '/reset-password/')) throw new Error('Unexpected recovery URL');
    if (!/^[^\s<>@]+@[^\s<>@]+$/.test(user?.email || '')) throw new Error('Invalid recipient');
    const result = await transport.sendMail({ from: { name: 'Royal Epoxis', address: from }, to: user.email,
      subject: 'Royal Epoxis — recuperar palavra-passe',
      text: 'Foi pedida a recuperação da tua palavra-passe na Royal Epoxis.\n\nAbre este endereço para definir uma nova palavra-passe:\n' + link.href + '\n\nSe não fizeste este pedido, ignora esta mensagem.',
      disableFileAccess: true, disableUrlAccess: true });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('Recovery email was not accepted');
  };
}
