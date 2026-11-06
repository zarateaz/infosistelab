#!/usr/bin/env python3
"""
============================================================================
 EJERCICIO 4 — SIMULACIÓN DE RANSOMWARE (SOLO LABORATORIO)
============================================================================

NO es ransomware real:
  - No se propaga, no persiste, no exfiltra, no contacta a ningún servidor.
  - Solo cifra UN archivo (por defecto una copia de lab-data/lab.db).
  - Guarda la clave en local para poder restaurar y repetir la demo.
  - Se niega a tocar rutas fuera de lab-data/ en modo --live.

Modos:
  # Demo segura (no toca la BD que usa la app): cifra una COPIA en
  # lab-data/ransom-demo/ y deja la original intacta.
  python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db

  # Restaurar la copia cifrada del sandbox.
  python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --restore

  # Demo "real" sobre la BD del laboratorio (detén la app antes; haz snapshot
  # de la VM). Exige confirmación explícita.
  python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --live --yes-i-have-snapshot
  python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --live --restore

El cifrado es AES-256-GCM si `cryptography` está instalado; si no, usa un
stream SHA-256 + HMAC (toy cipher, solo didáctico). En ambos casos el archivo
cifrado deja de ser una base SQLite válida, que es el impacto que se quiere
demostrar.
============================================================================
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import os
import secrets
import shutil
import sys
from pathlib import Path

MAGIC = b"INFOSISTEL-RANSOM-SIM1\n"
ALGO_AESGCM = b"A"
ALGO_STREAM = b"S"
TAG_LEN = 32
NONCE_LEN = 12


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def is_inside(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    out = bytearray()
    counter = 0
    while len(out) < length:
        out.extend(hashlib.sha256(key + nonce + counter.to_bytes(8, "big")).digest())
        counter += 1
    return bytes(out[:length])


def encrypt_bytes(data: bytes) -> tuple[bytes, bytes]:
    key = secrets.token_bytes(32)
    nonce = secrets.token_bytes(NONCE_LEN)

    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore

        sealed = AESGCM(key).encrypt(nonce, data, MAGIC)
        ciphertext, tag = sealed[:-16], sealed[-16:]
        header = MAGIC + ALGO_AESGCM + bytes([len(tag)]) + nonce + tag
        return header + ciphertext, key
    except Exception:
        stream = _keystream(key, nonce, len(data))
        ciphertext = bytes(a ^ b for a, b in zip(data, stream))
        tag = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
        header = MAGIC + ALGO_STREAM + bytes([len(tag)]) + nonce + tag
        return header + ciphertext, key


def decrypt_bytes(blob: bytes, key: bytes) -> bytes:
    if not blob.startswith(MAGIC):
        raise ValueError("El archivo no tiene el formato de esta simulación.")

    offset = len(MAGIC)
    algo = blob[offset : offset + 1]
    tag_len = blob[offset + 1]
    nonce = blob[offset + 2 : offset + 2 + NONCE_LEN]
    tag = blob[offset + 2 + NONCE_LEN : offset + 2 + NONCE_LEN + tag_len]
    ciphertext = blob[offset + 2 + NONCE_LEN + tag_len :]

    if algo == ALGO_AESGCM:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # type: ignore

        return AESGCM(key).decrypt(nonce, ciphertext + tag, MAGIC)

    if algo == ALGO_STREAM:
        expected = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, tag):
            raise ValueError("HMAC inválido: el archivo fue alterado.")
        stream = _keystream(key, nonce, len(ciphertext))
        return bytes(a ^ b for a, b in zip(ciphertext, stream))

    raise ValueError(f"Algoritmo desconocido: {algo!r}")


def write_note(directory: Path, locked_name: str) -> Path:
    note = directory / "LEEME_RESCATE.txt"
    note.write_text(
        """============================================================
  SIMULACIÓN ACADÉMICA DE RANSOMWARE — INFOSISTEL / SENATI
============================================================
Este archivo NO es un rescate real. Es parte de la Actividad N°1
(caso NovaTech) y de la evidencia "antes" del hardening de INFOSISTEL.

En un ataque real, aquí aparecerían:
  - una dirección BTC y un monto de rescate,
  - un plazo antes de publicar los datos,
  - instrucciones para comprar un descifrador.

En esta demo la clave está en `clave-demo.hex` para poder restaurar
el archivo y repetir la presentación. Detén la app antes de usar
--live y restaura con --restore.

