// <copyright file="GraphService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.Graph
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Net.Http.Headers;
    using System.Security.Claims;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Services.KeyVault;
    using Microsoft.AspNetCore.Authentication;
    using Microsoft.AspNetCore.DataProtection;
    using Microsoft.AspNetCore.Http;
    using Microsoft.AspNetCore.Http.Extensions;
    using Microsoft.Extensions.Caching.Distributed;
    using Microsoft.Extensions.Options;
    using Microsoft.Graph;
    using Microsoft.Identity.Client;
    using Newtonsoft.Json;
    using Contract = System.Diagnostics.Contracts.Contract;

    /// <summary>
    /// <inheritdoc />
    /// </summary>
    public class GraphService : IGraphService
    {
        private IHttpContextAccessor httpContextAccessor;
        private AzureAdConfig config;
        private IKeyVaultService keyVaultService;
        private IDistributedCache cache;
        private IDataProtectionProvider dataProtectionProvider;

        /// <summary>
        /// Initializes a new instance of the <see cref="GraphService"/> class.
        /// </summary>
        /// <param name="httpContextAccessor">Http Context</param>
        /// <param name="keyVaultService">Key Vault Service</param>
        /// <param name="config">Config</param>
        /// <param name="cache">Cache</param>
        /// <param name="dataProtectionProvider">Data Protection Provider</param>
        public GraphService(IHttpContextAccessor httpContextAccessor, IKeyVaultService keyVaultService, IOptions<AzureAdConfig> config, IDistributedCache cache, IDataProtectionProvider dataProtectionProvider)
        {
            Contract.Requires(httpContextAccessor != null, nameof(httpContextAccessor));
            Contract.Requires(config != null, nameof(config));
            Contract.Requires(keyVaultService != null, nameof(keyVaultService));
            Contract.Requires(cache != null, nameof(cache));
            Contract.Requires(dataProtectionProvider != null, nameof(dataProtectionProvider));

            this.httpContextAccessor = httpContextAccessor;
            this.config = config.Value;
            this.keyVaultService = keyVaultService;
            this.cache = cache;
            this.dataProtectionProvider = dataProtectionProvider;
        }

        /// <inheritdoc/>
        public async Task<User> GetUser(string idOrPrincipalName)
        {
            try
            {
                var requiredScopes = new List<string> { "https://graph.microsoft.com/User.Read.All" };
                return await this.GetGraphClient(requiredScopes).Users[idOrPrincipalName].Request().GetAsync();
            }
            catch (Exception ex)
            {
                throw new BrowseCloudServiceException($"Could not get user information for {idOrPrincipalName} from graph.", ex);
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<string>> GetCurrentUserGroups()
        {
            var userId = this.GetUserObjectId();
            var cachedString = await this.cache.GetStringAsync($"GraphService:GetCurrentUserGroups:{userId}");

            if (cachedString != null)
            {
                return JsonConvert.DeserializeObject<IEnumerable<string>>(cachedString);
            }

            try
            {
                var requiredScopes = new List<string> { "https://graph.microsoft.com/Directory.Read.All" };
                var graphClient = this.GetGraphClient(requiredScopes);

                var groupIds = new List<string>();

                var page = await graphClient.Me.GetMemberGroups(false).Request().PostAsync();

                groupIds.AddRange(page.CurrentPage);
                while (page.NextPageRequest != null)
                {
                    page = await page.NextPageRequest.PostAsync();
                    groupIds.AddRange(page.CurrentPage);
                }

                var cacheOptions = new DistributedCacheEntryOptions()
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12),
                };
                await this.cache.SetStringAsync($"GraphService:GetCurrentUserGroups:{userId}", JsonConvert.SerializeObject(groupIds), cacheOptions);

                return groupIds;
            }
            catch (ServiceException ex)
            {
                throw new BrowseCloudServiceException($"Could not get user groups from graph: {ex.Error.Message}", ex);
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<string>> GetAllCurrentUserIdentities()
        {
            var objectId = this.GetUserObjectId();

            var idsToSearch = new List<string> { objectId };
            var groupIds = await this.GetCurrentUserGroups();
            idsToSearch.AddRange(groupIds);

            return idsToSearch;
        }

        /// <inheritdoc/>
        public async Task<DirectoryIdentity> GetDirectoryIdentity(string id)
        {
            try
            {
                var requiredScopes = new List<string> { "https://graph.microsoft.com/Directory.Read.All" };
                var graphClient = this.GetGraphClient(requiredScopes);

                var directoryObject = await graphClient.DirectoryObjects[id].Request().GetAsync();

                return this.ConvertDirectoryObjectToIdentity(directoryObject);
            }
            catch (ServiceException ex)
            {
                throw new BrowseCloudServiceException($"Could not get user and group information from graph. Id: {id}. {ex.Error.Message}", ex);
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<DirectoryIdentity>> GetDirectoryIdentities(IEnumerable<string> ids)
        {
            if (ids == null || ids.Count() == 0)
            {
                return new List<DirectoryIdentity>();
            }

            try
            {
                var requiredScopes = new List<string> { "https://graph.microsoft.com/Directory.Read.All" };
                var graphClient = this.GetGraphClient(requiredScopes);

                var directoryObjects = new List<DirectoryObject>();

                var page = await graphClient.DirectoryObjects.GetByIds(ids).Request().PostAsync();

                directoryObjects.AddRange(page.CurrentPage);
                while (page.NextPageRequest != null)
                {
                    page = await page.NextPageRequest.PostAsync();
                    directoryObjects.AddRange(page.CurrentPage);
                }

                return directoryObjects.Select((directoryObject) =>
                {
                    return this.ConvertDirectoryObjectToIdentity(directoryObject);
                }).Where((directoryObject) => directoryObject != null);
            }
            catch (ServiceException ex)
            {
                throw new BrowseCloudServiceException($"Could not get bulk user and group information from graph: {ex.Error.Message}", ex);
            }
        }

        private DirectoryIdentity ConvertDirectoryObjectToIdentity(DirectoryObject directoryObject)
        {
            if (directoryObject.GetType() == typeof(User))
            {
                var currentUser = (User)directoryObject;
                return new DirectoryIdentity
                {
                    Id = currentUser.Id,
                    DisplayName = currentUser.DisplayName,
                    PrincipalName = currentUser.UserPrincipalName,
                    Type = DirectoryIdentityType.User,
                };
            }
            else if (directoryObject.GetType() == typeof(Group))
            {
                var currentGroup = (Group)directoryObject;
                return new DirectoryIdentity
                {
                    Id = currentGroup.Id,
                    DisplayName = currentGroup.DisplayName,
                    PrincipalName = currentGroup.Mail,
                    Type = DirectoryIdentityType.Group,
                };
            }
            else
            {
                return null;
            }
        }

        private GraphServiceClient GetGraphClient(IEnumerable<string> scopes)
        {
            var auth = new DelegateAuthenticationProvider(
                async (requestMessage) =>
                {
                    var token = await this.GetUserAccessTokenAsync(scopes);
                    requestMessage.Headers.Authorization = new AuthenticationHeaderValue("bearer", token);
                });

            return new GraphServiceClient(this.config.GraphBaseUrl.ToString(), auth);
        }

        private async Task<string> GetUserAccessTokenAsync(IEnumerable<string> scopes)
        {
            var userId = this.GetUserObjectId();
            var appSecret = await this.keyVaultService.GetSecret(this.config.AppSecretKeyVaultKey);
            var credential = new ClientCredential(appSecret);

            var request = this.httpContextAccessor.HttpContext.Request;
            var currentUri = UriHelper.BuildAbsolute(request.Scheme, request.Host, request.PathBase);

            var tokenCache = new DistributedTokenCacheHelper(this.cache, this.dataProtectionProvider, userId).GetTokenCache();
            var application = new ConfidentialClientApplication(this.config.ClientId, this.config.Authority, currentUri, credential, tokenCache, null);

            AuthenticationResult result;
            try
            {
                IAccount account = await application.GetAccountAsync($"{userId}.{this.config.TenantId}");
                result = await application.AcquireTokenSilentAsync(scopes, account);
            }
            catch
            {
                var token = await this.httpContextAccessor.HttpContext.GetTokenAsync("access_token");
                var userAssertion = new UserAssertion(token, "urn:ietf:params:oauth:grant-type:jwt-bearer");
                result = await application.AcquireTokenOnBehalfOfAsync(scopes, userAssertion);
            }

            return result.AccessToken;
        }

        private string GetUserObjectId()
        {
            var claimsIdentity = this.httpContextAccessor.HttpContext.User.Identity as ClaimsIdentity;
            Claim claim = claimsIdentity?.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier");
            return claim?.Value ?? string.Empty;
        }
    }
}
