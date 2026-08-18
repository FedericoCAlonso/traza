import type { MasterDatabasePayload } from './syncTypes';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const DRIVE_FILE_NAME = 'cotizador_ieba_master.json';
const TOKEN_KEY = 'ieba_gdrive_access_token';
const TOKEN_EXPIRY_KEY = 'ieba_gdrive_token_expires_at';
const USER_EMAIL_KEY = 'ieba_gdrive_user_email';

export class GoogleDriveProvider {
  readonly name = 'Google Drive (Personal del Usuario)';
  private cachedFileId: string | null = null;

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined';
  }

  getAccessToken(): string | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const expiresAtStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
      if (!token) return null;
      if (expiresAtStr) {
        const expiresAt = parseInt(expiresAtStr, 10);
        if (Date.now() > expiresAt) {
          return null; // Token expirado
        }
      }
      return token;
    } catch {
      return null;
    }
  }

  setAccessToken(token: string, expiresInSeconds = 3600, email?: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + (expiresInSeconds - 60) * 1000));
    if (email) {
      localStorage.setItem(USER_EMAIL_KEY, email);
    }
  }

  async connect(): Promise<boolean> {
    const token = this.getAccessToken();
    if (token) return true;

    if (auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          this.setAccessToken(credential.accessToken, 3600, result.user.email || undefined);
          return true;
        }
      } catch (err: any) {
        console.warn('[GoogleDriveProvider] Autenticación con Google cancelada o fallida:', err);
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          return false;
        }
      }
    }

    return false;
  }

  async disconnect(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    this.cachedFileId = null;
  }

  private async handleDriveError(res: Response, defaultAction: string): Promise<never> {
    if (res.status === 401) {
      await this.disconnect();
      throw new Error('Sesión de Google Drive expirada. Por favor vuelve a iniciar sesión con Google.');
    }

    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson.error?.message || errJson.message || '';
    } catch {
      // ignore
    }

    if (res.status === 403) {
      throw new Error(`Permisos insuficientes en Google Drive (${detail || 'HTTP 403'}).`);
    }

    throw new Error(`${defaultAction}: HTTP ${res.status}${detail ? ` (${detail})` : ''}`);
  }

  private async findMasterFileId(token: string): Promise<string | null> {
    if (this.cachedFileId) return this.cachedFileId;

    const q = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      await this.handleDriveError(res, 'Error al buscar archivo en Google Drive');
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      this.cachedFileId = data.files[0].id;
      return this.cachedFileId;
    }

    return null;
  }

  async readMasterPayload(): Promise<MasterDatabasePayload | null> {
    let token = this.getAccessToken();
    if (!token) {
      const ok = await this.connect();
      if (!ok) return null;
      token = this.getAccessToken();
    }
    if (!token) return null;

    try {
      const fileId = await this.findMasterFileId(token);
      if (!fileId) return null;

      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.warn('[GDriveProvider] No se pudo leer archivo maestro:', res.status);
        return null;
      }

      const text = await res.text();
      if (!text || text.trim().length === 0) return null;
      return JSON.parse(text) as MasterDatabasePayload;
    } catch (err) {
      console.warn('[GDriveProvider] Error al leer payload desde Drive:', err);
      throw err;
    }
  }

  async writeMasterPayload(payload: MasterDatabasePayload): Promise<boolean> {
    let token = this.getAccessToken();
    if (!token) {
      const ok = await this.connect();
      if (!ok) return false;
      token = this.getAccessToken();
    }
    if (!token) return false;

    const jsonStr = JSON.stringify(payload, null, 2);

    try {
      const fileId = await this.findMasterFileId(token);

      if (fileId) {
        // Actualizar archivo existente (PATCH)
        const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: jsonStr
        });

        if (!res.ok) {
          await this.handleDriveError(res, 'Error al actualizar archivo en Google Drive');
        }
        return true;
      } else {
        // Crear nuevo archivo multipart
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
          name: DRIVE_FILE_NAME,
          mimeType: 'application/json'
        };

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          jsonStr +
          closeDelimiter;

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        });

        if (!res.ok) {
          await this.handleDriveError(res, 'Error al crear archivo en Google Drive');
        }

        const data = await res.json();
        this.cachedFileId = data.id;
        return true;
      }
    } catch (err) {
      console.error('[GDriveProvider] Error al escribir en Google Drive:', err);
      throw err;
    }
  }

  getStatus(): { isConfigured: boolean; label: string; email?: string } {
    const token = this.getAccessToken();
    const email = localStorage.getItem(USER_EMAIL_KEY) || undefined;
    return {
      isConfigured: token !== null,
      label: token ? (email ? `Conectado: ${email}` : 'Google Drive Conectado') : 'Google Drive No Conectado',
      email
    };
  }
}

export const gdriveProvider = new GoogleDriveProvider();
