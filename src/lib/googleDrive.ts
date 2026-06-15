// Google Drive upload utilities — client-side OAuth2 via Google Identity Services

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string;
            scope: string;
            callback(resp: { access_token?: string; error?: string }): void;
          }): { requestAccessToken(): void };
        };
      };
    };
  }
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';

let _scriptLoaded = false;

export function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (_scriptLoaded || window.google?.accounts) return Promise.resolve();
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => { _scriptLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

export function requestAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback(resp) {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? 'OAuth cancelled'));
        } else {
          resolve(resp.access_token);
        }
      },
    });
    client.requestAccessToken();
  });
}

async function driveRequest(path: string, options: RequestInit, token: string): Promise<Response> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status}: ${text}`);
  }
  return res;
}

async function findOrCreateFolder(name: string, parentId: string | null, token: string): Promise<string> {
  const safeName = name.replace(/'/g, "\\'");
  const q = [
    `name='${safeName}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    'trashed=false',
    parentId ? `'${parentId}' in parents` : `'root' in parents`,
  ].join(' and ');

  const res = await driveRequest(
    `files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    {},
    token,
  );
  const { files } = await res.json();
  if (files?.length) return files[0].id as string;

  const meta: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];

  const created = await driveRequest('files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  }, token);
  const data = await created.json();
  return data.id as string;
}

export async function uploadSessionVideo(
  file: File,
  sessionTopic: string,
  sessionDate: string,
  token: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  onProgress(2);

  // สร้างโฟลเดอร์: ENG SPARK / Videos / [วันที่] [หัวข้อ]
  const rootId = await findOrCreateFolder('ENG SPARK', null, token);
  const videosId = await findOrCreateFolder('Videos', rootId, token);
  const folderLabel = `${sessionDate} ${sessionTopic}`
    .replace(/[/\\:*?"<>|]/g, '-')
    .slice(0, 80);
  const folderId = await findOrCreateFolder(folderLabel, videosId, token);

  onProgress(8);

  // เริ่ม resumable upload
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type || 'video/mp4',
        'X-Upload-Content-Length': String(file.size),
      },
      body: JSON.stringify({ name: file.name, parents: [folderId] }),
    },
  );
  if (!initRes.ok) throw new Error('เริ่มอัปโหลดไม่ได้: ' + await initRes.text());
  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('Drive API ไม่ส่ง upload URL กลับมา');

  // อัปโหลดทีละ 8 MB
  const CHUNK = 8 * 1024 * 1024;
  let sent = 0;
  let fileId = '';

  while (sent < file.size) {
    const end = Math.min(sent + CHUNK, file.size);
    const chunk = file.slice(sent, end);

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${sent}-${end - 1}/${file.size}`,
        'Content-Type': file.type || 'video/mp4',
      },
      body: chunk,
    });

    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      fileId = data.id;
    } else if (res.status !== 308) {
      throw new Error(`Chunk upload failed: ${res.status}`);
    }

    sent = end;
    onProgress(8 + Math.round((sent / file.size) * 88));
  }

  if (!fileId) throw new Error('อัปโหลดเสร็จแล้วแต่ไม่ได้รับ file ID');

  // เปิดให้ดูได้สาธารณะ (anyone with link)
  await driveRequest(`files/${fileId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  }, token);

  onProgress(100);
  return `https://drive.google.com/file/d/${fileId}/view`;
}
