import { Client } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");

async function main() {
  await client.connect();
  console.log("Connected to XRPL Testnet");

  // ============================================
  // 1. Create issuer and holder wallets
  // ============================================
  const { wallet: issuer } = await client.fundWallet();
  const { wallet: holder } = await client.fundWallet();

  console.log("\n--- Wallets ---");
  console.log("Issuer:", issuer.classicAddress);
  console.log("Holder:", holder.classicAddress);

  // ============================================
  // 2. Create a Multi-Purpose Token (MPT)
  // ============================================
  const metadata = {
    name: "IE Madrid Workshop Token",
    symbol: "IEWT",
    description: "Workshop demo token",
  };

  const mptCreate = {
    TransactionType: "MPTokenIssuanceCreate",
    Account: issuer.classicAddress,
    AssetScale: 2, // 2 decimal places
    MaximumAmount: "1000000",
    TransferFee: 100, // 0.1% transfer fee (in basis points out of 50,000)
    Flags: 2 + 32, // canLock (2) + canTransfer (32)
    MPTokenMetadata: Buffer.from(JSON.stringify(metadata)).toString("hex"),
  };

  const createResult = await client.submitAndWait(mptCreate, {
    autofill: true,
    wallet: issuer,
  });
  console.log(
    "\nMPT Created:",
    createResult.result.meta.TransactionResult
  );

  // Extract the MPTokenIssuanceID from the created object
  const mptIssuanceID =
    createResult.result.meta.mpt_issuance_id;
  console.log("MPT Issuance ID:", mptIssuanceID);

  // ============================================
  // 3. Holder authorizes (opts-in) to hold the MPT
  // ============================================
  const mptAuthorize = {
    TransactionType: "MPTokenAuthorize",
    Account: holder.classicAddress,
    MPTokenIssuanceID: mptIssuanceID,
  };

  const authResult = await client.submitAndWait(mptAuthorize, {
    autofill: true,
    wallet: holder,
  });
  console.log(
    "Holder Authorized:",
    authResult.result.meta.TransactionResult
  );

  // ============================================
  // 4. Send MPT from issuer to holder
  // ============================================
  const mptPayment = {
    TransactionType: "Payment",
    Account: issuer.classicAddress,
    Destination: holder.classicAddress,
    Amount: {
      mpt_issuance_id: mptIssuanceID,
      value: "500",
    },
  };

  const payResult = await client.submitAndWait(mptPayment, {
    autofill: true,
    wallet: issuer,
  });
  console.log(
    "MPT Payment Sent:",
    payResult.result.meta.TransactionResult
  );

  // ============================================
  // 5. Check holder balances
  // ============================================
  const holderBalances = await client.getBalances(holder.classicAddress);
  console.log("\n--- Holder Balances ---");
  console.log(holderBalances);

  await client.disconnect();
  console.log("\nDisconnected.");
}

main();
