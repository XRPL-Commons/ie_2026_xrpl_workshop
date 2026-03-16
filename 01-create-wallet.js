import { Client, Wallet } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");

async function main() {
  await client.connect();
  console.log("Connected to XRPL Testnet");

  // ============================================
  // 1. Generate a wallet (offline - no funding)
  // ============================================
  const wallet = Wallet.generate();
  console.log("\n--- Generated Wallet (not funded) ---");
  console.log("Address:", wallet.classicAddress);
  console.log("Public Key:", wallet.publicKey);
  console.log("Private Key:", wallet.privateKey);
  console.log("Seed:", wallet.seed);

  // ============================================
  // 2. Fund a wallet via the testnet faucet
  // ============================================
  const { wallet: fundedWallet, balance } = await client.fundWallet();
  console.log("\n--- Funded Wallet ---");
  console.log("Address:", fundedWallet.classicAddress);
  console.log("Seed:", fundedWallet.seed);
  console.log("Balance:", balance, "XRP");

  // ============================================
  // 3. Restore a wallet from an existing seed
  // ============================================
  const restoredWallet = Wallet.fromSeed(fundedWallet.seed);
  console.log("\n--- Restored Wallet (from seed) ---");
  console.log("Address:", restoredWallet.classicAddress);
  console.log(
    "Same address?",
    restoredWallet.classicAddress === fundedWallet.classicAddress
  );

  // ============================================
  // 4. Check balances on-ledger
  // ============================================
  const balances = await client.getBalances(fundedWallet.classicAddress);
  console.log("\n--- On-Ledger Balances ---");
  console.log(balances);

  await client.disconnect();
  console.log("\nDisconnected.");
}

main();
