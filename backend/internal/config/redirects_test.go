package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateRedirectURL_AllowsRelativePath(t *testing.T) {
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "example.test,www.example.test")

	got, err := ValidateRedirectURL("/business/register/success", false)

	require.NoError(t, err)
	assert.Equal(t, "/business/register/success", got)
}

func TestValidateRedirectURL_RejectsProtocolRelative(t *testing.T) {
	_, err := ValidateRedirectURL("//evil.example/path", false)

	assert.Error(t, err)
}

func TestValidateRedirectURL_RejectsRelativePathsWithBackslashes(t *testing.T) {
	for _, raw := range []string{`/\evil.example/path`, `/\/evil.example`, `/\\evil.example`} {
		t.Run(raw, func(t *testing.T) {
			_, err := ValidateRedirectURL(raw, false)
			assert.Error(t, err)
		})
	}
}

func TestValidateRedirectURL_AllowsNamakdanHTTPS(t *testing.T) {
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "example.test,www.example.test")

	got, err := ValidateRedirectURL("https://example.test/payment/success", true)

	require.NoError(t, err)
	assert.Equal(t, "https://example.test/payment/success", got)
}

func TestValidateRedirectURL_RejectsExternalHTTPS(t *testing.T) {
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "example.test")

	_, err := ValidateRedirectURL("https://evil.example/payment/success", true)

	assert.Error(t, err)
}

func TestValidateRedirectURL_AllowsLocalhostOnlyOutsideProduction(t *testing.T) {
	got, err := ValidateRedirectURL("http://localhost:3000/payment/success", false)

	require.NoError(t, err)
	assert.Equal(t, "http://localhost:3000/payment/success", got)

	_, err = ValidateRedirectURL("http://localhost:3000/payment/success", true)
	assert.Error(t, err)
}

func TestValidateRedirectURL_RejectsProductionLoopbackEvenWhenAllowlisted(t *testing.T) {
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "localhost,localhost.,127.0.0.1,127.42.1.9,::1")

	for _, raw := range []string{
		"https://localhost/payment/success",
		"https://localhost./payment/success",
		"https://127.0.0.1/payment/success",
		"https://127.42.1.9/payment/success",
		"https://[::1]/payment/success",
	} {
		t.Run(raw, func(t *testing.T) {
			_, err := ValidateRedirectURL(raw, true)
			assert.Error(t, err)
		})
	}
}

func TestValidateRedirectURL_RejectsProductionLoopbackFromAppDomain(t *testing.T) {
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "")
	t.Setenv("APP_DOMAIN", "localhost")

	_, err := ValidateRedirectURL("https://localhost/payment/success", true)

	assert.Error(t, err)
}

func TestValidateRedirectURL_DevelopmentHTTPSLocalhostRequiresAllowlist(t *testing.T) {
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "")
	t.Setenv("APP_DOMAIN", "")
	_, err := ValidateRedirectURL("https://localhost/payment/success", false)
	assert.Error(t, err)

	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "localhost")
	got, err := ValidateRedirectURL("https://localhost/payment/success", false)
	require.NoError(t, err)
	assert.Equal(t, "https://localhost/payment/success", got)
}

func TestValidateRedirectURL_RejectsLocalhostWhenProductionOverrideSet(t *testing.T) {
	t.Setenv("ENV", "")
	t.Setenv("APP_ENV", "")
	SetProductionModeOverride(true)
	t.Cleanup(func() {
		SetProductionModeOverride(false)
	})

	_, err := ValidateRedirectURL("http://localhost:3000/payment/success", IsProductionMode(false))

	assert.Error(t, err)
}

func TestValidateRedirectURL_AppendsAppDomainDefault(t *testing.T) {
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "")
	t.Setenv("APP_DOMAIN", "app.example.test")

	got, err := ValidateRedirectURL("https://app.example.test/payment/success", true)

	require.NoError(t, err)
	assert.Equal(t, "https://app.example.test/payment/success", got)
}

func TestValidateRedirectURL_NormalizesAllowedRedirectDomains(t *testing.T) {
	for _, allowed := range []string{"https://example.test", "example.test:443"} {
		t.Run(allowed, func(t *testing.T) {
			t.Setenv("ALLOWED_REDIRECT_DOMAINS", allowed)

			got, err := ValidateRedirectURL("https://example.test/payment/success", true)

			require.NoError(t, err)
			assert.Equal(t, "https://example.test/payment/success", got)
		})
	}
}

func TestValidateRedirectURL_RejectsMalformedAndMissingHost(t *testing.T) {
	for _, raw := range []string{"", "   ", "https://", "payment/success", "mailto:ops@example.test"} {
		t.Run(raw, func(t *testing.T) {
			_, err := ValidateRedirectURL(raw, false)
			assert.Error(t, err)
		})
	}
}

func TestValidateRedirectURL_AllowsRelativePathWithQuery(t *testing.T) {
	got, err := ValidateRedirectURL("/payment/success?bill=B1", true)

	require.NoError(t, err)
	assert.Equal(t, "/payment/success?bill=B1", got)
}

func TestFrontendURLBuildsAbsoluteURL(t *testing.T) {
	t.Setenv("PUBLIC_URL", "https://example.test/")

	got := FrontendURL("/payment/success?bill=B1")

	assert.Equal(t, "https://example.test/payment/success?bill=B1", got)
}

func TestAbsoluteRedirectURL_ConvertsRelativePathToFrontendURL(t *testing.T) {
	t.Setenv("PUBLIC_URL", "https://example.test/")
	t.Setenv("ALLOWED_REDIRECT_DOMAINS", "example.test")

	got, err := AbsoluteRedirectURL("/payment/success?bill=B1", true)

	require.NoError(t, err)
	assert.Equal(t, "https://example.test/payment/success?bill=B1", got)
}

func TestAbsoluteRedirectURL_RejectsLocalhostFrontendURLInProduction(t *testing.T) {
	t.Setenv("PUBLIC_URL", "http://localhost:3000")

	_, err := AbsoluteRedirectURL("/payment/success?bill=B1", true)

	assert.Error(t, err)
}
