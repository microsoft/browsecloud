// <copyright file="KeyVaultService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.KeyVault
{
    using System.Diagnostics.Contracts;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Models.Exceptions;
    using Microsoft.Azure.KeyVault;
    using Microsoft.Azure.Services.AppAuthentication;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// <inheritdoc />
    /// </summary>
    public class KeyVaultService : IKeyVaultService
    {
        private string vaultName;
        private KeyVaultClient.AuthenticationCallback authenticationCallback;

        /// <summary>
        /// Initializes a new instance of the <see cref="KeyVaultService"/> class.
        /// </summary>
        /// <param name="config">Config</param>
        public KeyVaultService(IOptions<KeyVaultConfig> config)
        {
            Contract.Requires(config != null, nameof(config));

            this.vaultName = config.Value.Name;

            if (string.IsNullOrWhiteSpace(this.vaultName))
            {
                throw new BrowseCloudAppSettingNotFoundException($"KeyVault:Name must be in the Application Settings.");
            }

            var azureServiceTokenProvider = new AzureServiceTokenProvider();
            this.authenticationCallback = new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback);
        }

        /// <inheritdoc/>
        public async Task<string> GetSecret(string secretName)
        {
            using (var keyVaultClient = new KeyVaultClient(this.authenticationCallback))
            {
                string secretIdentifier = $"https://{this.vaultName}.vault.azure.net/secrets/{secretName}";
                var secretBundle = await keyVaultClient.GetSecretAsync(secretIdentifier);
                return secretBundle.Value;
            }
        }
    }
}
