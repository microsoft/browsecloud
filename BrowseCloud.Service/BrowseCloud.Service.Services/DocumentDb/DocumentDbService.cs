// <copyright file="DocumentDbService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.DocumentDb
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics.Contracts;
    using System.Linq;
    using System.Linq.Expressions;
    using System.Net;
    using System.Security;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Services.KeyVault;
    using Microsoft.Azure.Documents;
    using Microsoft.Azure.Documents.Client;
    using Microsoft.Azure.Documents.Linq;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// <inheritdoc />
    /// </summary>
    public class DocumentDbService : IDocumentDbService
    {
        private readonly FeedOptions defaultFeedOptions = new FeedOptions { MaxItemCount = -1, EnableCrossPartitionQuery = true };

        private IKeyVaultService keyVaultService;
        private DocumentDbConfig config;
        private SecureString primaryKey;
        private Uri endpointUri;
        private string dbName;

        /// <summary>
        /// Initializes a new instance of the <see cref="DocumentDbService"/> class.
        /// </summary>
        /// <param name="keyVaultService">Key Vault Service</param>
        /// <param name="config">Config</param>
        public DocumentDbService(IKeyVaultService keyVaultService, IOptions<DocumentDbConfig> config)
        {
            Contract.Requires(config != null, nameof(config));
            Contract.Requires(keyVaultService != null, nameof(keyVaultService));

            this.config = config.Value;
            this.keyVaultService = keyVaultService;
        }

        /// <inheritdoc/>
        public async Task<T> GetDocument<T>(string id, string partitionKey = null)
        {
            await this.TryInit();

            try
            {
                using (var client = new DocumentClient(this.endpointUri, this.primaryKey))
                {
                    Document document = await client.ReadDocumentAsync(UriFactory.CreateDocumentUri(this.dbName, typeof(T).Name, id), new RequestOptions { PartitionKey = new PartitionKey(partitionKey ?? id) });
                    return (T)(dynamic)document;
                }
            }
            catch (DocumentClientException ex)
            {
                if (ex.StatusCode == HttpStatusCode.NotFound)
                {
                    return default(T);
                }

                throw new BrowseCloudServiceException($"Could not get the {typeof(T).Name} with id {id} from the database", ex);
            }
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteDocument<T>(string id, string partitionKey = null)
        {
            await this.TryInit();

            try
            {
                using (var client = new DocumentClient(this.endpointUri, this.primaryKey))
                {
                    Document document = await client.DeleteDocumentAsync(UriFactory.CreateDocumentUri(this.dbName, typeof(T).Name, id), new RequestOptions { PartitionKey = new PartitionKey(partitionKey ?? id) });
                    return true;
                }
            }
            catch (DocumentClientException ex)
            {
                if (ex.StatusCode == HttpStatusCode.NotFound)
                {
                    return false;
                }

                throw new BrowseCloudServiceException($"Could not delete the {typeof(T).Name} with id {id} from the database", ex);
            }
        }

        /// <inheritdoc/>
        public async Task<IEnumerable<T>> GetDocuments<T>(Expression<Func<T, bool>> predicate)
        {
            await this.TryInit();

            try
            {
                using (var client = new DocumentClient(this.endpointUri, this.primaryKey))
                {
                    IDocumentQuery<T> query = client.CreateDocumentQuery<T>(
                        UriFactory.CreateDocumentCollectionUri(this.dbName, typeof(T).Name),
                        this.defaultFeedOptions)
                    .Where(predicate)
                    .AsDocumentQuery();

                    List<T> results = new List<T>();
                    while (query.HasMoreResults)
                    {
                        results.AddRange(await query.ExecuteNextAsync<T>());
                    }

                    return results;
                }
            }
            catch (DocumentClientException ex)
            {
                throw new BrowseCloudServiceException($"Could not get the collection of {typeof(T).Name} from the database", ex);
            }
        }

        /// <inheritdoc/>
        public async Task UpsertDocument<T>(T document)
        {
            await this.TryInit();

            try
            {
                using (var client = new DocumentClient(this.endpointUri, this.primaryKey))
                {
                    var documentCollectionUri = UriFactory.CreateDocumentCollectionUri(this.dbName, typeof(T).Name);
                    var resp = await client.UpsertDocumentAsync(documentCollectionUri, document);
                }
            }
            catch (DocumentClientException ex)
            {
                throw new BrowseCloudServiceException($"Could not upload or create the {typeof(T).Name} in the database", ex);
            }
        }

        private async Task TryInit()
        {
            if (this.primaryKey == null)
            {
                if (string.IsNullOrWhiteSpace(this.config.SecretKeyVaultKey))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"DocumentDb:SecretKV must be in the Application Settings.");
                }

                var primaryKey = await this.keyVaultService.GetSecret(this.config.SecretKeyVaultKey);

                if (string.IsNullOrWhiteSpace(primaryKey))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"KeyVault key '{this.config.SecretKeyVaultKey}' is not found in the KeyVault");
                }

                this.primaryKey = new NetworkCredential(string.Empty, primaryKey).SecurePassword;
            }

            if (this.endpointUri == null)
            {
                if (this.config.Url == null)
                {
                    throw new BrowseCloudAppSettingNotFoundException($"DocumentDb:Url must be in the Application Settings.");
                }

                this.endpointUri = this.config.Url;
            }

            if (string.IsNullOrWhiteSpace(this.dbName))
            {
                if (string.IsNullOrWhiteSpace(this.config.Name))
                {
                    throw new BrowseCloudAppSettingNotFoundException($"DocumentDb:Name must be in the Application Settings.");
                }

                this.dbName = this.config.Name;
            }
        }
    }
}
