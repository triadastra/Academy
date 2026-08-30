# 7.1 System Software and the Boot Process

**System software** manages the computer itself, as opposed to application software that does work for the user.

## Types of system software

| Type | Role | Examples |
|---|---|---|
| **BIOS** | Initialises hardware and starts the OS | — |
| **Operating system** | Manages hardware and software resources | Windows, Linux, macOS |
| **Utilities** | Tools for system maintenance | Antivirus, disk cleanup |
| **Device drivers** | Enable communication between OS and hardware | Printer drivers |
| **Language translators** | Convert code to machine language | Compilers, interpreters |

## Five generations of programming languages

| Generation | Type | Example | Characteristics |
|---|---|---|---|
| **1GL** | Machine language | Binary (0s and 1s) | Hardware-specific, error-prone |
| **2GL** | Assembly language | `MOV`, `ADD` | Symbolic, still hardware-specific |
| **3GL** | High-level language | C, Java, Python | Human-readable, portable |
| **4GL** | Very high-level language | SQL, MATLAB | Domain-specific, closer to human language |
| **5GL** | Natural language | AI-based query systems | Conversational, experimental |

The trend across the generations is a steady move **away from the hardware and toward the problem**. 1GL describes what the processor does; 4GL describes what result you want and leaves the method to the system. That is exactly the difference between a Python loop and a SQL `SELECT` in 7.3.

## The boot process

1. **BIOS activation** — the BIOS initialises and checks hardware.
2. **POST** (Power-On Self-Test) — tests critical components: CPU, RAM, GPU.
3. **Bootloader** — loads the operating system into RAM.
4. **OS initialisation** — loads drivers and system configurations.

The order matters diagnostically: a failure at step 2 means hardware, a failure at step 3 or 4 means software.

## Troubleshooting boot issues

| Issue | Symptoms | Solution |
|---|---|---|
| **No boot** | Blank screen, no power | Check power supply, reseat RAM/GPU, test with minimal hardware |
| **Blue screen (BSOD)** | System crashes with an error code | Boot in Safe Mode (F8), update drivers, run diagnostics (`chkdsk`) |
| **Corrupt OS** | Fails to load the OS | Use recovery USB/CD, repair the OS, or reinstall |
| **Slow boot** | Long loading times | Disable unnecessary startup programs, run virus scans, defragment the disk |
| **Boot loop** | Restarts repeatedly | Recover the Master Boot Record (MBR), check for malware, repair the OS |

**Recovery tools:**

- **Safe Mode** — loads minimal drivers, for troubleshooting. If the machine boots in Safe Mode but not normally, the fault is almost certainly a driver or a startup program rather than the hardware.
- **Recovery media** — boot from USB or CD to repair or reinstall the OS.
- **Virus scans** — Windows Defender or third-party antivirus.

Know how to access and configure the BIOS, and memorise the boot sequence and the common fixes.
