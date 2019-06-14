// <copyright file="IKeyVaultService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.KeyVault
{
    using System.Threading.Tasks;

    /// <summary>
    ///  Handles requests to get Azure KeyVault secrets.
    /// </summary>
    public interface IKeyVaultService
    {
        /// <summary>
        /// Gets a secret from the KeyVault
        /// </summary>
        /// <param name="secretName">Key of the secret to get</param>
        /// <returns>The value</returns>
        Task<string> GetSecret(string secretName);
    }
}
