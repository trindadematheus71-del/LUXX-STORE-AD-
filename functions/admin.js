import { createSessionToken, isAdmin, sessionCookie, clearSessionCookie } from './_lib/auth.js';

const page = (msg = '') => `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ADM | LUXX STORE AD</title>
<style>
body{font-family:Arial;background:#f6f1f2;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:white;padding:28px;border-radius:16px;width:min(360px,85%)}
input,button,a{box-sizing:border-box;width:100%;padding:13px;margin-top:12px}
button,a{background:#191919;color:white;border:0;text-align:center;display:block}
</style>
<main>
<h2>LUXX STORE AD</h2>
<p>Área reservada ao proprietário.</p>
${msg ? `<p>${msg}</p>` : ''}
<form method="post" action="/admin">
<label>Senha administrativa</label>
<input name="password" type="password" required>
<button>Entrar para editar</button>
</form>
<a href="/">Voltar à loja</a>
</main></html>`;

export async function onRequest({ request, env }) {
  if (new URL(request.url).searchParams.get('logout') === '1') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/', 'Set-Cookie': clearSessionCookie() }
    });
  }

  if (request.method === 'GET') {
    if (await isAdmin(request, env)) {
      return Response.redirect(new URL('/', request.url), 302);
    }
    return new Response(page(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return new Response(page('Configure ADMIN_PASSWORD e SESSION_SECRET no Cloudflare.'), { status: 503 });
  }

  const form = await request.formData();
  if (String(form.get('password') || '') !== env.ADMIN_PASSWORD) {
    return new Response(page('Senha incorreta.'), { status: 401 });
  }

  const token = await createSessionToken(env.SESSION_SECRET);
  return new Response(null, {
    status: 303,
    headers: { Location: '/', 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' }
  });
}
