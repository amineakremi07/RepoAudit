import { execFile } from "node:child_process";

export interface SandboxMount {
  hostPath: string;
  containerPath: string;
  /** Mounts are read-only unless explicitly set otherwise. */
  readOnly?: boolean;
}

export interface SandboxRunRequest {
  /** Analyzer image. Pin by digest (image@sha256:...) before beta. */
  image: string;
  command: string[];
  mounts: SandboxMount[];
  /** Default false: analyzers get NO network. Only enable for tools that must fetch, never with repo code executing. */
  network?: boolean;
  timeoutMs: number;
  memoryMb?: number;
  cpus?: number;
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Isolation boundary for anything that touches untrusted repository content.
 * Implementations: Docker today; gVisor/Firecracker/Kubernetes Jobs are drop-in candidates.
 */
export interface SandboxRunner {
  run(req: SandboxRunRequest): Promise<SandboxResult>;
}

/**
 * Runs analyzers in a locked-down, throwaway Docker container.
 * Uses execFile (no shell) so arguments can't be interpreted by a shell.
 */
export class DockerSandboxRunner implements SandboxRunner {
  constructor(private readonly dockerBin = "docker") {}

  buildArgs(req: SandboxRunRequest): string[] {
    const args = [
      "run", "--rm",
      "--network", req.network ? "bridge" : "none",
      "--read-only",
      "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges",
      "--user", "65534:65534", // nobody
      "--pids-limit", "256",
      "--memory", `${req.memoryMb ?? 2048}m`,
      "--cpus", String(req.cpus ?? 1),
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m",
      "--env", "HOME=/tmp",
    ];
    for (const m of req.mounts) {
      args.push("--mount", `type=bind,source=${m.hostPath},target=${m.containerPath}${m.readOnly === false ? "" : ",readonly"}`);
    }
    args.push(req.image, ...req.command);
    return args;
  }

  run(req: SandboxRunRequest): Promise<SandboxResult> {
    return new Promise((resolve) => {
      execFile(
        this.dockerBin,
        this.buildArgs(req),
        { timeout: req.timeoutMs, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024 },
        (err, stdout, stderr) => {
          const e = err as (NodeJS.ErrnoException & { code?: number | string; killed?: boolean }) | null;
          resolve({
            exitCode: e ? (typeof e.code === "number" ? e.code : -1) : 0,
            stdout: String(stdout),
            stderr: String(stderr),
            timedOut: Boolean(e?.killed),
          });
        },
      );
    });
  }
}
