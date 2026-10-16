import { isAdmin, json } from '../_lib/auth.js';

function isImage(value) {
  return typeof value === 'string' &&
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(value);
}

async function saveImages(value, bucket, cache) {
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    if (!isImage(value)) throw new Error('Formato de imagem inválido.');
    if (!bucket) throw new Error('Vínculo R2 IMAGES não configurado.');

    const [meta, encoded] = value.slice(5).split(';base64,');
    const mime = meta.toLowerCase();
    const ext = { 'image/png':'png', 'image/jpeg':'jpg', 'image/jpg':'jpg',
      'image/webp':'webp', 'image/gif':'gif' }[mime];

    if (!ext) throw new Error('Formato de imagem inválido.');

    const binary = atob(encoded);
    if (binary.length > 5 * 1024 * 1024) throw new Error('Imagem maior que 5 MB.');

    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hash = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
    const key = `i-${hash}.${ext}`;

    if (!cache.has(key)) {
      cache.add(key);
      await bucket.put(key, bytes, {
        httpMetadata: { contentType: mime }
      });
    }
    return `/media/${key}`;
  }

  if (Array.isArray(value))
    return Promise.all(value.map(v => saveImages(v, bucket, cache)));

  if (value && typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value))
      result[k] = await saveImages(v, bucket, cache);
    return result;
  }

  return value;
}

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env)))
    return json({ ok: false, error: 'Acesso não autorizado.' }, 401);

  if (!env.DB)
    return json({ ok: false, error: 'Vínculo D1 DB não configurado.' }, 503);

  try {
    const body = await request.json();

    if (!body.settings || !Array.isArray(body.categories) ||
        !Array.isArray(body.products))
      return json({ ok: false, error: 'Dados inválidos.' }, 400);

    const state = await saveImages({
      settings: body.settings,
      categories: body.categories,
      products: body.products
    }, env.IMAGES, new Set());

    const serialized = JSON.stringify(state);

    await env.DB.prepare(`
      INSERT INTO store_state (id, state_json, updated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = CURRENT_TIMESTAMP
    `).bind(serialized).run();

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Erro ao salvar.' }, 500);
  }
}
