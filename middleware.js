// Edge Middleware Vercel — protège chaque OUTIL par un code dédié, avec expiration optionnelle. Vitrine publique.
//
// Variables d'environnement (réglées dans Vercel, PAS dans le dépôt public) :
//   • SITE_PASSWORD  : code MAÎTRE qui ouvre TOUS les outils, sans expiration (admin).
//   • ACCESS_CODES   : codes PAR OUTIL, avec date de fin optionnelle.
//        Format : "code=outils[|AAAA-MM-JJ]" séparés par ';'
//          - "outils" = noms de fichiers sans .html (ex. circuit-spice), séparés par ',' ; ou "*" = tous
//          - "|AAAA-MM-JJ" (optionnel) = dernier jour de validité (inclus, fin de journée UTC)
//        Ex. : "circ-7K3M=circuit-spice ; essai-9QX2=dosimetrie,voxel|2026-09-30 ; partenaire=*|2027-01-01"
//
// Si NI SITE_PASSWORD NI ACCESS_CODES ne sont définis → site entièrement ouvert (anti-lockout).

export const config = { matcher: ['/((?!_vercel/).*)'] };

const PUBLIC = new Set([
  '/', '/index.html',
  '/catalogue.html',
  '/EMtools-Catalogue.pdf',
  '/LICENSE',
  '/emtools-logo.svg',
  '/xcat_demo_thorax.json',
  '/favicon.ico',
]);

function parseCodes(raw) {
  const map = new Map();
  for (const part of (raw || '').split(';')) {
    const seg = part.trim();
    const eq = seg.indexOf('=');
    if (eq < 1) continue;
    const code = seg.slice(0, eq).trim();
    if (!code) continue;
    let rest = seg.slice(eq + 1).trim();
    let expiry = null;
    const bar = rest.indexOf('|');
    if (bar >= 0) { expiry = rest.slice(bar + 1).trim(); rest = rest.slice(0, bar).trim(); }
    const tools = rest === '*' ? '*' : new Set(rest.split(',').map(t => t.trim().replace(/\.html$/, '')));
    map.set(code, { tools, expiry });
  }
  return map;
}

function deny(message) {
  return new Response(message, { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="EMtools"' } });
}

export default function middleware(request) {
  const master = process.env.SITE_PASSWORD;
  const codesRaw = process.env.ACCESS_CODES;
  if (!master && !codesRaw) return;                       // rien configuré → tout ouvert

  const { pathname } = new URL(request.url);
  if (PUBLIC.has(pathname) || pathname.startsWith('/vendor/') || pathname.startsWith('/catalogue-shots/')) return;

  const slug = pathname.replace(/^\//, '').replace(/\.html$/, '');

  const header = request.headers.get('authorization') || '';
  let code = null;
  if (header.startsWith('Basic ')) {
    try { const d = atob(header.slice(6)); code = d.slice(d.indexOf(':') + 1); } catch (_) {}
  }

  if (code) {
    if (master && code === master) return;                // code maître → tout, sans expiration
    const entry = parseCodes(codesRaw).get(code);
    if (entry) {
      const okTool = entry.tools === '*' || (entry.tools instanceof Set && entry.tools.has(slug));
      if (okTool) {
        if (!entry.expiry) return;                        // pas d'expiration
        const exp = new Date(entry.expiry + 'T23:59:59Z'); // valable jusqu'à la fin du jour indiqué
        if (!isNaN(exp.getTime()) && Date.now() <= exp.getTime()) return;  // encore valide
        return deny('Accès expiré — votre code d\'accès a pris fin. Contactez NovaSens Expertise (contact@novasensexpertise.com) pour le renouveler.');
      }
    }
  }

  return deny('Accès restreint — un code est nécessaire pour cet outil EMtools. Demandez-le via le formulaire « Se déclarer » sur https://emtools.app');
}
