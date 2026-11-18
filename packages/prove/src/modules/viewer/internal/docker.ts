// The viewer's container. Docker runs it; nothing here reads or writes a file.
import { execFile } from "node:child_process";
import { Effect } from "effect";

/**
 * `grafana/otel-lgtm` 0.39.0, pushed 30 October 2026 (17 days before it was chosen; 0.40.0 was too new): pinned by
 * digest, so what runs is what the spike ran.
 */
export const IMAGE = "grafana/otel-lgtm@sha256:4c8056c9c05fcb3c8fd93800e85334bfd79b4d0271b47a54a121a64af41fe1fe";

export const NAME = "ortho-viewer";

export interface Ran {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** `docker <args>`, without a shell and without a time limit: the first start pulls a large image. */
export const docker = (args: ReadonlyArray<string>) =>
  Effect.callback<Ran>((resume) => {
    const child = execFile("docker", [...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error === null ? 0 : typeof error.code === "number" ? error.code : 1;
      resume(Effect.succeed({ status: code, stdout, stderr }));
    });
    return Effect.sync(() => void child.kill());
  });

/** Anonymous Grafana: everyone is an admin of the one org, and there is no login form (verified by the test). */
const GRAFANA = ["GF_AUTH_ANONYMOUS_ENABLED=true", "GF_AUTH_ANONYMOUS_ORG_ROLE=Admin", "GF_AUTH_DISABLE_LOGIN_FORM=true"];

/** Loopback only, on ports Docker picks, no volume: stopping it forgets everything. */
export const runArgs = (): ReadonlyArray<string> => [
  "run", "-d", "--rm", "--name", NAME, "--network", "bridge", "-p", "127.0.0.1::3000", "-p", "127.0.0.1::4318",
  ...GRAFANA.flatMap((e) => ["-e", e]), IMAGE,
];

/** The host port Docker published for a container port, or undefined. */
export const portOf = (container: string, port: number) =>
  docker(["port", container, `${port}/tcp`]).pipe(
    Effect.map((r) => {
      const found = r.stdout.trim().split("\n")[0]?.split(":").pop() ?? "";
      return r.status === 0 && /^\d+$/.test(found) ? Number(found) : undefined;
    }),
  );

/** Container traffic stays on the bridge: Linux's host-gateway cannot reach host loopback-only published ports. */
export const bridgeAddress = (container: string) =>
  docker(["inspect", "-f", '{{(index .NetworkSettings.Networks "bridge").IPAddress}}', container]).pipe(
    Effect.map((r) => r.status === 0 && /^\d{1,3}(\.\d{1,3}){3}$/.test(r.stdout.trim()) ? r.stdout.trim() : undefined),
  );

/** Whether the container exists and is running. */
export const isRunning = (container: string) =>
  docker(["inspect", "-f", "{{.State.Running}}", container]).pipe(Effect.map((r) => r.status === 0 && r.stdout.trim() === "true"));
