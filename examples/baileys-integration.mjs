#!/usr/bin/env node

/*
  Contoh integrasi naze-sosdown dengan bot WhatsApp Baileys.

  Alur:
  1. Pesan masuk berisi tautan TikTok/Instagram.
  2. Bot memanggil API /api/resolve di server yang sama.
  3. Bot mengunduh setiap item media lewat proxy /api/download
     (proxy menyuntikkan Referer + cookie sehingga CDN tidak 403).
  4. Bot mengirim berkas langsung ke chat sebagai video/gambar.

  Pemakaian:
    npm install @whiskeysockets/baileys qrcode-terminal
    node examples/baileys-integration.mjs

  Pastikan aplikasi naze-sosdown sudah berjalan terlebih dahulu,
  misalnya: npm run build && npm start  (default http://localhost:3000)

  Jika REQUIRE_API_KEY=true, set juga API_KEY di environment.
*/

import makeWASocket, { useMultiFileAuthState, downloadMediaMessage } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";

const API_BASE = process.env.API_BASE ?? "http://localhost:3000";
const API_KEY = process.env.API_KEY ?? "";

const LINK_PATTERN = /https?:\/\/(?:[a-z0-9-]+\.)?(?:tiktok\.com|instagram\.com)\/\S+/i;

function apiHeaders(json = false) {
  const headers = json ? { "Content-Type": "application/json" } : {};
  if (API_KEY) headers["x-api-key"] = API_KEY;
  return headers;
}

async function resolveLink(url) {
  const response = await fetch(`${API_BASE}/api/resolve`, {
    method: "POST",
    headers: apiHeaders(true),
    body: JSON.stringify({ url }),
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error?.message ?? "resolve gagal");
  }
  return result.data;
}

async function downloadMedia(mediaUrl, platform, type) {
  const proxyUrl = `${API_BASE}/api/download?url=${encodeURIComponent(mediaUrl)}&platform=${platform}&type=${type}`;
  const response = await fetch(proxyUrl, { headers: apiHeaders() });
  if (!response.ok) {
    throw new Error(`unduh gagal: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    if (update.qr) {
      qrcode.generate(update.qr, { small: true });
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      if (message.key.fromMe) continue;

      const text =
        message.message?.conversation ??
        message.message?.extendedTextMessage?.text ??
        "";

      const linkMatch = text.match(LINK_PATTERN);
      if (!linkMatch) continue;

      const chatId = message.key.remoteJid;
      await sock.sendPresenceUpdate("composing", chatId);

      try {
        const data = await resolveLink(linkMatch[0]);

        for (const item of data.items) {
          const media = await downloadMedia(item.url, data.platform, data.type);

          if (item.mimeType.startsWith("video/")) {
            await sock.sendMessage(chatId, {
              video: media,
              mimetype: "video/mp4",
              caption: data.caption ?? undefined,
            });
          } else {
            await sock.sendMessage(chatId, {
              image: media,
              caption: data.caption ?? undefined,
            });
          }
        }
      } catch (error) {
        await sock.sendMessage(chatId, {
          text: `Gagal memproses tautan: ${error.message}`,
        });
      }
    }
  });
}

main().catch((error) => {
  console.error("[BOT_ERROR]", error);
  process.exit(1);
});
