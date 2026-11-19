package s3

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

type assetDoerFunc func(*http.Request) (*http.Response, error)

func (fn assetDoerFunc) Do(req *http.Request) (*http.Response, error) { return fn(req) }

func TestDownloadPublicAssetResponseContract(t *testing.T) {
	client := assetDoerFunc(func(req *http.Request) (*http.Response, error) {
		status := http.StatusOK
		body := []byte("bytes")
		headers := http.Header{"Content-Type": []string{"image/png; charset=binary"}}
		switch req.URL.Path {
		case "/missing":
			status = http.StatusNotFound
		case "/redirect":
			status = http.StatusFound
		case "/large":
			body = bytes.Repeat([]byte{'x'}, maxAssetBytes+1)
		}
		return &http.Response{StatusCode: status, Header: headers, Body: io.NopCloser(bytes.NewReader(body))}, nil
	})
	const host = "images.example.test"

	data, contentType, err := downloadPublicAsset(
		context.Background(), "https://"+host+"/ok", host, client,
	)
	require.NoError(t, err)
	require.Equal(t, []byte("bytes"), data)
	require.Equal(t, "image/png", contentType)
	for _, path := range []string{"/missing", "/redirect", "/large"} {
		_, _, err := downloadPublicAsset(
			context.Background(), "https://"+host+path, host, client,
		)
		require.Error(t, err, path)
	}
}

func TestValidatePublicAssetURL(t *testing.T) {
	const host = "assets.example.com.com"
	cases := []struct {
		name    string
		url     string
		allowed string
		wantErr bool
	}{
		{"valid https same host", "https://assets.example.com.com/menu_items/x.png", host, false},
		{"foreign host", "https://evil.example.com/x.png", host, true},
		{"http scheme rejected", "http://assets.example.com.com/x.png", host, true},
		{"empty allowed host", "https://assets.example.com.com/x.png", "", true},
		{"garbage url", "://not a url", host, true},
		{"metadata ip", "https://169.254.169.254/latest/meta-data", host, true},
		// SSRF host-confusion negatives (§D): every one of these must be rejected by
		// the exact-equality host guard, NOT mistaken for the allowed bucket host.
		{"hyphen-confusion host", "https://assets.example.com/x.png", host, true},
		{"subdomain-injection suffix", "https://assets.example.com.com.evil.com/x.png", host, true},
		{"userinfo confusion", "https://assets.example.com.com@evil.com/x.png", host, true},
		{"case-variant host", "https://ASSETS.example.com.com/x.png", host, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidatePublicAssetURL(tc.url, tc.allowed)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestConfigurePublicHost(t *testing.T) {
	// Custom endpoint + virtual-host addressing (UsePathStyle is NOT set on the
	// client) => the SDK prefixes the bucket as a subdomain of the endpoint host.
	// This matches the real stored hosts (e.g. "images.j5f7.c18.e2-3.dev").
	configurePublicHost("mybucket", "us-east-1", "https://s3.example.com", "")
	require.Equal(t, "mybucket.s3.example.com", PublicHost())

	configurePublicHost("mybucket", "us-east-1", "", "")
	require.Equal(t, "mybucket.s3.us-east-1.amazonaws.com", PublicHost())

	// A configured public base URL (e.g. Cloudflare R2 served via a custom
	// domain) wins: the public host is that domain, not the write endpoint.
	configurePublicHost("namakdan-prod", "auto", "https://acct.r2.cloudflarestorage.com", "https://images.example.test")
	require.Equal(t, "images.example.test", PublicHost())
}

func TestBuildLocation(t *testing.T) {
	// With a base URL, the location is "<base>/<key>" (key maps 1:1 to the
	// custom-domain path); the SDK write URL is ignored.
	require.Equal(t,
		"https://images.example.test/businesses/12/logo.png",
		buildLocation("https://images.example.test", "businesses/12/logo.png",
			"https://bucket.account-id.r2.cloudflarestorage.com/businesses/12/logo.png"),
	)
	// A trailing slash on the base URL does not double up.
	require.Equal(t,
		"https://images.example.test/a/b.png",
		buildLocation("https://images.example.test/", "a/b.png", "fallback"),
	)
	// No base URL => the SDK write URL is returned unchanged (legacy behavior).
	require.Equal(t, "https://host/x.png", buildLocation("", "x.png", "https://host/x.png"))
}

func TestNoRedirectClientRefusesRedirects(t *testing.T) {
	c := newAssetHTTPClient()
	require.NotNil(t, c.CheckRedirect)
	// The policy must refuse to follow (ErrUseLastResponse) so a 30x surfaces
	// as a non-200 status and is rejected by DownloadPublicAsset.
	err := c.CheckRedirect(nil, nil)
	require.Equal(t, http.ErrUseLastResponse, err)
}
