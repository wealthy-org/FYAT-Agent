import idlJson from "@/lib/idl/fyat_mandate.json";

/**
 * ID program untuk kode klien. Default: `address` di IDL.
 * NEXT_PUBLIC_FYAT_PROGRAM_ID menimpanya, supaya deploy devnet & mainnet
 * bisa memakai IDL yang sama dengan program ID berbeda.
 */
export const FYAT_PROGRAM_ID: string =
  process.env.NEXT_PUBLIC_FYAT_PROGRAM_ID || idlJson.address;

/** IDL dengan `address` yang sudah disesuaikan ke FYAT_PROGRAM_ID. */
export const fyatIdl = { ...idlJson, address: FYAT_PROGRAM_ID };
