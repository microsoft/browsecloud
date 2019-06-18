// <copyright file="IdentityExtensions.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Utils
{
    using System.Security.Claims;
    using System.Security.Principal;

    /// <summary>
    /// Extends the IIdentity Interface
    /// </summary>
    public static class IdentityExtensions
    {
        /// <summary>
        /// Gets name from the principal claims.
        /// </summary>
        /// <param name="identity">Claims Principal Identity</param>
        /// <returns></returns>
        public static string GetName(this IIdentity identity)
        {
            return GetClaim(identity, ClaimTypes.Name);
        }

        /// <summary>
        /// Gets AAD scope from the principal claims.
        /// </summary>
        /// <param name="identity">Claims Principal Identity</param>
        /// <returns></returns>
        public static string GetAADScope(this IIdentity identity)
        {
            return GetClaim(identity, "http://schemas.microsoft.com/identity/claims/scope");
        }

        /// <summary>
        /// Gets object ID from the principal claims.
        /// User Id or App ID of accessor.
        /// </summary>
        /// <param name="identity">Claims Principal Identity</param>
        /// <returns></returns>
        public static string GetObjectId(this IIdentity identity)
        {
            return GetClaim(identity, "http://schemas.microsoft.com/identity/claims/objectidentifier");
        }

        /// <summary>
        /// Gets the App ID of the accessing app.
        /// </summary>
        /// <param name="identity">Claims Principal Identity</param>
        /// <returns></returns>
        public static string GetAppId(this IIdentity identity)
        {
            return GetClaim(identity, "appid");
        }

        private static string GetClaim(IIdentity identity, string claimName)
        {
            ClaimsIdentity claimsIdentity = identity as ClaimsIdentity;
            Claim claim = claimsIdentity?.FindFirst(claimName);

            return claim?.Value ?? string.Empty;
        }
    }
}