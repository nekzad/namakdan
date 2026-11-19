package emails

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildSyntheticMessage(t *testing.T) {
	msg, err := BuildSyntheticMessage("Namakdan <noreply@example.test>", "monitor@example.test")
	require.NoError(t, err)
	assert.Equal(t, []string{"monitor@example.test"}, msg.To)
	assert.Equal(t, "namakdan_email_healthcheck", msg.Tag)
	assert.Equal(t, MessageTypeTransactional, msg.MessageType)
	assert.NotEmpty(t, msg.TextBody)
}

func TestBuildSyntheticMessageKeepsBareSenderResendCompatible(t *testing.T) {
	msg, err := BuildSyntheticMessage("noreply@example.test", "monitor@example.test")
	require.NoError(t, err)
	assert.Equal(t, "noreply@example.test", msg.From)
}

func TestBuildSyntheticMessageRejectsInvalidRecipient(t *testing.T) {
	_, err := BuildSyntheticMessage("noreply@example.test", "a@example.com,b@example.com")
	require.Error(t, err)
	_, err = BuildSyntheticMessage("noreply@example.test", "not-an-email")
	require.Error(t, err)
}
