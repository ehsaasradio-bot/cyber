/**
 * Curated subset of MITRE ATT&CK Enterprise (attack.mitre.org) — a stable public
 * taxonomy, hardcoded here the same way we hardcode country codes/regions.
 * Not a live feed; refresh manually if MITRE revises technique IDs.
 *
 * Event-type → technique mapping is TYPE-LEVEL and intentionally generic:
 * "this kind of activity typically involves these techniques", not a claim
 * that any specific incident was confirmed to use them.
 */

export interface Technique {
  id: string; // e.g. T1486
  name: string;
  tactic: string; // tactic id this technique primarily belongs to
  description: string;
}

export interface Tactic {
  id: string;
  name: string;
  description: string;
}

export const TACTICS: Tactic[] = [
  { id: "TA0043", name: "Reconnaissance", description: "Gathering information to plan future operations." },
  { id: "TA0042", name: "Resource Development", description: "Establishing resources to support operations." },
  { id: "TA0001", name: "Initial Access", description: "Getting into your network." },
  { id: "TA0002", name: "Execution", description: "Running adversary-controlled code." },
  { id: "TA0003", name: "Persistence", description: "Maintaining foothold across restarts/credential changes." },
  { id: "TA0004", name: "Privilege Escalation", description: "Gaining higher-level permissions." },
  { id: "TA0005", name: "Defense Evasion", description: "Avoiding detection." },
  { id: "TA0006", name: "Credential Access", description: "Stealing account names and passwords." },
  { id: "TA0007", name: "Discovery", description: "Exploring the environment." },
  { id: "TA0008", name: "Lateral Movement", description: "Moving through the environment." },
  { id: "TA0009", name: "Collection", description: "Gathering data of interest." },
  { id: "TA0011", name: "Command and Control", description: "Communicating with compromised systems." },
  { id: "TA0010", name: "Exfiltration", description: "Stealing data." },
  { id: "TA0040", name: "Impact", description: "Manipulating, interrupting, or destroying systems/data." },
];

