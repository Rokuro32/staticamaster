/** @type {import('next').NextConfig} */

// Le build de Next compile en parallèle sur tous les cœurs. Sur une machine
// déjà chargée, ça sature la mémoire : le worker se fait tuer (SIGKILL) ou
// reste figé indéfiniment. Dans ce cas :
//
//   NEXT_BUILD_LOW_MEM=1 npm run build
//
// force un seul worker — plus lent, mais ça passe. Le réglage n'est pas activé
// par défaut pour ne pas ralentir les builds de déploiement, où la mémoire
// n'est pas le facteur limitant.
const lowMemory = process.env.NEXT_BUILD_LOW_MEM === '1';

const nextConfig = {
  reactStrictMode: true,
  ...(lowMemory ? { experimental: { cpus: 1, workerThreads: false } } : {}),
}

module.exports = nextConfig
