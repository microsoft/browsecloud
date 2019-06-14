// <copyright file="AzureBatchConfig.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Configurations
{
    using System;

    /// <summary>
    /// Azure Batch Config
    /// </summary>
    public class AzureBatchConfig
    {
        /// <summary>
        /// The batch account name
        /// </summary>
        public string AccountName { get; set; }

        /// <summary>
        /// The account URL
        /// </summary>
        public Uri AccountUrl { get; set; }

        /// <summary>
        /// The pool to train in
        /// </summary>
        public string PoolId { get; set; }

        /// <summary>
        /// THe job to train in
        /// </summary>
        public string JobId { get; set; }

        /// <summary>
        /// The Key Vault key for the Account Key
        /// </summary>
        public string AccountKeyKeyVaultKey { get; set; }
    }
}
