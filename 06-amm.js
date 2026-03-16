import { Client, AccountSetAsfFlags, xrpToDrops } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");

/**
 * Convert a currency code longer than 3 characters to hex-padded format.
 */
function convertCurrencyCode(code) {
  if (code.length <= 3) return code;
  return Buffer.from(code).toString("hex").toUpperCase().padEnd(40, "0");
}

async function main() {
  await client.connect();
  console.log("Connected to XRPL Testnet");

  // ============================================
  // 1. Setup: issuer and liquidity provider
  // ============================================
  const { wallet: issuer } = await client.fundWallet();
  const { wallet: lp } = await client.fundWallet();

  console.log("\n--- Wallets ---");
  console.log("Issuer:", issuer.classicAddress);
  console.log("LP:", lp.classicAddress);

  const currencyCode = convertCurrencyCode("EUR");

  // ============================================
  // 2. Enable rippling on issuer
  // ============================================
  await client.submitAndWait(
    {
      TransactionType: "AccountSet",
      Account: issuer.classicAddress,
      SetFlag: AccountSetAsfFlags.asfDefaultRipple,
    },
    { autofill: true, wallet: issuer }
  );
  console.log("\nRippling enabled on issuer");

  // ============================================
  // 3. LP creates trust line and receives tokens
  // ============================================
  await client.submitAndWait(
    {
      TransactionType: "TrustSet",
      Account: lp.classicAddress,
      LimitAmount: {
        currency: currencyCode,
        issuer: issuer.classicAddress,
        value: "100000",
      },
    },
    { autofill: true, wallet: lp }
  );
  console.log("Trust line created");

  await client.submitAndWait(
    {
      TransactionType: "Payment",
      Account: issuer.classicAddress,
      Destination: lp.classicAddress,
      Amount: {
        currency: currencyCode,
        issuer: issuer.classicAddress,
        value: "10000",
      },
    },
    { autofill: true, wallet: issuer }
  );
  console.log("EUR issued to LP");

  // ============================================
  // 4. Create an AMM pool: EUR / XRP
  // ============================================
  const ammCreate = {
    TransactionType: "AMMCreate",
    Account: lp.classicAddress,
    Amount: {
      // Token side
      currency: currencyCode,
      issuer: issuer.classicAddress,
      value: "1000",
    },
    Amount2: xrpToDrops("500"), // XRP side
    TradingFee: 500, // 0.5% fee (in basis points, max 1000 = 1%)
  };

  const ammResult = await client.submitAndWait(ammCreate, {
    autofill: true,
    wallet: lp,
  });
  console.log(
    "\nAMM Pool Created:",
    ammResult.result.meta.TransactionResult
  );

  // ============================================
  // 5. Query AMM info
  // ============================================
  const ammInfo = await client.request({
    command: "amm_info",
    asset: {
      currency: currencyCode,
      issuer: issuer.classicAddress,
    },
    asset2: { currency: "XRP" },
  });

  const amm = ammInfo.result.amm;
  console.log("\n--- AMM Info ---");
  console.log("AMM Account:", amm.account);
  console.log("Asset 1:", amm.amount);
  console.log("Asset 2:", amm.amount2);
  console.log("LP Token:", amm.lp_token);
  console.log("Trading Fee:", amm.trading_fee, "bps");

  // ============================================
  // 6. Deposit more liquidity (single-sided XRP)
  // ============================================
  const ammDeposit = {
    TransactionType: "AMMDeposit",
    Account: lp.classicAddress,
    Asset: {
      currency: currencyCode,
      issuer: issuer.classicAddress,
    },
    Asset2: { currency: "XRP" },
    Amount: xrpToDrops("100"), // deposit 100 XRP
    Flags: 0x00080000, // tfSingleAsset
  };

  const depositResult = await client.submitAndWait(ammDeposit, {
    autofill: true,
    wallet: lp,
  });
  console.log(
    "\nAMM Deposit:",
    depositResult.result.meta.TransactionResult
  );

  // ============================================
  // 7. Withdraw liquidity (single-sided XRP)
  // ============================================
  const ammWithdraw = {
    TransactionType: "AMMWithdraw",
    Account: lp.classicAddress,
    Asset: {
      currency: currencyCode,
      issuer: issuer.classicAddress,
    },
    Asset2: { currency: "XRP" },
    Amount: xrpToDrops("50"), // withdraw 50 XRP
    Flags: 0x00080000, // tfSingleAsset
  };

  const withdrawResult = await client.submitAndWait(ammWithdraw, {
    autofill: true,
    wallet: lp,
  });
  console.log(
    "AMM Withdraw:",
    withdrawResult.result.meta.TransactionResult
  );

  // ============================================
  // 8. Final AMM state
  // ============================================
  const finalInfo = await client.request({
    command: "amm_info",
    asset: {
      currency: currencyCode,
      issuer: issuer.classicAddress,
    },
    asset2: { currency: "XRP" },
  });

  console.log("\n--- Final AMM State ---");
  console.log("Asset 1:", finalInfo.result.amm.amount);
  console.log("Asset 2:", finalInfo.result.amm.amount2);
  console.log("LP Token:", finalInfo.result.amm.lp_token);

  // ============================================
  // 9. LP final balances
  // ============================================
  const lpBalances = await client.getBalances(lp.classicAddress);
  console.log("\n--- LP Balances ---");
  console.log(lpBalances);

  await client.disconnect();
  console.log("\nDisconnected.");
}

main();
