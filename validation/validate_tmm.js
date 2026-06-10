/* ============================================================================
 *  Validation du moteur TMM de l'outil de dosimétrie (dosimetrie.html)
 *  contre la solution analytique EXACTE (Fresnel + onde plane en milieu à pertes).
 *
 *  Principe : pour une monocouche semi-infinie sous onde plane à incidence
 *  normale, la réflexion, le champ de surface, le SAR et la profondeur de
 *  pénétration ont une forme close. Le moteur de l'outil doit les reproduire.
 *  C'est le même socle analytique contre lequel les codes FDTD/FEM sont eux-
 *  mêmes validés pour la géométrie planaire.
 *
 *  Exécution :  node validation/validate_tmm.js
 *  (lit ../dosimetrie.html, en extrait le code, et compare.)
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

// ---- 1. Stubs DOM/Chart minimaux pour exécuter le code de l'outil en Node ----
let lastChart = null;
global.Chart = class { constructor(c, cfg){ lastChart = cfg; } destroy(){} };
const store = { 'freq':'2450000000','einc-val':'10','src-cat':'ff','ff-mode':'einc',
  'th-tissue':'Muscle','th-sar':'4','th-tend':'30','th-ton':'100','th-period':'1000',
  'th-mode':'continu','th-wb':'0.000672','th-tau':'1470','th-h':'8','th-tslice':'15',
  'prop-freq':'2450000000','diel-source':'both','diel-tissue':'Brain (Grey Matter)',
  'near-dist':'0.05','near-type':'edipole','near-moment':'1e-5','near-radius':'0.05',
  'near-current':'1','fcc-erp':'100','fcc-dist':'50' };
function mkEl(id){ const o=[]; return { id, checked:true,
  style:new Proxy({},{get:()=>'',set:()=>true}),
  classList:{add(){},remove(){},contains(){return false}}, options:o,
  selectedOptions:[{disabled:false,value:store[id]||''}],
  get value(){ return store[id]!==undefined?store[id]:''; }, set value(v){ store[id]=String(v); },
  textContent:'', innerHTML:'', appendChild(x){o.push(x);}, setAttribute(){}, getAttribute(){return'';},
  querySelectorAll(){return[];},
  getContext(){ return new Proxy({},{get:()=>()=>{}}); },
  addEventListener(){}, focus(){}, click(){}, parentElement:null }; }
const els = {};
global.document = { getElementById(id){ return els[id]||(els[id]=mkEl(id)); },
  querySelectorAll(){return[];}, querySelector(){return null;},
  createElement(){return mkEl('o');}, createElementNS(){return mkEl('svg');},
  addEventListener(e,f){ if(e==='DOMContentLoaded') f(); } };
global.window = {}; global.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
global.setTimeout = (f)=>{ try{ f(); }catch(e){} };
global.alert = (m)=>{ throw new Error(m); }; global.confirm = ()=>true;

// ---- 2. Charge le code de l'outil ----
const html = fs.readFileSync(path.join(__dirname, '..', 'dosimetrie.html'), 'utf8');
const code = html.split('<script>').pop().split('</script>')[0];

// ---- 3. Référence analytique indépendante + comparaison (dans le scope du code) ----
const harness = `
const ETA0 = Math.sqrt(MU0/EPS0), C0 = 1/Math.sqrt(MU0*EPS0);
const EINC = 19.41;                      // V/m rms  =>  S_inc = E²/η0 ≈ 1 W/m²

function refSlab(name, f){
  const t = TISSUES[name], w = 2*Math.PI*f;
  const eps = coleCole(f, t);            // ε̂ = ε' - jε''
  const se = csqrt(eps);                  // √ε̂
  const eta1 = cdiv({re:ETA0,im:0}, se);  // η1 = η0/√ε̂
  const G = cdiv(csub(eta1,{re:ETA0,im:0}), cadd(eta1,{re:ETA0,im:0}));  // Fresnel
  const Et = cmul({re:EINC,im:0}, {re:1+G.re, im:G.im});                 // champ total en surface
  const sigEff = -eps.im*w*EPS0, rho = t.density;
  const alpha = -(w/C0)*se.im;            // atténuation [1/m]
  const Sinc = EINC*EINC/ETA0;
  return { R:cabs(G), SAR:sigEff*cabs(Et)**2/rho, delta_mm:1000/alpha,
           Pabs:(1-cabs(G)**2)*Sinc, sigEff, epsre:eps.re };
}
function toolSlab(name, f){
  const r = runTMM(f, 19.41, [{t:name, d:200}]);   // couche épaisse, terminée -> semi-infinie
  let dmm = null, e0 = r.eArr[0];
  for(let i=1;i<r.zArr.length;i++){ if(r.eArr[i] <= e0/Math.E){ dmm = r.zArr[i]; break; } }
  const rho = TISSUES[name].density, dz = (r.zArr[1]-r.zArr[0])/1000;
  let Pabs = 0; for(let i=0;i<r.sarArr.length;i++) Pabs += r.sarArr[i]*rho*dz;
  return { R:cabs(r.R), SAR:r.sarArr[0], delta_mm:dmm, Pabs };
}
function err(a,b){ return b ? (100*Math.abs(a-b)/Math.abs(b)) : 0; }
function row(label, tool, exact, unit){
  const e = err(tool, exact);
  const ok = e < 2 ? 'OK ' : '!! ';
  return '   '+ok+label.padEnd(16)+'outil '+tool.toFixed(4).padStart(9)+'  | exact '+exact.toFixed(4).padStart(9)+'  '+unit.padEnd(9)+'| écart '+e.toFixed(2)+'%';
}

const CASES = [
  { name:'Muscle',              f:2.45e9 },
  { name:'Skin',                f:0.90e9 },
  { name:'Brain (Grey Matter)', f:1.80e9 },
  { name:'Fat',                 f:2.45e9 },
];
console.log('='.repeat(78));
console.log(' VALIDATION TMM — monocouche semi-infinie : outil vs analytique exact');
console.log(' Onde plane incidence normale, E_inc = '+EINC+' V/m rms (S_inc ≈ 1 W/m²)');
console.log('='.repeat(78));
let worst = 0;
for(const cs of CASES){
  const ref = refSlab(cs.name, cs.f), tl = toolSlab(cs.name, cs.f);
  console.log('\\n '+cs.name+' @ '+(cs.f/1e9).toFixed(2)+' GHz   (ε\\'='+ref.epsre.toFixed(1)+', σ_eff='+ref.sigEff.toFixed(3)+' S/m)');
  console.log(row('|R| réflexion', tl.R, ref.R, ''));
  console.log(row('SAR surface', tl.SAR, ref.SAR, 'W/kg'));
  console.log(row('δ pénétration', tl.delta_mm, ref.delta_mm, 'mm'));
  console.log(row('bilan P_abs', tl.Pabs, ref.Pabs, 'W/m²'));
  worst = Math.max(worst, err(tl.R,ref.R), err(tl.SAR,ref.SAR), err(tl.delta_mm,ref.delta_mm), err(tl.Pabs,ref.Pabs));
}
console.log('\\n'+'='.repeat(78));
console.log(' COHÉRENCE MULTICOUCHE — |R| = TMM complet, profil = solution exacte');
console.log('='.repeat(78));
const head = [{t:'Skin',d:1.5},{t:'Fat',d:2},{t:'Skull (Cortical)',d:6},{t:'Brain (Grey Matter)',d:40}];
const rh = runTMM(2.45e9, 19.41, head);
let Pabs = 0, dz = (rh.zArr[1]-rh.zArr[0])/1000;
for(let i=0;i<rh.sarArr.length;i++){ let li=rh.lp.length-1, zm=rh.zArr[i]/1000;
  for(let j=0;j<rh.lp.length;j++){ if(zm<=rh.zBounds[j+1]+1e-12){ li=j; break; } }
  Pabs += rh.sarArr[i]*rh.lp[li].rho*dz; }
const Sinc = 19.41*19.41/ETA0, Ptheo = (1-cabs(rh.R)**2)*Sinc, eH = err(Pabs, Ptheo);
console.log('\\n Tête peau/graisse/os/cerveau @2.45GHz : |R| = '+cabs(rh.R).toFixed(4)+', SAR pic = '+Math.max(...rh.sarArr).toFixed(4)+' W/kg');
console.log('   '+(eH<2?'OK ':'!! ')+'Conservation énergie : ∫SAR·ρ dz = '+Pabs.toFixed(4)+' vs (1-|R|²)·S_inc = '+Ptheo.toFixed(4)+' W/m²  | écart '+eH.toFixed(2)+'%');
worst = Math.max(worst, eH);
console.log('\\n'+'='.repeat(78));
console.log(' RÉSULTAT : écart maximal = '+worst.toFixed(2)+'%  =>  '+(worst<2?'VALIDÉ (< 2 %)':'ÉCHEC'));
console.log('='.repeat(78));
`;
eval(code + '\n' + harness);
