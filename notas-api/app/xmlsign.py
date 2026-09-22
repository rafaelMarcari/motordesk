"""XMLDSig enveloped (C14N 1.0 inclusivo) para documentos fiscais.

A assinatura cobre o elemento identificado por @Id (ex.: infDPS) e e inserida
como filha da raiz, logo apos ele. Nunca reserialize/pretty-print o XML depois
de assinar.
"""
from __future__ import annotations

import base64
import hashlib

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from lxml import etree

from .certs import LoadedCert

NS = "http://www.w3.org/2000/09/xmldsig#"
C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
ENVELOPED = NS + "enveloped-signature"

ALGS = {
    "sha1": (hashes.SHA1, NS + "rsa-sha1", NS + "sha1", hashlib.sha1),
    "sha256": (hashes.SHA256, "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
               "http://www.w3.org/2001/04/xmlenc#sha256", hashlib.sha256),
}
_BY_SIGURI = {v[1]: k for k, v in ALGS.items()}


def c14n(el: etree._Element) -> bytes:
    return etree.tostring(el, method="c14n", exclusive=False, with_comments=False)


def _q(tag: str) -> str:
    return f"{{{NS}}}{tag}"


def sign_element(root: etree._Element, target_id: str, cert: LoadedCert, hash_name: str = "sha1") -> None:
    if hash_name not in ALGS:
        raise ValueError("hash de assinatura invalido")
    hash_cls, sig_uri, dig_uri, hlib = ALGS[hash_name]

    found = root.xpath("//*[@Id=$i]", i=target_id)
    if len(found) != 1:
        raise ValueError(f"elemento com Id={target_id} nao encontrado (ou duplicado)")
    target = found[0]

    digest = base64.b64encode(hlib(c14n(target)).digest()).decode()

    sig = etree.SubElement(root, _q("Signature"), nsmap={None: NS})
    si = etree.SubElement(sig, _q("SignedInfo"))
    etree.SubElement(si, _q("CanonicalizationMethod"), Algorithm=C14N)
    etree.SubElement(si, _q("SignatureMethod"), Algorithm=sig_uri)
    ref = etree.SubElement(si, _q("Reference"), URI="#" + target_id)
    tr = etree.SubElement(ref, _q("Transforms"))
    etree.SubElement(tr, _q("Transform"), Algorithm=ENVELOPED)
    etree.SubElement(tr, _q("Transform"), Algorithm=C14N)
    etree.SubElement(ref, _q("DigestMethod"), Algorithm=dig_uri)
    etree.SubElement(ref, _q("DigestValue")).text = digest

    sv = etree.SubElement(sig, _q("SignatureValue"))
    ki = etree.SubElement(sig, _q("KeyInfo"))
    xd = etree.SubElement(ki, _q("X509Data"))
    etree.SubElement(xd, _q("X509Certificate")).text = cert.cert_der_b64()

    signature = cert.key.sign(c14n(si), padding.PKCS1v15(), hash_cls())
    sv.text = base64.b64encode(signature).decode()


def verify(xml: bytes) -> bool:
    """Verificacao independente (usada nos testes e como sanity check)."""
    root = etree.fromstring(xml)
    sig = root.find(f".//{_q('Signature')}")
    if sig is None:
        return False
    si = sig.find(_q("SignedInfo"))
    ref = si.find(_q("Reference"))
    hash_name = _BY_SIGURI.get(si.find(_q("SignatureMethod")).get("Algorithm"))
    if hash_name is None:
        return False
    hash_cls, _, _, hlib = ALGS[hash_name]
    targets = root.xpath("//*[@Id=$i]", i=ref.get("URI")[1:])
    if len(targets) != 1:
        return False
    expected = base64.b64encode(hlib(c14n(targets[0])).digest()).decode()
    if expected != ref.find(_q("DigestValue")).text:
        return False
    cert_der = base64.b64decode(sig.find(f".//{_q('X509Certificate')}").text)
    pub = x509.load_der_x509_certificate(cert_der).public_key()
    try:
        pub.verify(base64.b64decode(sig.find(_q("SignatureValue")).text),
                   c14n(si), padding.PKCS1v15(), hash_cls())
    except InvalidSignature:
        return False
    return True
