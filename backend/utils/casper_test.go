package utils

import (
	"encoding/hex"
	"strings"
	"testing"
)

// TestPublicKeyToAccountHash_Ed25519 verifies correct account-hash computation for Ed25519 keys
func TestPublicKeyToAccountHash_Ed25519(t *testing.T) {
	// A valid 66-character Casper Ed25519 public key starting with "01"
	validPubKey := "017a7625244a8cc693fc058b4a37dde4bfa712983d13bb7ddc86c45c6ec5547dbe"
	
	hash, err := PublicKeyToAccountHash(validPubKey)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(hash) != 32 {
		t.Errorf("Expected 32-byte hash output, got length: %d", len(hash))
	}

	// Verify hex output format
	hashHex := hex.EncodeToString(hash)
	if len(hashHex) != 64 {
		t.Errorf("Expected 64-character hex string, got length: %d", len(hashHex))
	}
}

// TestPublicKeyToAccountHash_Secp256k1 verifies correct account-hash computation for Secp256k1 keys
func TestPublicKeyToAccountHash_Secp256k1(t *testing.T) {
	// A valid 66-character Casper Secp256k1 public key starting with "02"
	validPubKey := "0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813"
	
	hash, err := PublicKeyToAccountHash(validPubKey)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(hash) != 32 {
		t.Errorf("Expected 32-byte hash output, got length: %d", len(hash))
	}
}

// TestConvertAddressToDictionaryKey verifies standard BLAKE2b-256 Odra Address key serialization
func TestConvertAddressToDictionaryKey(t *testing.T) {
	validPubKey := "017a7625244a8cc693fc058b4a37dde4bfa712983d13bb7ddc86c45c6ec5547dbe"
	
	dictKey, err := ConvertAddressToDictionaryKey(validPubKey)
	if err != nil {
		t.Fatalf("Expected no error deriving dictionary key, got: %v", err)
	}

	if len(dictKey) != 64 {
		t.Errorf("Expected 64-character hex dictionary key output, got length: %d", len(dictKey))
	}

	// The derived key must only contain lowercase hexadecimal letters to prevent Casper state mismatches
	if strings.ToLower(dictKey) != dictKey {
		t.Errorf("Dictionary key must be returned in strict lowercase format, got: %s", dictKey)
	}
}

// TestPublicKeyToAccountHash_Errors checks boundary exception handlings for invalid keys
func TestPublicKeyToAccountHash_Errors(t *testing.T) {
	tests := []struct {
		name    string
		pubKey  string
		wantErr string
	}{
		{
			name:    "Invalid Length Too Short",
			pubKey:  "012a2d",
			wantErr: "invalid public key length",
		},
		{
			name:    "Invalid Length Too Long",
			pubKey:  "017a7625244a8cc693fc058b4a37dde4bfa712983d13bb7ddc86c45c6ec5547dbeffff",
			wantErr: "invalid public key length",
		},
		{
			name:    "Invalid Prefix Format",
			pubKey:  "097a7625244a8cc693fc058b4a37dde4bfa712983d13bb7ddc86c45c6ec5547dbe",
			wantErr: "unsupported public key algorithm prefix",
		},
		{
			name:    "Invalid Non-Hex Characters",
			pubKey:  "017a7625244a8cc693fc058b4a37dde4bfa712983d13bb7ddc86c45c6ec5547dbz",
			wantErr: "failed to decode public key hex",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := PublicKeyToAccountHash(tt.pubKey)
			if err == nil {
				t.Errorf("Expected error containing '%s', got nil", tt.wantErr)
				return
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("Expected error message to contain '%s', got: %v", tt.wantErr, err)
			}
		})
	}
}