Archivo afectado: %s
Hash SHA-256 del archivo cifrado: pendiente (ver salida del script).
============================================================
""" % locked_name,
        encoding="utf-8",
    )
    return note


def simulate(target: Path, sandbox: Path, live: bool, force: bool) -> int:
    if not target.is_file():
        print(f"[!] No existe el archivo objetivo: {target}")
        return 1

    root = project_root()
    lab_data = root / "lab-data"

    if not is_inside(target, root):
        print("[!] Rechazado: el objetivo está fuera del proyecto.")
        return 1

    if live and not is_inside(target, lab_data):
        print("[!] Rechazado: --live solo permite archivos dentro de lab-data/.")
        return 1

    if not live and not is_inside(target, lab_data):
        print("[!] Rechazado: usa un archivo dentro de lab-data/.")
        return 1

    sandbox.mkdir(parents=True, exist_ok=True)

    if live:
        victim = target
        locked = target.with_name(target.name + ".locked")
        workdir = target.parent
    else:
        victim = sandbox / target.name
        shutil.copy2(target, victim)
        locked = sandbox / (target.name + ".locked")
        workdir = sandbox

    if locked.exists() and not force:
        print(f"[!] Ya existe {locked}. Usa --restore o --force.")
        return 1

    original_hash = sha256_file(victim)
    original_size = victim.stat().st_size

    if live:
        for suffix in ("-wal", "-shm"):
            sidecar = Path(str(target) + suffix)
            if sidecar.exists():
                print(
                    f"[!] Aviso: existe {sidecar.name}. Detén la aplicación antes de "
                    "usar --live para evitar una copia inconsistente."
                )

    data = victim.read_bytes()
    blob, key = encrypt_bytes(data)
    locked.write_bytes(blob)

    key_file = sandbox / "clave-demo.hex"
    key_file.write_text(key.hex() + "\n", encoding="utf-8")
    os.chmod(key_file, 0o600)

    if live:
        victim.unlink()
    else:
        victim.unlink()  # la copia en claro se "cifra": queda solo el .locked

    note = write_note(workdir, locked.name)
    note.write_text(
        note.read_text(encoding="utf-8").replace(
            "Hash SHA-256 del archivo cifrado: pendiente (ver salida del script).",
            f"Hash SHA-256 del archivo cifrado: {sha256_file(locked)}",
        ),
        encoding="utf-8",
    )

    print("")
    print("============================================================")
    print("  SIMULACIÓN DE RANSOMWARE — IMPACTO")
    print("============================================================")
    print(f"  Objetivo:        {target}")
    print(f"  Archivo cifrado: {locked}")
    print(f"  Tamaño original: {original_size} bytes")
    print(f"  SHA-256 antes:   {original_hash}")
    print(f"  SHA-256 después: {sha256_file(locked)}")
    print(f"  Nota de rescate: {note}")
    print(f"  Clave (demo):    {key_file}")
    print("")
    print("  La app ya no puede abrir la base de datos: el archivo dejó de")
    print("  ser una SQLite válida. Restaura con:")
    print(f"    python3 {Path(__file__).relative_to(root)} --target {target} --restore" + (" --live" if live else ""))
    print("============================================================")
    print("")
    return 0


def restore(target: Path, sandbox: Path, live: bool) -> int:
    if live:
        locked = target.with_name(target.name + ".locked")
        destination = target
        note = target.parent / "LEEME_RESCATE.txt"
    else:
        locked = sandbox / (target.name + ".locked")
        destination = sandbox / target.name
        note = sandbox / "LEEME_RESCATE.txt"

    key_file = sandbox / "clave-demo.hex"

    if not locked.is_file():
        print(f"[!] No existe el archivo cifrado: {locked}")
        return 1
    if not key_file.is_file():
        print(f"[!] No existe la clave de demo: {key_file}")
        return 1

    key = bytes.fromhex(key_file.read_text(encoding="utf-8").strip())
    plaintext = decrypt_bytes(locked.read_bytes(), key)
    destination.write_bytes(plaintext)

    ok = plaintext.startswith(b"SQLite format 3\x00")
    locked.unlink()
    if note.exists():
        note.unlink()

    print("")
    print("============================================================")
    print("  RESTAURACIÓN COMPLETA")
    print("============================================================")
    print(f"  Archivo restaurado: {destination}")
    print(f"  SHA-256:            {sha256_file(destination)}")
    print(f"  Cabecera SQLite:    {'OK' if ok else 'NO RECONOCIDA'}")
    print("============================================================")
    print("")
    return 0 if ok else 2


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Simulación de ransomware para el laboratorio INFOSISTEL (no destructiva por defecto)."
    )
    parser.add_argument("--target", default="lab-data/lab.db", help="Archivo objetivo (por defecto lab-data/lab.db).")
    parser.add_argument("--sandbox", default="lab-data/ransom-demo", help="Carpeta de la demo segura.")
    parser.add_argument("--restore", action="store_true", help="Descifrar y restaurar.")
    parser.add_argument("--live", action="store_true", help="Cifrar el archivo real de lab-data/ (requiere snapshot).")
    parser.add_argument("--yes-i-have-snapshot", action="store_true", help="Confirmación obligatoria para --live.")
    parser.add_argument("--force", action="store_true", help="Sobrescribir un .locked existente.")
    args = parser.parse_args()

    root = project_root()
    target = Path(args.target)
    if not target.is_absolute():
        target = root / target
    sandbox = Path(args.sandbox)
    if not sandbox.is_absolute():
        sandbox = root / sandbox

    print("")
    print("############################################################")
    print("#  INFOSISTEL — SIMULACIÓN ACADÉMICA DE RANSOMWARE         #")
    print("#  Uso exclusivo en VMs aisladas. No es malware real.      #")
    print("############################################################")

    if args.live and not args.restore and not args.yes_i_have_snapshot:
        print("")
        print("[!] --live exige --yes-i-have-snapshot.")
        print("    Toma una instantánea de la VM azul antes de continuar.")
        return 1

    if args.restore:
        return restore(target, sandbox, args.live)

    return simulate(target, sandbox, args.live, args.force)


if __name__ == "__main__":
    sys.exit(main())
