// <copyright file="AzureStorageConfig.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Configurations
{
    /// <summary>
    /// Azure Storage Config
    /// </summary>
    public class AzureStorageConfig
    {
        /// <summary>
        /// Key Vault Key for the Model Storage Account Connection String
        /// </summary>
        public string ModelStorageKeyVaultKey { get; set; }

        /// <summary>
        /// Key Vault Key for the Training Storage Account Connection String
        /// </summary>
        public string TrainingStorageKeyVaultKey { get; set; }
    }
}
