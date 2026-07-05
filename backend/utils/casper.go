package utils

import (
	"encoding/hex"
	"fmt"
	"strings"

	"golang.org/x/crypto/blake2b"
)

// PublicKeyToAccountHash computes the Casper account-hash representation from a public key hex
func PublicKeyToAccountHash(publicKeyHex string) ([]byte, error) {
	// Clean public key string
	pubKey := strings.TrimSpace(publicKeyHex)
	if len(pubKey) != 66 {
		return nil, fmt.Errorf("invalid public key length: expected 66 characters, got %d", len(pubKey))
	}

	algoByte := pubKey[0:2]
	keyBytes, err := hex.DecodeString(pubKey[2:])
	if err != nil {
		return nil, fmt.Errorf("failed to decode public key hex: %v", err)
	}

	var payload []byte
	switch algoByte {
	case "01": // Ed25519
		payload = append([]byte("ed25519"), 0x00)
		payload = append(payload, keyBytes...)
	case "02": // Secp256k1
		payload = append([]byte("secp256k1"), 0x00)
		payload = append(payload, keyBytes...)
	default:
		return nil, fmt.Errorf("unsupported public key algorithm prefix: %s", algoByte)
	}

	// BLAKE2b-256 hash of the algorithmic payload
	hash, err := blake2b.New256(nil)
	if err != nil {
		return nil, err
	}
	hash.Write(payload)
	return hash.Sum(nil), nil
}

// ConvertAddressToDictionaryKey serializes an Address type into its on-chain Odra dictionary storage key
func ConvertAddressToDictionaryKey(publicKeyHex string) (string, error) {
	accountHash, err := PublicKeyToAccountHash(publicKeyHex)
	if err != nil {
		return "", err
	}

	// Odra Address::Account serialization format:
	// - Tag byte: 0x00 (represents Account)
	// - Value bytes: 32 bytes of the Account Hash
	serializedAddress := make([]byte, 33)
	serializedAddress[0] = 0x00 // Account variant tag prefix
	copy(serializedAddress[1:], accountHash)

	// Hash the serialized Address bytes with BLAKE2b-256
	hash, err := blake2b.New256(nil)
	if err != nil {
		return "", err
	}
	hash.Write(serializedAddress)
	dictionaryKeyBytes := hash.Sum(nil)

	// Hex-encoded string (64 characters)
	return hex.EncodeToString(dictionaryKeyBytes), nil
}

// StringsTrim is a modular string formatting utility
func StringsTrim(val string) string {
	return strings.TrimSpace(val)
}