export const TECHNIQUES: Technique[] = [
  { id: "T1595", name: "Active Scanning", tactic: "TA0043", description: "Probing victim infrastructure for exploitable weaknesses." },
  { id: "T1589", name: "Gather Victim Identity Information", tactic: "TA0043", description: "Harvesting credentials, emails, names." },
  { id: "T1583", name: "Acquire Infrastructure", tactic: "TA0042", description: "Buying/renting servers, domains, C2 infrastructure." },
  { id: "T1587", name: "Develop Capabilities", tactic: "TA0042", description: "Building malware, exploits, or C2 tooling." },
  { id: "T1190", name: "Exploit Public-Facing Application", tactic: "TA0001", description: "Exploiting an internet-facing service or app." },
  { id: "T1133", name: "External Remote Services", tactic: "TA0001", description: "Abusing VPN/RDP/remote-access services." },
  { id: "T1566", name: "Phishing", tactic: "TA0001", description: "Malicious messages to gain access or execution." },
  { id: "T1195", name: "Supply Chain Compromise", tactic: "TA0001", description: "Compromising software/hardware before it reaches the victim." },
  { id: "T1078", name: "Valid Accounts", tactic: "TA0001", description: "Using legitimate credentials to gain access." },
  { id: "T1059", name: "Command and Scripting Interpreter", tactic: "TA0002", description: "Abusing shells/scripting engines to execute commands." },
  { id: "T1203", name: "Exploitation for Client Execution", tactic: "TA0002", description: "Exploiting a client application vulnerability." },
  { id: "T1204", name: "User Execution", tactic: "TA0002", description: "Relying on a user to run malicious content." },
  { id: "T1609", name: "Container Administration Command", tactic: "TA0002", description: "Executing commands inside a container via its control plane." },
  { id: "T1053", name: "Scheduled Task/Job", tactic: "TA0003", description: "Abusing task scheduling for persistence/execution." },
  { id: "T1098", name: "Account Manipulation", tactic: "TA0003", description: "Modifying accounts to maintain access." },
  { id: "T1136", name: "Create Account", tactic: "TA0003", description: "Creating accounts for persistent access." },
  { id: "T1611", name: "Escape to Host", tactic: "TA0004", description: "Breaking out of a container to the underlying host." },
  { id: "T1068", name: "Exploitation for Privilege Escalation", tactic: "TA0004", description: "Exploiting a bug to gain elevated permissions." },
  { id: "T1027", name: "Obfuscated Files or Information", tactic: "TA0005", description: "Hiding artifacts to evade defenses." },
  { id: "T1070", name: "Indicator Removal", tactic: "TA0005", description: "Deleting or altering evidence (logs, files)." },
  { id: "T1562", name: "Impair Defenses", tactic: "TA0005", description: "Disabling security tooling (EDR, logging, backups)." },
  { id: "T1552", name: "Unsecured Credentials", tactic: "TA0006", description: "Finding credentials in files, memory, or config." },
  { id: "T1110", name: "Brute Force", tactic: "TA0006", description: "Guessing passwords or keys." },
  { id: "T1555", name: "Credentials from Password Stores", tactic: "TA0006", description: "Extracting saved credentials from browsers/vaults." },
  { id: "T1046", name: "Network Service Discovery", tactic: "TA0007", description: "Enumerating services reachable on the network." },
  { id: "T1613", name: "Container and Resource Discovery", tactic: "TA0007", description: "Enumerating containers, pods, and cluster resources." },
  { id: "T1021", name: "Remote Services", tactic: "TA0008", description: "Using RDP/SSH/WinRM to move between systems." },
  { id: "T1570", name: "Lateral Tool Transfer", tactic: "TA0008", description: "Copying tools between systems in the environment." },
  { id: "T1213", name: "Data from Information Repositories", tactic: "TA0009", description: "Pulling data from wikis, SharePoint, databases (e.g. BigQuery, S3)." },
  { id: "T1530", name: "Data from Cloud Storage", tactic: "TA0009", description: "Accessing objects in S3/GCS/Blob storage." },
  { id: "T1119", name: "Automated Collection", tactic: "TA0009", description: "Scripted collection of data of interest." },
  { id: "T1071", name: "Application Layer Protocol", tactic: "TA0011", description: "Blending C2 traffic into normal HTTP/DNS/etc." },
  { id: "T1105", name: "Ingress Tool Transfer", tactic: "TA0011", description: "Downloading additional tools/malware to a compromised host." },
  { id: "T1090", name: "Proxy", tactic: "TA0011", description: "Routing traffic through intermediaries to obscure C2." },
  { id: "T1568", name: "Dynamic Resolution", tactic: "TA0011", description: "Using DGA/fast-flux to resolve C2 infrastructure." },
  { id: "T1041", name: "Exfiltration Over C2 Channel", tactic: "TA0010", description: "Stealing data over the same channel as C2." },
  { id: "T1567", name: "Exfiltration Over Web Service", tactic: "TA0010", description: "Using cloud storage/services (e.g. buckets) to exfiltrate data." },
  { id: "T1486", name: "Data Encrypted for Impact", tactic: "TA0040", description: "Encrypting data to extort a ransom (ransomware)." },
  { id: "T1490", name: "Inhibit System Recovery", tactic: "TA0040", description: "Deleting backups/shadow copies to block recovery." },
  { id: "T1489", name: "Service Stop", tactic: "TA0040", description: "Stopping services to maximize disruption." },
  { id: "T1498", name: "Network Denial of Service", tactic: "TA0040", description: "Flooding a network/service to deny availability." },
  { id: "T1485", name: "Data Destruction", tactic: "TA0040", description: "Wiping data to render it unrecoverable." },
];

const TECHNIQUE_BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]));
export function techniqueById(id: string): Technique | undefined {
  return TECHNIQUE_BY_ID.get(id);
}

/** Generic, type-level technique associations for our own threat_events.type values. */
export const EVENT_TYPE_TECHNIQUES: Record<string, string[]> = {
  ransomware_victim: ["T1190", "T1078", "T1562", "T1490", "T1486", "T1489"],
  c2_server: ["T1071", "T1105", "T1090", "T1568"],
  attack_source: ["T1595", "T1046", "T1110"],
  malware_url: ["T1204", "T1105", "T1027"],
  kev_added: ["T1190", "T1068", "T1203"],
  cve_critical: ["T1190", "T1203"],
  breaking_news: [],
};

export function techniquesForType(type: string): Technique[] {
  return (EVENT_TYPE_TECHNIQUES[type] ?? [])
    .map((id) => TECHNIQUE_BY_ID.get(id))
    .filter((t): t is Technique => !!t);
}
