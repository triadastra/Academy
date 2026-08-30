# 7.4 Information Security, Privacy, and Ethics

## Encryption basics

**Encryption** converts **plaintext into ciphertext** to protect data. **Decryption** reverses the process.

| Type | Key usage | Algorithms | Use case |
|---|---|---|---|
| **Symmetric** | **Same key** for encryption and decryption | AES, DES, 3DES | Fast encryption, e.g. file storage |
| **Asymmetric** | **Public key** encrypts, **private key** decrypts | RSA, ECC | Secure key exchange, digital signatures |

**Algorithms:**

- **AES** (Advanced Encryption Standard) — 128/192/256-bit keys, widely used. Example: encrypting a file with AES-256.
- **DES** (Data Encryption Standard) — 56-bit key, **outdated**. The key space is small enough to search exhaustively with modern hardware.
- **RSA** — asymmetric, **slower but secure for key exchange**. Example: RSA for secure email.

The speed difference explains the design of TLS in 7.2: asymmetric encryption is used once, to agree on a shared key, and symmetric encryption carries the actual traffic. Asymmetric alone would be too slow; symmetric alone has no safe way to deliver the key.

**The Caesar cipher** is the historical example: shift letters by a fixed number, so with a shift of 3, A → D and B → E. Decryption reverses the shift. It is **weak due to its limited key space** — only 26 possible shifts, all of which can be tried by hand.

## Privacy concerns

**Personal information exposure** — risks include leaking photos, addresses, or ID documents.

**Web tracking** — websites track browsing history via **cookies** or scripts. Cookies store user data such as login sessions and preferences.

- **Session cookies** — temporary, cleared when the browser closes.
- **Persistent cookies** — long-term, and the vehicle for cross-visit tracking.

## Privacy protection

- **Clear browser history and cookies** regularly to reduce tracking.
- **Avoid untrusted ActiveX controls** — they can execute malicious code.
- **Use VPNs** — encrypts traffic to protect against snooping.
- **Strong passwords** — complex and unique, with **two-factor authentication (2FA)**.

Uniqueness matters as much as complexity: an elaborate password reused across sites is compromised everywhere as soon as any one of those sites is breached.

## Ethical dimensions of data

Four questions frame most computing-ethics debates:

- **Privacy** — what may be collected about a person?
- **Accuracy** — is the data correct, and who is responsible when it isn't?
- **Property** — who owns the data?
- **Access** — what is the responsibility of those who control or use data?

## Computer ethics: the five "NOTs"

1. **Don't harm others with malicious code** — viruses and the like.
2. **Don't interfere with others' work** — hacking systems.
3. **Don't steal data or resources.**
4. **Don't use unpaid proprietary software** — pirated software.
5. **Don't appropriate others' intellectual output** — plagiarism.

## The one "ALWAYS"

**Always use computers with consideration and respect for others.**

The five prohibitions are specific cases; this is the principle they all follow from, and it is the one to reason from when a situation is not covered by any of the five.
