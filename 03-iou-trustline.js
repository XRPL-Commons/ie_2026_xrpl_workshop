import { Client, AccountSetAsfFlags } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");

/**
 * Convert a currency code longer than 3 characters to hex-padded format.
 * Standard currency codes (3 chars) are used as-is.
 */
function convertCurrencyCode(code) {
  if (code.length <= 3) return code;
  return Buffer.from(code).toString("hex").toUpperCase().padEnd(40, "0");
}

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

  const currencyCode = convertCurrencyCode("EUR");

  // ============================================
  // 2. Enable rippling on the issuer account
  //    (required for issuing tokens)
  // ============================================
  const accountSet = {
    TransactionType: "AccountSet",
    Account: issuer.classicAddress,
    SetFlag: AccountSetAsfFlags.asfDefaultRipple,
  };

  const accountSetResult = await client.submitAndWait(accountSet, {
    autofill: true,
    wallet: issuer,
  });
  console.log(
    "\nEnable Rippling:",
    accountSetResult.result.meta.TransactionResult
  );

  // ============================================
  // 3. Create a trust line (holder trusts issuer)
  // ============================================
  const trustSet = {
    TransactionType: "TrustSet",
    Account: holder.classicAddress,
    LimitAmount: {
      currency: currencyCode,
      issuer: issuer.classicAddress,
      value: "10000", // max amount the holder trusts
    },
  };

  const trustResult = await client.submitAndWait(trustSet, {
    autofill: true,
    wallet: holder,
  });
  console.log(
    "Trust Line Created:",
    trustResult.result.meta.TransactionResult
  );

  // ============================================
  // 4. Issue tokens (issuer sends EUR to holder)
  // ============================================
  const payment = {
    TransactionType: "Payment",
    Account: issuer.classicAddress,
    Destination: holder.classicAddress,
    Amount: {
      currency: currencyCode,
      issuer: issuer.classicAddress,
      value: "1000",
    },
  };

  const paymentResult = await client.submitAndWait(payment, {
    autofill: true,
    wallet: issuer,
  });
  console.log(
    "IOU Payment Sent:",
    paymentResult.result.meta.TransactionResult
  );

  // ============================================
  // 5. Check balances
  // ============================================
  const holderBalances = await client.getBalances(holder.classicAddress);
  console.log("\n--- Holder Balances ---");
  console.log(holderBalances);

  await client.disconnect();
  console.log("\nDisconnected.");
}

main();
