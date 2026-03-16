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
  // 1. Setup: issuer, trader1, trader2
  // ============================================
  const { wallet: issuer } = await client.fundWallet();
  const { wallet: trader1 } = await client.fundWallet();
  const { wallet: trader2 } = await client.fundWallet();

  console.log("\n--- Wallets ---");
  console.log("Issuer:", issuer.classicAddress);
  console.log("Trader 1:", trader1.classicAddress);
  console.log("Trader 2:", trader2.classicAddress);

  const currencyCode = convertCurrencyCode("USD");

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
  // 3. Both traders set up trust lines
  // ============================================
  for (const trader of [trader1, trader2]) {
    await client.submitAndWait(
      {
        TransactionType: "TrustSet",
        Account: trader.classicAddress,
        LimitAmount: {
          currency: currencyCode,
          issuer: issuer.classicAddress,
          value: "10000",
        },
      },
      { autofill: true, wallet: trader }
    );
  }
  console.log("Trust lines created for both traders");

  // ============================================
  // 4. Issuer sends USD to both traders
  // ============================================
  for (const trader of [trader1, trader2]) {
    await client.submitAndWait(
      {
        TransactionType: "Payment",
        Account: issuer.classicAddress,
        Destination: trader.classicAddress,
        Amount: {
          currency: currencyCode,
          issuer: issuer.classicAddress,
          value: "1000",
        },
      },
      { autofill: true, wallet: issuer }
    );
  }
  console.log("USD issued to both traders");

  // ============================================
  // 5. Trader 1 creates a SELL offer:
  //    Selling 100 USD for 50 XRP
  // ============================================
  const sellOffer = {
    TransactionType: "OfferCreate",
    Account: trader1.classicAddress,
    TakerGets: {
      // what the offer creator is selling
      currency: currencyCode,
      issuer: issuer.classicAddress,
      value: "100",
    },
    TakerPays: xrpToDrops("50"), // what the offer creator wants in return
  };

  const sellResult = await client.submitAndWait(sellOffer, {
    autofill: true,
    wallet: trader1,
  });
  console.log(
    "\nSell Offer Created:",
    sellResult.result.meta.TransactionResult
  );

  // ============================================
  // 6. Trader 2 creates a BUY offer:
  //    Buying 100 USD for 50 XRP
  //    (this will cross with Trader 1's offer)
  // ============================================
  const buyOffer = {
    TransactionType: "OfferCreate",
    Account: trader2.classicAddress,
    TakerGets: xrpToDrops("50"), // trader2 gives 50 XRP
    TakerPays: {
      // trader2 wants 100 USD
      currency: currencyCode,
      issuer: issuer.classicAddress,
      value: "100",
    },
  };

  const buyResult = await client.submitAndWait(buyOffer, {
    autofill: true,
    wallet: trader2,
  });
  console.log(
    "Buy Offer Created (should cross):",
    buyResult.result.meta.TransactionResult
  );

  // ============================================
  // 7. Check final balances
  // ============================================
  const balances1 = await client.getBalances(trader1.classicAddress);
  const balances2 = await client.getBalances(trader2.classicAddress);

  console.log("\n--- Final Balances ---");
  console.log("Trader 1:", balances1);
  console.log("Trader 2:", balances2);

  // ============================================
  // 8. Check remaining offers on the book
  // ============================================
  const offers1 = await client.request({
    command: "account_offers",
    account: trader1.classicAddress,
  });
  const offers2 = await client.request({
    command: "account_offers",
    account: trader2.classicAddress,
  });

  console.log("\n--- Remaining Offers ---");
  console.log("Trader 1 offers:", offers1.result.offers.length);
  console.log("Trader 2 offers:", offers2.result.offers.length);

  await client.disconnect();
  console.log("\nDisconnected.");
}

main();
