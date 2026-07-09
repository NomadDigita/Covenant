#![cfg_attr(target_arch = "wasm32", no_std)]

use odra::prelude::string::String;
use odra::prelude::vec::Vec;
use odra::prelude::vec;       // Required for macro vec resolution
use odra::prelude::BTreeSet;  // Required for #[odra::module] macros
use odra::module::Module;     // Import the Module trait to enable self.env()
use odra::casper_types::U512; // Casper-native big integer type for payments
use odra::{Address, Mapping, Var, UnwrapOrRevert};

// ─── ON-CHAIN EVENT SCHEMAS ─────────────────────────────────────────────────

#[derive(odra::Event, PartialEq, Eq, Debug)]
pub struct AgentRegistered {
    pub agent_address: Address,
    pub name: String,
    pub timestamp: u64,
}

#[derive(odra::Event, PartialEq, Eq, Debug)]
pub struct ScoreUpdated {
    pub agent_address: Address,
    pub new_score: u32,
    pub updated_by: Address,
}

#[derive(odra::Event, PartialEq, Eq, Debug)]
pub struct CreditUpdated {
    pub agent_address: Address,
    pub new_score: u32,
    pub updated_by: Address,
}

#[derive(odra::Event, PartialEq, Eq, Debug)]
pub struct PaymentLogged {
    pub sender: Address,
    pub recipient: Address,
    pub amount: U512,
}

#[derive(odra::Event, PartialEq, Eq, Debug)]
pub struct Withdrawal {
    pub account: Address,
    pub amount: U512,
}

#[derive(odra::Event, PartialEq, Eq, Debug)]
pub struct GovernorGranted {
    pub admin: Address,
    pub new_governor: Address,
}

#[derive(odra::Event, PartialEq, Eq, Debug)]
pub struct GovernorRevoked {
    pub admin: Address,
    pub revoked_governor: Address,
}

// ─── DATA STRUCTURES ─────────────────────────────────────────────────────────

#[derive(odra::OdraType)]
pub struct AgentProfile {
    pub name: String,
    pub owner: Address,
    pub capabilities: Vec<String>,
    pub version: String,
    pub registered_at: u64,
}

#[derive(odra::OdraType)]
pub struct Job {
    pub creator: Address,
    pub provider: Address,
    pub budget: u64,
    pub is_active: bool,
    pub is_completed: bool,
}

// ─── COVENANT ID: AGENT REGISTRY CONTRACT ────────────────────────────────────

#[odra::module]
pub struct AgentRegistry {
    profiles: Mapping<Address, AgentProfile>,
}

#[odra::module]
impl AgentRegistry {
    #[odra(init)]
    pub fn init(&mut self) {}

    pub fn register_agent(&mut self, name: String, capabilities: Vec<String>, version: String) {
        // STRICT METADATA VALUE AND STORAGE LENGTH SAFEGUARDS
        assert!(name.len() >= 2 && name.len() <= 100, "Registration failed: name must be between 2 and 100 characters.");
        assert!(capabilities.len() <= 10, "Registration failed: capability tag list cannot contain more than 10 entries.");
        assert!(version.len() <= 20, "Registration failed: version identifier cannot exceed 20 characters.");

        for cap in capabilities.iter() {
            assert!(cap.len() >= 2 && cap.len() <= 50, "Registration failed: capability string size limits exceeded.");
        }

        let caller = self.env().caller();
        let timestamp = self.env().get_block_time();

        let profile = AgentProfile {
            name: name.clone(),
            owner: caller,
            capabilities,
            version,
            registered_at: timestamp,
        };

        self.profiles.set(&caller, profile);

        self.env().emit_event(AgentRegistered {
            agent_address: caller,
            name,
            timestamp,
        });
    }

    pub fn get_agent(&self, wallet: Address) -> Option<AgentProfile> {
        self.profiles.get(&wallet)
    }
}

// ─── COVENANT SCORE: REPUTATION CONTRACT ─────────────────────────────────────

#[odra::module]
pub struct ReputationContract {
    scores: Mapping<Address, u32>,
    governors: Mapping<Address, bool>,
}

