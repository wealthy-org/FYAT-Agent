/**
 * Menyalin IDL dan tipe TypeScript hasil `anchor build` ke repo web.
 * Jalankan setiap kali program berubah:
 *   pnpm idl:sync <path-ke-workspace-anchor>
 * atau set ANCHOR_WORKSPACE.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const IDL_NAME = "fyat_mandate";
const DEST_DIR = path.join(process.cwd(), "src", "lib", "idl");

type IdlSummary = {
  address?: string;
  instructions?: { name: string }[];
};

function resolveWorkspace(): string {
  const workspace = process.argv[2] ?? process.env.ANCHOR_WORKSPACE;
  if (!workspace) {
    throw new Error(
      "Pass the Anchor workspace path, or set ANCHOR_WORKSPACE.",
    );
  }
  return path.resolve(workspace);
}

function main(): void {
  const workspace = resolveWorkspace();

  const source = {
    json: path.join(workspace, "target", "idl", `${IDL_NAME}.json`),
    types: path.join(workspace, "target", "types", `${IDL_NAME}.ts`),
  };

  for (const file of Object.values(source)) {
    if (!existsSync(file)) {
      throw new Error(`Missing ${file}. Run \`anchor build\` first.`);
    }
  }

  const idl = JSON.parse(readFileSync(source.json, "utf8")) as IdlSummary;
  if (!idl.address || !idl.instructions?.length) {
    throw new Error("The IDL has no address or instructions. Rebuild it.");
  }

  mkdirSync(DEST_DIR, { recursive: true });
  copyFileSync(source.json, path.join(DEST_DIR, `${IDL_NAME}.json`));
  // Nama `.types.ts` menghindari bentrok dengan `fyat_mandate.json` di editor dan auto-import.
  copyFileSync(source.types, path.join(DEST_DIR, `${IDL_NAME}.types.ts`));

  console.log(`Synced IDL for program ${idl.address}`);
  console.log(`Instructions: ${idl.instructions.map((i) => i.name).join(", ")}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}