// <copyright file="DistributedTokenCacheHelper.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.Graph
{
    using System;
    using Microsoft.AspNetCore.DataProtection;
    using Microsoft.Extensions.Caching.Distributed;
    using Microsoft.Identity.Client;

    /// <summary>
    /// Stolen from
    /// https://dzimchuk.net/adal-distributed-token-cache-in-asp-net-core/
    /// Except the data protection bit.
    /// </summary>
    internal class DistributedTokenCacheHelper
    {
        private readonly IDistributedCache cache;
        private readonly string userId;
        private readonly IDataProtector protector;

        private TokenCache tokenCache = new TokenCache();

        /// <summary>
        /// Initializes a new instance of the <see cref="DistributedTokenCacheHelper"/> class.
        /// </summary>
        /// <param name="cache">Cache</param>
        /// <param name="dataProtectionProvider">Data Protection Provider</param>
        /// <param name="userId">User Id</param>
        public DistributedTokenCacheHelper(IDistributedCache cache, IDataProtectionProvider dataProtectionProvider, string userId)
        {
            this.cache = cache;
            this.userId = userId;
            this.protector = dataProtectionProvider.CreateProtector(typeof(DistributedTokenCacheHelper).FullName);
        }

        private string CacheKey => $"TokenCache_{this.userId}";

        /// <summary>
        /// Get Token Cache
        /// </summary>
        /// <returns></returns>
        public TokenCache GetTokenCache()
        {
            this.tokenCache.SetBeforeAccess(this.OnBeforeAccess);
            this.tokenCache.SetAfterAccess(this.OnAfterAccess);

            return this.tokenCache;
        }

        /// <summary>
        /// Before Access
        /// </summary>
        /// <param name="args">Arguments</param>
        private void OnBeforeAccess(TokenCacheNotificationArgs args)
        {
            var userTokenCachePayload = this.cache.Get(this.CacheKey);
            if (userTokenCachePayload != null)
            {
                try
                {
                    this.tokenCache.Deserialize(this.protector.Unprotect(userTokenCachePayload));
                }
                catch
                {
                }
            }
        }

        private void OnAfterAccess(TokenCacheNotificationArgs args)
        {
            if (args.HasStateChanged)
            {
                // Lifetime of a refresh token.
                var cacheOptions = new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(14)
                };

                try
                {
                    this.cache.Set(this.CacheKey, this.protector.Protect(this.tokenCache.Serialize()), cacheOptions);
                }
                catch
                {
                }
            }
        }
    }
}
