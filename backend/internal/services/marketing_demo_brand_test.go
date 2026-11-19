package services

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPublicMarketingVenueName_OmitsDemoShowrooms(t *testing.T) {
	require.Equal(t, "", PublicMarketingVenueName("Namakdan AI Pro Demo Lounge", false))
	require.Equal(t, "", PublicMarketingVenueName("Neighborhood Bistro", true))
	require.Equal(t, "Neighborhood Bistro", PublicMarketingVenueName("Neighborhood Bistro", false))
}

func TestStripDemoMarketingBranding_RemovesNamakdanHashtagsAndVenue(t *testing.T) {
	got := StripDemoMarketingBranding(
		"Enjoy our Date Night for Two combo: steak, spritz, and tart for two. Perfect for local restaurant guests in New York. #NamakdanAIDemoLounge #DateNight",
	)
	require.NotContains(t, got, "Namakdan")
	require.NotContains(t, got, "#NamakdanAIDemoLounge")
	require.Contains(t, got, "#DateNight")
	require.Contains(t, got, "Date Night for Two")

	got = StripDemoMarketingBranding("Tonight at Namakdan AI Pro Demo Lounge. #Namakdan")
	require.NotContains(t, got, "Namakdan")
	require.NotContains(t, got, "#Namakdan")
	require.Contains(t, got, "Tonight")
}
