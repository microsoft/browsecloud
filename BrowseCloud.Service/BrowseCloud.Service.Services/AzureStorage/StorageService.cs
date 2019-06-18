// <copyright file="StorageService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.AzureStorage
{
    using System.Diagnostics.Contracts;
    using System.Text;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Services.KeyVault;
    using Microsoft.Extensions.Options;
    using Microsoft.WindowsAzure.Storage;
    using Microsoft.WindowsAzure.Storage.Blob;

    /// <summary>
    /// What storage account to use
    /// </summary>
    public enum StorageAccount
    {
        /// <summary>
        /// Training Account (input)
        /// </summary>
        Training,

        /// <summary>
        /// Model Account (output)
        /// </summary>
        Model,
    }

    /// <summary>
    /// <inheritdoc />
    /// </summary>
    public class StorageService : IStorageService
    {
        private IKeyVaultService keyVaultService;
        private AzureStorageConfig config;
        private string trainingConnectionString;
        private string modelConnectionString;

        /// <summary>
        /// Initializes a new instance of the <see cref="StorageService"/> class.
        /// </summary>
        /// <param name="keyVaultService">Key Vault Service</param>
        /// <param name="config">Config</param>
        public StorageService(IKeyVaultService keyVaultService, IOptions<AzureStorageConfig> config)
        {
            Contract.Requires(config != null, nameof(config));
            Contract.Requires(keyVaultService != null, nameof(keyVaultService));

            this.config = config.Value;
            this.keyVaultService = keyVaultService;
        }

        /// <inheritdoc/>
        public async Task UploadTextFileToBlob(StorageAccount account, string documentText, string containerName, string blobName)
        {
            await this.TryInit();

            try
            {
                var client = this.GetClient(account);
                var container = client.GetContainerReference(containerName);
                await container.CreateIfNotExistsAsync();
                var blob = container.GetBlockBlobReference(blobName);
                await blob.UploadTextAsync(documentText, Encoding.ASCII, AccessCondition.GenerateEmptyCondition(), new BlobRequestOptions(), new OperationContext());
            }
            catch (StorageException ex)
            {
                throw new BrowseCloudServiceException($"Could not upload file {blobName} to {containerName}", ex);
            }
        }

        /// <inheritdoc/>
        public async Task<string> GetStringFromBlob(StorageAccount account, string containerName, string blobName)
        {
            await this.TryInit();

            try
            {
                var client = this.GetClient(account);
                var container = client.GetContainerReference(containerName);
                var blob = container.GetBlockBlobReference(blobName);
                return await blob.DownloadTextAsync();
            }
            catch (StorageException ex)
            {
                if (ex.RequestInformation.HttpStatusCode == 404)
                {
                    throw new BrowseCloudPageNotFoundException($"{blobName} not found in {containerName}", ex);
                }

                throw new BrowseCloudServiceException($"Unable to get text from {blobName} in {containerName}", ex);
            }
        }

        /// <inheritdoc/>
        public async Task DeleteContainer(StorageAccount account, string containerName)
        {
            await this.TryInit();

            try
            {
                var client = this.GetClient(account);
                var container = client.GetContainerReference(containerName);
                await container.DeleteIfExistsAsync();
            }
            catch (StorageException ex)
            {
                throw new BrowseCloudServiceException($"Unable to delete container {containerName}", ex);
            }
        }

        private async Task TryInit()
        {
            if (this.trainingConnectionString == null)
            {
                if (string.IsNullOrWhiteSpace(this.config.TrainingStorageKeyVaultKey))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"Storage:TrainingStorageKV must be in the Application Settings.");
                }

                this.trainingConnectionString = await this.keyVaultService.GetSecret(this.config.TrainingStorageKeyVaultKey);

                if (string.IsNullOrWhiteSpace(this.trainingConnectionString))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"KeyVault key '{this.config.TrainingStorageKeyVaultKey}' is not found in the KeyVault");
                }
            }

            if (this.modelConnectionString == null)
            {
                if (string.IsNullOrWhiteSpace(this.config.ModelStorageKeyVaultKey))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"Storage:ModelStorageKV must be in the Application Settings.");
                }

                this.modelConnectionString = await this.keyVaultService.GetSecret(this.config.ModelStorageKeyVaultKey);

                if (string.IsNullOrWhiteSpace(this.modelConnectionString))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"KeyVault key '{this.config.ModelStorageKeyVaultKey}' is not found in the KeyVault");
                }
            }
        }

        private CloudBlobClient GetClient(StorageAccount account)
        {
            var storageAccount = CloudStorageAccount.Parse(account == StorageAccount.Model ? this.modelConnectionString : this.trainingConnectionString);
            return storageAccount.CreateCloudBlobClient();
        }
    }
}
