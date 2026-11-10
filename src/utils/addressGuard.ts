/**
 * Garde contre la SSRF : scrapidou ne lit que des adresses publiques.
 *
 * Le serveur est public : sans cette garde, n'importe qui lui ferait lire 127.0.0.1, le réseau Docker du VPS ou
 * 169.254.169.254 et rendre la réponse. Deux contrôles, tous deux nécessaires :
 * - `assertPublicUrl`, à chaque saut (URL demandée et chaque redirection) : le protocole, et l'adresse quand l'hôte
 *   est une IP écrite en clair (net.connect ne résout alors rien, `guardedLookup` ne serait jamais appelé) ;
 * - `guardedLookup`, la résolution DNS de la connexion elle-même : l'adresse contrôlée est celle à laquelle on se
 *   connecte, ce qu'un contrôle fait avant le fetch ne garantit pas (un DNS qui change de réponse entre les deux).
 *
 * `SCRAPIDOU_ALLOW_PRIVATE_NETWORK=true` lève la garde, pour un usage local qui doit lire un serveur de la machine.
 */

import dns from 'node:dns';
import net from 'node:net';
import { InvalidInputError } from './errors.js';

/** Plages qui ne sont pas l'Internet public (IANA special-purpose registries, IPv4 et IPv6). */
const BLOCKED = new net.BlockList();
for (const [prefix, bits] of [
  ['0.0.0.0', 8], // « ce réseau »
  ['10.0.0.0', 8], // privé
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // boucle locale
  ['169.254.0.0', 16], // lien local, dont les métadonnées des clouds
  ['172.16.0.0', 12], // privé, dont les réseaux Docker
  ['192.0.0.0', 24], // affectations IETF
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // privé
  ['198.18.0.0', 15], // bancs d'essai
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // réservé, dont 255.255.255.255
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv4');
}
for (const [prefix, bits] of [
  ['::', 128], // non spécifiée
  ['::1', 128], // boucle locale
  ['64:ff9b:1::', 48], // NAT64 local
  ['100::', 64], // à jeter
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // adresses locales uniques
  ['fe80::', 10], // lien local
  ['fec0::', 10], // site local (obsolète)
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv6');
}

/** IPv4 contenue dans une IPv6 : mappée (::ffff:a.b.c.d) ou NAT64 public (64:ff9b::a.b.c.d). */
function embeddedIPv4(ip: string): string | null {
  const m = ip.toLowerCase().match(/^(?:::ffff:|64:ff9b::)(?:([0-9a-f]{1,4}):([0-9a-f]{1,4})|(\d+\.\d+\.\d+\.\d+))$/);
  if (!m) return null;
  if (m[3]) return m[3];
  const hi = parseInt(m[1], 16);
  const lo = parseInt(m[2], 16);
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
}

/** Vrai si l'adresse IP n'est pas publique. Une chaîne qui n'est pas une IP est refusée. */
export function isBlockedAddress(ip: string): boolean {
  const bare = ip.replace(/^\[|\]$/g, '').replace(/%.*$/, ''); // crochets d'URL, zone IPv6 (fe80::1%eth0)
  const family = net.isIP(bare);
  if (family === 4) return BLOCKED.check(bare, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIPv4(bare);
    return v4 ? BLOCKED.check(v4, 'ipv4') : BLOCKED.check(bare, 'ipv6');
  }
  return true;
}

export function privateNetworkAllowed(): boolean {
  return process.env.SCRAPIDOU_ALLOW_PRIVATE_NETWORK === 'true';
}

function refusal(host: string, ip: string): InvalidInputError {
  const shown = host === ip ? ip : `${host} (${ip})`;
  return new InvalidInputError(
    `Blocked URL: ${shown} is a private or reserved address. Only public addresses can be fetched.`,
    { host, address: ip }
  );
}

/**
 * Contrôle d'un saut : http(s) seulement, et une IP écrite en clair doit être publique.
 * L'URL, toujours analysée par le parseur WHATWG, a déjà normalisé 2130706433, 0x7f.1 ou 127.1 en 127.0.0.1.
 */
export function assertPublicUrl(url: URL): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidInputError(
      `Invalid URL protocol: ${url.protocol}. Only http:// and https:// are supported.`
    );
  }
  if (privateNetworkAllowed()) return;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw refusal(host, host);
  }
}

type LookupAddress = { address: string; family: number };
type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void;

/**
 * `lookup` de la connexion (net.connect / tls.connect) : résout le nom, refuse si UNE des adresses n'est pas
 * publique (un nom public ne pointe pas vers le réseau interne), sinon rend la réponse dans la forme demandée.
 */
export function guardedLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCallback
): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, '');
      return;
    }
    const list = addresses as LookupAddress[];
    if (!privateNetworkAllowed()) {
      const bad = list.find((a) => isBlockedAddress(a.address));
      if (bad) {
        callback(refusal(hostname, bad.address) as unknown as NodeJS.ErrnoException, '');
        return;
      }
    }
    if (options.all) {
      callback(null, list);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
}
