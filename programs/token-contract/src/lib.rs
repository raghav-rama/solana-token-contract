use anchor_lang::prelude::*;
use anchor_spl::token::{MintTo, Token, mint_to, Transfer, transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_contract {

    use super::*;

    pub fn mint_token(ctx: Context<MintToken>) -> Result<()> {
        // create MintTo struct for out context
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        // create the cpicontext that we need for the request
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        mint_to(cpi_ctx, 5)?;
        Ok(())
    }

    pub fn transfer_token(ctx: Context<TransferToken>) -> Result<()> {
        // create the transfer struct for our context
        let transfer_instruction = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, transfer_instruction);
        transfer(cpi_ctx, 2)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintToken<'info> {
    /// CHECK: this is the token we mwant to mint
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,

    /// CHECK: this is the token account we want to mint tokens to
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// CHECK: the authority of the mint account
    // #[account(mut)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct TransferToken<'info> {
    pub token_program: Program<'info, Token>,
    /// CHECK: the associated token account that we are transferring the token from
    #[account(mut)]
    pub from: UncheckedAccount<'info>,

    /// CHECK: the associated token account that we transferring to
    #[account(mut)]
    pub to: AccountInfo<'info>,

    /// CHECK: the authority of the from account
    pub from_authority: Signer<'info>
}
