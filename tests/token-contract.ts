import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenContract } from "../target/types/token_contract";
import {
  MINT_SIZE,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { assert } from "chai";

describe("token-contract", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  //retrieve the tokencontract struct from our smart contract
  const program = anchor.workspace.TokenContract as Program<TokenContract>;

  //Generate a keypair that will represent our token
  const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();

  //AssociatedTokenAccount for anchor's workspace wallet
  let associatedTokenAccount = undefined;

  it("Mint Token:", async () => {
    //get anchor wallet's pubkey
    const key = anchor.AnchorProvider.env().wallet.publicKey;

    //Get the amount of SOL to pay rent for your token mint
    const lamports: number =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        MINT_SIZE
      );

    //Get the ATA for the token and the account that we want to own the ATA
    associatedTokenAccount = await getAssociatedTokenAddress(
      mintKey.publicKey,
      key
    );

    //List of instructions
    const mint_tx = new anchor.web3.Transaction().add(
      //use anchor to create an account from the mintkKey that we created
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: key,
        newAccountPubkey: mintKey.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
        lamports,
      }),

      //Fire a txn to create our mint account thst is controlled by our anchor wallet
      createInitializeMintInstruction(mintKey.publicKey, 0, key, key),

      //create the ATA for our mint on our anchor wallet
      createAssociatedTokenAccountInstruction(
        key,
        associatedTokenAccount,
        key,
        mintKey.publicKey
      )
    );

    //send and create the txn
    const res = await anchor.AnchorProvider.env().sendAndConfirm(mint_tx, [
      mintKey,
    ]);

    console.log(
      await program.provider.connection.getParsedAccountInfo(mintKey.publicKey)
    );

    console.log(`Account:`, res);
    console.log(`Mint Key:`, mintKey.publicKey.toString());
    console.log(`User:`, key.toString());

    //Execute the code for minting our token into ATA
    await program.methods
      .mintToken()
      .accounts({
        mint: mintKey.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccount: associatedTokenAccount,
        authority: key,
      })
      .rpc();

    //get the amount of tokens minted
    const minted = (
      await program.provider.connection.getTokenAccountBalance(
        associatedTokenAccount
      )
    ).value.amount;

    assert.equal(minted, "5");
  });

  it("Transfer Token", async () => {
    //Get anchor wallet's pubkey
    const myWallet = anchor.AnchorProvider.env().wallet.publicKey;

    //Wallet that will receive the token
    const toWallet: anchor.web3.Keypair = anchor.web3.Keypair.generate();

    //The ATA for a token on the toWallet
    const toATA = await getAssociatedTokenAddress(
      mintKey.publicKey,
      toWallet.publicKey
    );

    //List of instructions
    const mint_tx = new anchor.web3.Transaction().add(
      //Create the ATA that is associated to out toWallet
      createAssociatedTokenAccountInstruction(
        myWallet,
        toATA,
        toWallet.publicKey,
        mintKey.publicKey
      )
    );

    //send and create the txn
    await anchor.AnchorProvider.env().sendAndConfirm(mint_tx);

    //Execute our transfer smart contract
    await program.methods
      .transferToken()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        from: associatedTokenAccount,
        to: toATA,
        fromAuthority: myWallet,
      })
      .rpc();

    //Get transfered token amount on the ATA
    const remaining = (
      await program.provider.connection.getTokenAccountBalance(
        associatedTokenAccount
      )
    ).value.amount;

    assert.equal(remaining, "3");
  });
});
