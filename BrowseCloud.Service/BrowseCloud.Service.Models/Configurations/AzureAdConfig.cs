// <copyright file="AzureAdConfig.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Configurations
{
    using System;

    /// <summary>
    /// AAD Config
    /// </summary>
    public class AzureAdConfig
    {
        /// <summary>
        /// Instance
        /// </summary>
        public string Instance { get; set; }

        /// <summary>
        /// Domain
        /// </summary>
        public string Domain { get; set; }

        /// <summary>
        /// Tenant ID
        /// </summary>
        public string TenantId { get; set; }

        /// <summary>
        /// Client ID
        /// </summary>
        public string ClientId { get; set; }

        /// <summary>
        /// Key Vault Key for the App Secret
        /// </summary>
        public string AppSecretKeyVaultKey { get; set; }

        /// <summary>
        /// The URL for the Graph AAD resource
        /// </summary>
        public string GraphResourceId { get; set; }

        /// <summary>
        /// The base URL for the graph API
        /// </summary>
        public Uri GraphBaseUrl { get; set; }

        /// <summary>
        /// The AAD Authority
        /// </summary>
        public string Authority => this.Instance + this.TenantId;
    }
}
