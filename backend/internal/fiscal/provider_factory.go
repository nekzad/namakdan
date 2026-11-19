package fiscal

import (
	"context"

	"github.com/nekzad/namakdan/backend/internal/database"
)

// ProviderFactory builds a ready-to-use Provider from the business's persisted
// fiscal settings. Implementations are responsible for decrypting credentials,
// parsing certificate bundles, and constructing the appropriate SOAP/REST
// clients for the given country+provider combination.
//
// Implementations must never log key material.
type ProviderFactory interface {
	Build(ctx context.Context, settings *database.BusinessFiscalSettings) (Provider, error)
}
