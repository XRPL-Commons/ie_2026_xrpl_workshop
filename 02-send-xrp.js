import { Client, xrpToDrops } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");

async function main() {
  await client.connect();
  console.log("Connected to XRPL Testnet");

  // ============================================
  // 1. Create and fund two wallets
  // ============================================
  const { wallet: wallet1, balance: balance1 } = await client.fundWallet();
  const { wallet: wallet2, balance: balance2 } = await client.fundWallet();

  console.log("\n--- Wallets ---");
  console.log(`Wallet 1: ${wallet1.classicAddress} (${balance1} XRP)`);
  console.log(`Wallet 2: ${wallet2.classicAddress} (${balance2} XRP)`);

  // ============================================
  // 2. Build a Payment transaction
  // ============================================
  const payment = {
    TransactionType: "Payment",
    Account: wallet1.classicAddress,
    Destination: wallet2.classicAddress,
    Amount: xrpToDrops("13.37"), // XRP amounts are in drops (1 XRP = 1,000,000 drops)
  };

  console.log("\n--- Submitting Payment (13.37 XRP) ---");

  // ============================================
  // 3. Submit and wait for validation
  // ============================================
  const result = await client.submitAndWait(payment, {
    autofill: true, // auto-fills Fee, Sequence, LastLedgerSequence
    wallet: wallet1,
  });

  console.log(
    "Transaction result:",
    result.result.meta.TransactionResult
  );
  console.log("Transaction hash:", result.result.hash);

  // ============================================
  // 4. Check updated balances
  // ============================================
  const balancesW1 = await client.getBalances(wallet1.classicAddress);
  const balancesW2 = await client.getBalances(wallet2.classicAddress);

  console.log("\n--- Updated Balances ---");
  console.log("Wallet 1:", balancesW1);
  console.log("Wallet 2:", balancesW2);

  await client.disconnect();
  console.log("\nDisconnected.");
}

main();
