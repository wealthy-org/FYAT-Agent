/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fyat_mandate.json`.
 */
export type FyatMandate = {
  "address": "Eu1b76PNqv5B8HbTsxrmirM3NfRy51bscQ5eUzgZVU6Y",
  "metadata": {
    "name": "fyatMandate",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createMandate",
      "discriminator": [
        230,
        170,
        158,
        68,
        33,
        169,
        16,
        158
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.mint",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "mandate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  100,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "vault.nextMandateId",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createMandateParams"
            }
          }
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.mint",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "vault"
          ]
        },
        {
          "name": "ownerTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "executeTransfer",
      "discriminator": [
        233,
        126,
        160,
        184,
        235,
        206,
        31,
        119
      ],
      "accounts": [
        {
          "name": "session",
          "docs": [
            "Session key milik agent. Bukan kunci owner."
          ],
          "signer": true,
          "relations": [
            "mandate"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.mint",
                "account": "vault"
              }
            ]
          },
          "relations": [
            "mandate"
          ]
        },
        {
          "name": "mandate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  100,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "mandate.id",
                "account": "mandate"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "destinationTokenAccount",
          "docs": [
            "Harus token account MILIK penerima yang disetujui di mandate. Mengirim ke wallet",
            "agent sendiri (atau siapa pun selain penerima) gagal di constraint ini."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeVault",
      "discriminator": [
        48,
        191,
        163,
        44,
        71,
        129,
        63,
        164
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "docs": [
            "Hanya mint SPL Token klasik: `Account<Mint>` memeriksa pemilik akunnya."
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "docs": [
            "Tempat dana disimpan. Otoritasnya adalah PDA vault, jadi hanya program ini yang bisa memindahkannya."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "revokeMandate",
      "discriminator": [
        252,
        97,
        140,
        119,
        67,
        43,
        177,
        108
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.mint",
                "account": "vault"
              }
            ]
          },
          "relations": [
            "mandate"
          ]
        },
        {
          "name": "mandate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  100,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "mandate.id",
                "account": "mandate"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.mint",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "ownerTokenAccount",
          "docs": [
            "Hanya ke token account MILIK owner sendiri. Frontend yang dibajak tidak bisa",
            "mengalihkan penarikan ke alamat lain."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "mandate",
      "discriminator": [
        113,
        216,
        98,
        159,
        185,
        63,
        55,
        18
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "events": [
    {
      "name": "mandateCreated",
      "discriminator": [
        140,
        30,
        209,
        254,
        5,
        128,
        147,
        113
      ]
    },
    {
      "name": "mandateRevoked",
      "discriminator": [
        228,
        111,
        181,
        60,
        204,
        58,
        131,
        28
      ]
    },
    {
      "name": "transferExecuted",
      "discriminator": [
        8,
        128,
        224,
        132,
        112,
        216,
        192,
        35
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "notVaultOwner",
      "msg": "Signer is not the vault owner"
    },
    {
      "code": 6002,
      "name": "invalidLimits",
      "msg": "Per-action cap must be positive and not exceed the total budget"
    },
    {
      "code": 6003,
      "name": "invalidExpiry",
      "msg": "Expiry must be in the future and within 30 days"
    },
    {
      "code": 6004,
      "name": "sessionIsOwner",
      "msg": "The session key must differ from the owner"
    },
    {
      "code": 6005,
      "name": "recipientIsSession",
      "msg": "The recipient cannot be the session key"
    },
    {
      "code": 6006,
      "name": "recipientIsVault",
      "msg": "The recipient cannot be the vault"
    },
    {
      "code": 6007,
      "name": "notSessionSigner",
      "msg": "Signer is not the mandate's session key"
    },
    {
      "code": 6008,
      "name": "unsupportedAction",
      "msg": "Mandate action is not supported by this instruction"
    },
    {
      "code": 6009,
      "name": "mandateIsRevoked",
      "msg": "Mandate has been revoked"
    },
    {
      "code": 6010,
      "name": "mandateAlreadyRevoked",
      "msg": "Mandate has already been revoked"
    },
    {
      "code": 6011,
      "name": "mandateExpired",
      "msg": "Mandate has expired"
    },
    {
      "code": 6012,
      "name": "exceedsPerActionLimit",
      "msg": "Amount exceeds the per-action limit"
    },
    {
      "code": 6013,
      "name": "exceedsTotalBudget",
      "msg": "Amount exceeds the remaining total budget"
    },
    {
      "code": 6014,
      "name": "destinationNotAllowed",
      "msg": "Destination is not the mandate's approved recipient"
    },
    {
      "code": 6015,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "action",
      "docs": [
        "Aksi yang boleh dilakukan session key. `Swap` ditambahkan di Step 15 (varian baru,",
        "layout data lama tetap valid)."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "transfer"
          }
        ]
      }
    },
    {
      "name": "createMandateParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "session",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "maxPerAction",
            "type": "u64"
          },
          {
            "name": "maxTotal",
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "mandate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "id",
            "docs": [
              "Nomor urut di vault; bagian dari seed PDA."
            ],
            "type": "u64"
          },
          {
            "name": "session",
            "docs": [
              "Kunci sementara milik agent. Satu-satunya yang boleh memanggil execute."
            ],
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "docs": [
              "Pemilik token account tujuan yang diizinkan."
            ],
            "type": "pubkey"
          },
          {
            "name": "action",
            "type": {
              "defined": {
                "name": "action"
              }
            }
          },
          {
            "name": "maxPerAction",
            "type": "u64"
          },
          {
            "name": "maxTotal",
            "type": "u64"
          },
          {
            "name": "spent",
            "docs": [
              "Total yang sudah dikeluarkan. Hanya naik."
            ],
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "revokedAt",
            "docs": [
              "0 = belum dicabut. Selain itu: waktu pencabutan (unix)."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mandateCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "mandate",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "session",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "maxPerAction",
            "type": "u64"
          },
          {
            "name": "maxTotal",
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "mandateRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mandate",
            "type": "pubkey"
          },
          {
            "name": "revokedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "transferExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mandate",
            "type": "pubkey"
          },
          {
            "name": "session",
            "type": "pubkey"
          },
          {
            "name": "destination",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "spent",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "Satu-satunya kunci yang boleh deposit, withdraw, membuat dan mencabut mandate."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Mint token yang disimpan vault ini."
            ],
            "type": "pubkey"
          },
          {
            "name": "nextMandateId",
            "docs": [
              "Id untuk mandate berikutnya. Hanya naik, tidak pernah turun (dipakai di 12b)."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
