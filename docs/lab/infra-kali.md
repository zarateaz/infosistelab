# Infraestructura Kali — Nginx, TLS, Firewalld, Fail2ban y SSH 2244

> **Se ejecuta en la VM VÍCTIMA (`10.10.10.20`, Kali).**
> Ten la **consola de la VM abierta** y un **snapshot** antes de tocar SSH o
> Firewalld. Si te quedas sin acceso, revertir el snapshot es el plan B.

---

## 0. Orden seguro (no lo cambies)

1. Copiar la llave SSH del atacante a la víctima (todavía por el puerto 22).
2. Montar Nginx + TLS y comprobar `https://infosistel.lab/`.
3. Mover SSH a 2244 y comprobar que entras con llave.
4. Activar Firewalld (solo 80/443/2244).
5. Activar Fail2ban.
6. Recién entonces cerrar el puerto 22.

---

## 1. Red y `/etc/hosts`

En **ambas** VMs:

```bash
echo "10.10.10.20 infosistel.lab www.infosistel.lab" | sudo tee -a /etc/hosts
ping -c 2 10.10.10.20
```

IPs estáticas:

- Atacante: `10.10.10.10/24`
- Víctima: `10.10.10.20/24`

---

## 2. Nginx + TLS

### 2.1 Instalar

```bash
sudo apt update
sudo apt install -y nginx openssl ca-certificates
```

### 2.2 Certificado del laboratorio

Puedes usar el script de referencia de `infosistelv2`:

```bash
sudo DOMAIN=infosistel.lab \
  bash ~/infosistelv2/scripts/lab/vps/01-certificado-lab.sh
```

Genera:

- `/etc/nginx/ssl/infosistel.lab.fullchain.pem`
- `/etc/nginx/ssl/infosistel.lab.key`
- `/etc/nginx/ssl/infosistel-lab-ca.crt` (para instalar en la VM atacante)

### 2.3 Config de Nginx

Copia la config de referencia y adapta los placeholders:

```bash
sudo mkdir -p /var/lib/infosistel-lab/uploads/{products,servicios,cotizaciones}

sudo sed -e 's/__DOMAIN__/infosistel.lab/g' \
         -e 's#__DATA_DIR__#/var/lib/infosistel-lab#g' \
  ~/infosistelv2/scripts/lab/vps/nginx-infosistel-lab.conf \
  | sudo tee /etc/nginx/sites-available/infosistel-lab.conf >/dev/null

sudo ln -sf /etc/nginx/sites-available/infosistel-lab.conf /etc/nginx/sites-enabled/infosistel-lab.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Comprueba:

```bash
curl -skI https://infosistel.lab/ | head -20
curl -sI http://infosistel.lab/ | head -5      # debe ser 301
```

### 2.4 Que la app escuche solo en localhost (recomendado)

Con Nginx delante, Node no necesita estar expuesto:

```bash
LAB_MODE=1 LAB_HOST=127.0.0.1 SEED=1 \
  bash ~/infosistelab/scripts/lab/demo/start-pm2.sh
```

Si usas `run-lab.sh --prod`, edita `HOSTNAME=127.0.0.1` o deja Firewalld
cerrando el 3000.

### 2.5 Confiar en la CA desde la VM atacante

```bash
scp -P 2244 kali@10.10.10.20:/etc/nginx/ssl/infosistel-lab-ca.crt /tmp/
sudo cp /tmp/infosistel-lab-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

Sin este paso, usa `curl -k` y acepta la advertencia en el navegador.

---

## 3. SSH en 2244, solo llave

### 3.1 Copiar la llave (aún por el puerto 22)

Desde la **VM atacante**:

```bash
ssh-keygen -t ed25519 -C "lab-atacante"   # si no tienes llave
ssh-copy-id kali@10.10.10.20
ssh kali@10.10.10.20 'wc -l ~/.ssh/authorized_keys'
```

### 3.2 Endurecer sshd (en la víctima)

```bash
sudo tee /etc/ssh/sshd_config.d/99-infosistel-lab.conf >/dev/null <<'EOF'
Port 2244
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 4
EOF

sudo sshd -t
sudo systemctl restart ssh
```

Prueba **sin cerrar la consola**:

```bash
# Desde la atacante
ssh -p 2244 kali@10.10.10.20 'hostname'
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -p 2244 kali@10.10.10.20
```

La segunda debe fallar con `Permission denied (publickey)`.

---

## 4. Firewalld

```bash
sudo apt install -y firewalld
sudo systemctl disable --now ufw 2>/dev/null || true
sudo systemctl enable --now firewalld

sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=2244/tcp
sudo firewall-cmd --reload

sudo firewall-cmd --list-all
```

Debe quedar:

- `services: http https`
- `ports: 2244/tcp`
- **sin** `22/tcp` ni `3000/tcp`

> **No cierres el 22** hasta haber comprobado que entras por el 2244 con llave.
> Si algo falla, usa la consola de la VM o revierte el snapshot.

Comprueba desde la atacante:

```bash
nmap -Pn -sT -p 22,80,443,2244,3000,3010 --reason 10.10.10.20
```

Esperado: `80`, `443`, `2244` open; `22`, `3000`, `3010` filtered/closed.

---

## 5. Fail2ban sobre SSH 2244

```bash
sudo apt install -y fail2ban python3-systemd

sudo tee /etc/fail2ban/jail.d/infosistel-lab.local >/dev/null <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 4
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled  = true
port     = 2244
filter   = sshd
backend  = systemd
mode     = aggressive
journalmatch = _SYSTEMD_UNIT=ssh.service + _SYSTEMD_UNIT=sshd.service
EOF

sudo fail2ban-client -t
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban
sleep 2
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### 5.1 Nota importante para P-03 (Hydra)

Con `PasswordAuthentication no`, Hydra no llega a probar contraseñas y
Fail2ban puede no contar los intentos. Para que la demo de P-03 se vea:

- deja `mode = aggressive` (arriba), que también detecta cierres de
  autenticación; **o**
- para la demo, habilita temporalmente `PasswordAuthentication yes` en un
  drop-in de prueba, ejecuta Hydra, muestra el baneo y vuelve a deshabilitar.

No dejes `PasswordAuthentication yes` al final de la exposición.

### 5.2 Desbanear la IP atacante

```bash
sudo fail2ban-client set sshd unbanip 10.10.10.10
```

---

## 6. Verificación final

En la víctima:

```bash
sudo nginx -t
sudo systemctl is-active nginx firewalld fail2ban ssh
sudo firewall-cmd --list-all
sudo fail2ban-client status sshd
ss -tlnp | grep -E ':80|:443|:2244|:3000'
```

En la atacante:

```bash
VPS_IP=10.10.10.20 DOMAIN=infosistel.lab \
  bash ~/infosistelab/scripts/lab/demo/30-infra.sh
```

Eso cubre **P-01** (nmap), **P-04** (TLS/redirect), **P-02** (SSH) y deja
listos **P-03** (`RUN_HYDRA=1`) y **P-09** (`RUN_RATE=1`).

---

## 7. Rollback rápido

Si te quedas fuera por SSH:

1. Consola de la VM (Kali en VirtualBox/VMware).
2. `sudo systemctl stop firewalld` o `sudo firewall-cmd --panic-off`.
3. Revisa `/etc/ssh/sshd_config.d/99-infosistel-lab.conf`.
4. `sudo systemctl restart ssh`.
5. Si nada funciona, revierte el snapshot.

Si Nginx rompe el sitio:

```bash
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
sudo systemctl stop nginx
```

La app sigue disponible en `http://127.0.0.1:3000` mientras depuras.
