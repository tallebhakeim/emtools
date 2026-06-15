// Edge Middleware Vercel — protège les OUTILS par un code d'accès, laisse la vitrine publique.
// Le code est lu dans la variable d'environnement SITE_PASSWORD (réglée dans Vercel, PAS dans le dépôt public).
// Tant que SITE_PASSWORD n'est pas défini → site entièrement ouvert (aucun blocage accidentel).

export const config = {
  // s'exécute sur toutes les requêtes sauf les ressources internes Vercel
  matcher: ['/((?!_vercel/).*)'],
};

// Pages publiques (vitrine) : toujours accessibles sans code
const PUBLIC = new Set([
  '/', '/index.html',
  '/catalogue.html',
  '/EMtools-Catalogue.pdf',
  '/LICENSE',
  '/emtools-logo.svg',
  '/xcat_demo_thorax.json',
  '/favicon.ico',
]);

export default function middleware(request) {
  const pass = process.env.SITE_PASSWORD;
  if (!pass) return;                                   // pas de code configuré → tout ouvert

  const { pathname } = new URL(request.url);
  if (PUBLIC.has(pathname) || pathname.startsWith('/vendor/')) return;  // vitrine + assets

  // Authentification HTTP Basic : on vérifie uniquement le mot de passe (l'identifiant peut être n'importe quoi)
  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));           // "utilisateur:motdepasse"
      const given = decoded.slice(decoded.indexOf(':') + 1);
      if (given === pass) return;                      // code correct → on laisse passer
    } catch (_) { /* en-tête invalide → on redemande */ }
  }

  return new Response(
    'Accès restreint — un code est nécessaire pour utiliser les outils EMtools. Demandez-le via le formulaire « Se déclarer » sur https://emtools.app',
    { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="EMtools"' } }
  );
}
