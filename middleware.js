// Edge Middleware Vercel — protège chaque OUTIL par un code dédié, vitrine publique.
//
// Deux variables d'environnement (réglées dans Vercel, PAS dans le dépôt public) :
//   • SITE_PASSWORD  : code MAÎTRE qui ouvre TOUS les outils (optionnel, pratique pour l'admin).
//   • ACCESS_CODES   : codes PAR OUTIL. Format : "code1=outil1;code2=outil2,outil3;code3=*"
//                      - "outil" = nom du fichier sans .html (ex. circuit-spice, dosimetrie)
//                      - plusieurs outils séparés par des virgules
//                      - "*" = tous les outils
//   Ex. : "circ-7K3M=circuit-spice; dose-9QX2=dosimetrie,voxel; partenaire=*"
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

// "code=tool1,tool2; code2=*"  ->  Map(code -> Set(tools) | '*')
function parseCodes(raw) {
  const map = new Map();
  for (const part of (raw || '').split(';')) {
    const seg = part.trim();
    const eq = seg.indexOf('=');
    if (eq < 1) continue;
    const code = seg.slice(0, eq).trim();
    const tools = seg.slice(eq + 1).trim();
    if (!code) continue;
    map.set(code, tools === '*' ? '*' : new Set(tools.split(',').map(t => t.trim().replace(/\.html$/, ''))));
  }
  return map;
}

export default function middleware(request) {
  const master = process.env.SITE_PASSWORD;
  const codesRaw = process.env.ACCESS_CODES;
  if (!master && !codesRaw) return;                      // rien configuré → tout ouvert

  const { pathname } = new URL(request.url);
  if (PUBLIC.has(pathname) || pathname.startsWith('/vendor/')) return;   // vitrine + assets

  const slug = pathname.replace(/^\//, '').replace(/\.html$/, '');       // /circuit-spice.html → circuit-spice

  // mot de passe = le code (l'identifiant peut être n'importe quoi)
  const header = request.headers.get('authorization') || '';
  let code = null;
  if (header.startsWith('Basic ')) {
    try { const d = atob(header.slice(6)); code = d.slice(d.indexOf(':') + 1); } catch (_) {}
  }

  if (code) {
    if (master && code === master) return;               // code maître → tout
    const allowed = parseCodes(codesRaw).get(code);
    if (allowed === '*') return;                         // code « tous »
    if (allowed instanceof Set && allowed.has(slug)) return;  // code de cet outil
  }

  return new Response(
    'Accès restreint — un code est nécessaire pour cet outil EMtools. Demandez-le via le formulaire « Se déclarer » sur https://emtools.app',
    { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="EMtools"' } }
  );
}
