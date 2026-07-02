import "server-only";

import net from "node:net";
import tls from "node:tls";

type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
}

export async function sendMail(mail: Mail) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured.");
    console.info("SMTP is not configured. Email preview:", mail);
    return;
  }

  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE === "true";
  const from = process.env.SMTP_FROM!;

  let socket: SmtpSocket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  await onceConnected(socket);
  await readResponse(socket, 220);
  await command(socket, `EHLO ${host}`, 250);

  if (!secure && process.env.SMTP_STARTTLS !== "false") {
    await command(socket, "STARTTLS", 220);
    socket = tls.connect({ socket, servername: host });
    await onceConnected(socket);
    await command(socket, `EHLO ${host}`, 250);
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    await command(socket, "AUTH LOGIN", 334);
    await command(socket, Buffer.from(process.env.SMTP_USER).toString("base64"), 334);
    await command(socket, Buffer.from(process.env.SMTP_PASSWORD).toString("base64"), 235);
  }

  await command(socket, `MAIL FROM:<${extractEmail(from)}>`, 250);
  await command(socket, `RCPT TO:<${mail.to}>`, 250);
  await command(socket, "DATA", 354);
  await command(socket, buildMessage(from, mail), 250);
  await command(socket, "QUIT", 221);
  socket.end();
}

function onceConnected(socket: SmtpSocket) {
  return new Promise<void>((resolve, reject) => {
    if (!socket.connecting) return resolve();
    socket.once("secureConnect", resolve);
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
}

function command(socket: SmtpSocket, value: string, expectedCode: number) {
  const response = readResponse(socket, expectedCode);
  socket.write(`${value}\r\n`);
  return response;
}

function readResponse(socket: SmtpSocket, expectedCode: number) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";

    function cleanup() {
      socket.off("data", onData);
      socket.off("error", onError);
    }

    function onError(error: Error) {
      cleanup();
      reject(error);
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines.at(-1);
      if (!lastLine || !/^\d{3} /.test(lastLine)) return;

      cleanup();
      const code = Number(lastLine.slice(0, 3));
      if (code !== expectedCode) reject(new Error(`SMTP error: ${buffer.trim()}`));
      else resolve(buffer);
    }

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

function buildMessage(from: string, mail: Mail) {
  const boundary = `fargo-${Date.now()}`;
  return [
    `From: ${from}`,
    `To: ${mail.to}`,
    `Subject: ${mail.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    mail.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    mail.html,
    "",
    `--${boundary}--`,
    ".",
  ].join("\r\n");
}

function extractEmail(value: string) {
  return value.match(/<([^>]+)>/)?.[1] ?? value;
}
