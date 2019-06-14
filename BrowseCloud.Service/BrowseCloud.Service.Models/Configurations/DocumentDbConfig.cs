// <copyright file="DocumentDbConfig.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Configurations
{
    using System;

    /// <summary>
    /// Document DB Config
    /// </summary>
    public class DocumentDbConfig
    {
        /// <summary>
        /// The Database URL
        /// </summary>
        public Uri Url { get; set; }

        /// <summary>
        /// The Database Name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// THe Key Vault Key for the Database Secret
        /// </summary>
        public string SecretKeyVaultKey { get; set; }
    }
}
