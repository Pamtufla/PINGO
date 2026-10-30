/* Créditos + changelog desde commits reales del repo (git log).
   Al hacer push nuevo, actualiza esta lista con:
   git log --pretty=format:"%h|%ad|%an|%s" --date=short
*/
window.PINGO_ABOUT = {
  appVersion: '1.2.4',   // versión lógica de la app (semver)
  apkVersion: '1.2.4',   // versión del APK empaquetado (súbela al generar APK nuevo)
  version: 'd92e616',    // build / commit
  app: 'Pingo de Halloween',
  year: '2026',
  credits: [
    { role: 'Desarrollo / diseño', name: 'Pamtufla' },
    { role: 'Desarrollo / multiplayer', name: 'DanielCordovaT' },
    { role: 'Backend en vivo', name: 'Supabase' },
    { role: 'Hosting', name: 'Render (Docker)' },
    { role: 'Fuentes', name: 'Press Start 2P · VT323 (Google Fonts)' }
  ],
  // Commits del repo (más reciente primero). Merge commits omitidos a propósito.
  changelog: [
    { hash: '93cccee', date: '2026-10-29', author: 'Pamtufla', msg: 'arreglo en cositas menores' },
    { hash: '11dcf1c', date: '2026-10-29', author: 'Pamtufla', msg: 'mejoras visuales' },
    { hash: 'cbefb0c', date: '2026-10-29', author: 'Pamtufla', msg: 'ahi ta tu docker pe' },
    { hash: 'd22cc13', date: '2026-10-29', author: 'Pamtufla', msg: 'Le cambie el runtime' },
    { hash: '36827b1', date: '2026-10-29', author: 'DanielCordovaT', msg: 'Add Dockerfile for Java application deployment' },
    { hash: '6e7cb9e', date: '2026-10-29', author: 'DanielCordovaT', msg: 'Prepara Pingo para deploy en Render desde GitHub.' },
    { hash: 'fc8df85', date: '2026-10-29', author: 'Pamtufla', msg: 'CAMBIO TOTAL DE LA INTERFAZ' },
    { hash: 'd900d4d', date: '2026-10-23', author: 'Pamtufla', msg: 'Pingo ya un chin mejorao (Anoté lo que me acuerdo)' },
    { hash: '05926b8', date: '2026-10-21', author: 'Pamtufla', msg: 'separé el js, css e index pa no tener un god object' },
    { hash: 'cc791bb', date: '2026-10-20', author: 'DanielCordovaT', msg: 'Update index.html' },
    { hash: 'c497978', date: '2026-10-20', author: 'DanielCordovaT', msg: 'Update README.md' },
    { hash: '64d0144', date: '2026-10-20', author: 'DanielCordovaT', msg: 'Add files via upload' },
    { hash: '2154ea7', date: '2026-10-20', author: 'DanielCordovaT', msg: 'Initial commit' }
  ]
};
