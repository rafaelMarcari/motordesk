// Certificado digital A1 (arquivo .pfx/.p12) das empresas emissoras.
// O Node não abre PKCS#12 sozinho (e os A1 da ICP-Brasil costumam usar cifras antigas que o
// OpenSSL 3 recusa), então o arquivo é lido com node-forge e convertido em PEM para assinar o
// XML e para a conexão TLS com a SEFAZ.
import forge from "node-forge";

export interface ParsedCertificate {
  certPem: string;
  keyPem: string;
  chainPem: string[];
  cnpj: string | null;
  cpf: string | null;
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
}

// OIDs da ICP-Brasil no "otherName" do certificado
const OID_CNPJ = "2.16.76.1.3.3";
const OID_PF_DADOS = "2.16.76.1.3.1"; // data de nascimento (8) + CPF (11) + ...
const OID_RESPONSAVEL = "2.16.76.1.3.4"; // mesmo formato, para o responsável do e-CNPJ

function dnToString(attrs: forge.pki.CertificateField[]): string {
  return attrs.map((a) => `${a.shortName || a.name || a.type}=${a.value}`).join(", ");
}

function digitsFromOtherName(cert: forge.pki.Certificate, oid: string): string | null {
  const ext: any = cert.getExtension("subjectAltName");
  if (!ext || !ext.value) return null;
  try {
    const asn1 = forge.asn1.fromDer(ext.value);
    for (const gn of asn1.value as forge.asn1.Asn1[]) {
      // otherName: [0] { type-id OID, [0] EXPLICIT value }
      if (gn.tagClass !== forge.asn1.Class.CONTEXT_SPECIFIC || gn.type !== 0) continue;
      const parts = gn.value as forge.asn1.Asn1[];
      if (!Array.isArray(parts) || parts.length < 2) continue;
      if (forge.asn1.derToOid(parts[0].value as string) !== oid) continue;
      const raw = forge.asn1.toDer(parts[1]).getBytes();
      const digits = raw.replace(/[^0-9]/g, "");
      return digits || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function parsePfx(pfx: Buffer, password: string): ParsedCertificate {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(pfx.toString("binary"));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/password|mac|decrypt|Invalid/i.test(msg)) throw new Error("Senha do certificado incorreta ou arquivo inválido.");
    throw new Error("Arquivo de certificado inválido (esperado .pfx ou .p12 do tipo A1).");
  }

  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []),
  ];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const key = keyBags.find((b) => b.key)?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!key) throw new Error("O certificado não contém a chave privada (é preciso o A1 completo, .pfx).");
  const certs = certBags.map((b) => b.cert).filter(Boolean) as forge.pki.Certificate[];
  // Certificado da empresa = o que corresponde à chave privada
  const leaf = certs.find((c) => {
    const pub = c.publicKey as forge.pki.rsa.PublicKey;
    return pub && pub.n && pub.n.equals(key.n) && pub.e.equals(key.e);
  });
  if (!leaf) throw new Error("Não foi encontrado o certificado correspondente à chave privada.");

  const cn = String(leaf.subject.getField("CN")?.value || "");
  let cnpj = digitsFromOtherName(leaf, OID_CNPJ);
  if (cnpj && cnpj.length > 14) cnpj = cnpj.slice(-14);
  if (!cnpj) {
    const m = cn.match(/:(\d{14})$/);
    if (m) cnpj = m[1];
  }
  let cpf: string | null = null;
  // e-CPF: titular em 2.16.76.1.3.1; e-CNPJ: responsável pela empresa em 2.16.76.1.3.4
  const pf = digitsFromOtherName(leaf, OID_PF_DADOS) || digitsFromOtherName(leaf, OID_RESPONSAVEL);
  if (pf && pf.length >= 19) cpf = pf.slice(8, 19);
  if (!cnpj && !cpf) {
    const m = cn.match(/:(\d{11})$/);
    if (m) cpf = m[1];
  }

  return {
    certPem: forge.pki.certificateToPem(leaf),
    keyPem: forge.pki.privateKeyToPem(key),
    chainPem: certs.filter((c) => c !== leaf).map((c) => forge.pki.certificateToPem(c)),
    cnpj: cnpj && cnpj.length === 14 ? cnpj : null,
    cpf,
    subject: dnToString(leaf.subject.attributes),
    issuer: dnToString(leaf.issuer.attributes),
    serialNumber: leaf.serialNumber,
    notBefore: leaf.validity.notBefore.toISOString(),
    notAfter: leaf.validity.notAfter.toISOString(),
  };
}

// Conteúdo do certificado sem cabeçalhos, para o <X509Certificate> da assinatura
export function certBase64(certPem: string): string {
  return certPem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
}
