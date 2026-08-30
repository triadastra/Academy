# 7.2 Networks and Protocols

## Network types

A **Local Area Network (LAN)** connects devices over a **relatively short distance** — within an office building or a school. A **Wide Area Network (WAN)** spans a large geographic area, connecting LANs together; the internet is the largest WAN.

## IP addressing

A computer is identified on a network by its **IP address** (Internet Protocol address) — a **unique identifier** written in **four dotted decimal** numbers, such as `192.168.1.1`.

IPv4 addresses are classified into **classes A, B, C, D, and E**. Classes A, B, and C are commonly used, each with a specific address range and suited to networks of different sizes.

Since each of the four numbers is one byte, IPv4 offers about 4.3 billion addresses — which turned out not to be enough, and is why the techniques below exist.

## Routers

A **router** is a computer device that **forwards data packets toward their destinations**. It is the **junction between two or more networks**, deciding which way each packet should travel next.

**Latency** of roughly **40–200 ms is acceptable** for ordinary use. Above that, interactive applications start to feel sluggish.

## Core protocols

**TCP (Transmission Control Protocol)** establishes a **connection between sender and receiver** and ensures data is **delivered accurately and in order**.

**IP (Internet Protocol)** defines **how data is addressed and routed** between devices on a network.

The division of labour is the point: IP gets a packet to the right machine but makes no promises; TCP sits on top and adds the guarantees — retransmitting what is lost and reassembling what arrives out of order.

**DNS (Domain Name System)** translates **human-readable domain names into IP addresses**, which computers use to locate and communicate with each other. Without DNS you would have to remember the address of every site you visit.

**DHCP (Dynamic Host Configuration Protocol)** is used to **automatically assign IP addresses** to network devices, eliminating the need for manual configuration.

**NAT (Network Address Translation)** lets many devices on a private network share one public IP address. It **improves IP address utilisation and network management** — and is a large part of why IPv4 exhaustion has not been catastrophic.

## Network commands

| Command | Purpose |
|---|---|
| `ipconfig` (`ifconfig` on some systems) | View a computer's IP address information |
| `ping` | Test whether a host is reachable, and measure latency |
| `tracert` (`traceroute` on some systems) | Show the **route** a data packet takes from source to destination |

`ping` answers "can I reach it?"; `tracert` answers "where does it break?" — it lists each router hop along the way, so a failure partway through localises the problem.

## Security protocols

**TLS/SSL** (Transport Layer Security / Secure Sockets Layer) secures communication over networks — this is what puts the S in HTTPS. It uses **asymmetric encryption for the key exchange and symmetric encryption for the data transfer**, combining the security of the first with the speed of the second (see 7.4).

**VPN (Virtual Private Network)** creates an **encrypted tunnel** for secure remote access.

- **Voluntary tunnelling** — the client initiates the connection.
- **Compulsory tunnelling** — the network enforces the connection.
