import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const secretsManager = new SecretsManagerClient();

export async function retrieveApiKeys() {
  const secretName = "is120-project-3-api-keys";

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await secretsManager.send(command);
    return JSON.parse(data.SecretString);
  } catch (error) {
    console.error("Error retrieving credentials:", error);
    throw error;
  }
}