#[odra::module]
impl ReputationContract {
    #[odra(init)]
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.governors.set(&caller, true);
    }

    pub fn is_governor(&self, address: Address) -> bool {
        self.governors.get(&address).unwrap_or(false)
    }

    pub fn get_score(&self, agent: Address) -> u32 {
        self.scores.get(&agent).unwrap_or(500)
    }

    pub fn update_score(&mut self, agent: Address, new_score: u32) {
        let caller = self.env().caller();
        let is_auth = self.governors.get(&caller).unwrap_or(false);

        assert!(is_auth, "Only authorized Governors can adjust trust scores.");
        assert!(new_score <= 1000, "Trust score bounds violation: cannot exceed 1000.");

        self.scores.set(&agent, new_score);

        self.env().emit_event(ScoreUpdated {
            agent_address: agent,
            new_score,
            updated_by: caller,
        });
    }

    pub fn grant_governor(&mut self, new_governor: Address) {
        let caller = self.env().caller();
        let is_auth = self.governors.get(&caller).unwrap_or(false);
        assert!(is_auth, "Only existing Governors can grant governance roles.");
        
        self.governors.set(&new_governor, true);

        self.env().emit_event(GovernorGranted {
            admin: caller,
            new_governor,
        });
    }

    pub fn revoke_governor(&mut self, target_governor: Address) {
        let caller = self.env().caller();
        let is_auth = self.governors.get(&caller).unwrap_or(false);
        assert!(is_auth, "Only existing Governors can revoke governance roles.");
        assert_ne!(caller, target_governor, "Self-revocation prohibited to prevent governance lockouts.");

        self.governors.set(&target_governor, false);

        self.env().emit_event(GovernorRevoked {
            admin: caller,
            revoked_governor: target_governor,
        });
    }
}

// ─── COVENANT CREDIT: CREDIT CONTRACT ────────────────────────────────────────

#[odra::module]
pub struct CreditContract {
    credit_scores: Mapping<Address, u32>,
    governors: Mapping<Address, bool>,
}

#[odra::module]
impl CreditContract {
    #[odra(init)]
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.governors.set(&caller, true);
    }

    pub fn is_governor(&self, address: Address) -> bool {
        self.governors.get(&address).unwrap_or(false)
    }

    pub fn get_credit_score(&self, agent: Address) -> u32 {
        self.credit_scores.get(&agent).unwrap_or(500)
    }

    pub fn update_credit(&mut self, agent: Address, new_score: u32) {
        let caller = self.env().caller();
        let is_auth = self.governors.get(&caller).unwrap_or(false);

        assert!(is_auth, "Only authorized Governors can adjust credit scores.");
        assert!(new_score <= 1000, "Credit score bounds violation: cannot exceed 1000.");

        self.credit_scores.set(&agent, new_score);

        self.env().emit_event(CreditUpdated {
            agent_address: agent,
            new_score,
            updated_by: caller,
        });
    }

    pub fn grant_governor_credit(&mut self, new_governor: Address) {
        let caller = self.env().caller();
        let is_auth = self.governors.get(&caller).unwrap_or(false);
        assert!(is_auth, "Only existing Governors can grant governance roles.");
        
        self.governors.set(&new_governor, true);

        self.env().emit_event(GovernorGranted {
            admin: caller,
            new_governor,
        });
    }

    pub fn revoke_governor_credit(&mut self, target_governor: Address) {
        let caller = self.env().caller();
        let is_auth = self.governors.get(&caller).unwrap_or(false);
        assert!(is_auth, "Only existing Governors can revoke governance roles.");
        assert_ne!(caller, target_governor, "Self-revocation prohibited to prevent governance lockouts.");

        self.governors.set(&target_governor, false);

        self.env().emit_event(GovernorRevoked {
            admin: caller,
            revoked_governor: target_governor,
        });
    }
}

// ─── COVENANT PAY: MACHINE-TO-MACHINE MICROPAYMENTS ──────────────────────────

#[odra::module]
pub struct PaymentContract {
    balances: Mapping<Address, U512>,
}

#[odra::module]
impl PaymentContract {
    #[odra(init)]
    pub fn init(&mut self) {}

    /// Deposit CSPR into the contract balance sheet for the caller.
    pub fn deposit(&mut self) {
        let caller = self.env().caller();
        let amount = self.env().attached_value();
        let current_balance = self.balances.get(&caller).unwrap_or(U512::zero());
        self.balances.set(&caller, current_balance + amount);
    }

    /// Transfer balance between two internal accounts.
    pub fn execute_micropayment(&mut self, recipient: Address, amount: U512) {
        let sender = self.env().caller();
        let sender_bal = self.balances.get(&sender).unwrap_or(U512::zero());

        assert!(sender_bal >= amount, "Insufficient on-chain balance.");

        self.balances.set(&sender, sender_bal - amount);

        let recipient_bal = self.balances.get(&recipient).unwrap_or(U512::zero());
        self.balances.set(&recipient, recipient_bal + amount);

        self.env().emit_event(PaymentLogged {
            sender,
            recipient,
            amount,
        });
    }

    /// Withdraw the caller's full balance back to their account as native CSPR.
    pub fn withdraw(&mut self) {
        let caller = self.env().caller();
        let amount = self.balances.get(&caller).unwrap_or(U512::zero());
        assert!(amount > U512::zero(), "No balance to withdraw.");

        // Zero out first to prevent re-entrancy
        self.balances.set(&caller, U512::zero());

        self.env().transfer_tokens(&caller, &amount);

        self.env().emit_event(Withdrawal {
            account: caller,
            amount,
        });
    }

    pub fn get_balance(&self, wallet: Address) -> U512 {
        self.balances.get(&wallet).unwrap_or(U512::zero())
    }
}